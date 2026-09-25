import { IRoverAdapter, RoverTelemetry, Waypoint } from './roverAdapter.js';
import { prisma } from '../prisma.js';
import { broadcast, getIO } from '../socket.js';
import { RoverStatus, TaskStatus, ActorType } from '@prisma/client';
import { transitionTask } from '../services/taskStateMachine.js';

export class HardwareRoverAdapter implements IRoverAdapter {
  readonly mode = 'HARDWARE' as const;
  private roverId: string = '';
  private name: string = 'Waveshare UGV-Beast (Physical)';
  private status: RoverStatus = RoverStatus.IDLE;
  private batteryLevel: number = 100;
  private x: number = 10.0;
  private y: number = 2.0;
  private currentRoom: string | null = 'DOCK';
  private isPiConnected: boolean = false;
  private piSocketId: string | null = null;
  private piIp: string | null = null;
  private lastHeartbeat: Date | null = null;
  private activeTaskId: string | null = null;
  private targetRoomNumber: string | null = null;

  constructor() {
    this.initDatabaseRecord();
    this.setupSocketListeners();
  }

  private async initDatabaseRecord() {
    try {
      const rover = await prisma.roverDevice.findFirst({ where: { name: 'Rover-01' } });
      if (rover) {
        this.roverId = rover.id;
        this.status = rover.status;
        this.batteryLevel = rover.batteryLevel;
        this.x = rover.currentX;
        this.y = rover.currentY;
        this.currentRoom = rover.currentRoom;
      }
    } catch (e) {
      console.warn('HardwareRover: Initial fetch failed.');
    }
  }

  private setupSocketListeners() {
    try {
      const io = getIO();
      io.on('connection', (socket) => {
        // When Raspberry Pi connects and registers
        socket.on('rover:register', (data) => {
          this.isPiConnected = true;
          this.piSocketId = socket.id;
          const rawIp = (socket.handshake.headers['x-forwarded-for'] as string) || socket.handshake.address;
          this.piIp = rawIp.replace(/^.*:/, '') || '192.168.1.150';
          this.lastHeartbeat = new Date();

          console.log(`🤖 [Hardware Rover] Physical UGV-Beast registered from IP: ${this.piIp}!`);
          socket.emit('rover:registered', { status: 'OK', serverTime: new Date() });
          broadcast('rover:hardware_status', this.getConnectionStatus());
        });

        // Pi streams real battery, encoders, and status
        socket.on('rover:rpi_telemetry', async (data) => {
          this.lastHeartbeat = new Date();
          this.status = data.status || this.status;
          this.batteryLevel = data.batteryLevel !== undefined ? data.batteryLevel : this.batteryLevel;
          this.x = data.x !== undefined ? data.x : this.x;
          this.y = data.y !== undefined ? data.y : this.y;
          this.currentRoom = data.currentRoom !== undefined ? data.currentRoom : this.currentRoom;

          broadcast('rover:telemetry', await this.getTelemetry());

          // Handle task arrival when physical robot reaches destination
          if ((data.status === 'ARRIVED' || data.status === RoverStatus.ARRIVED) && this.activeTaskId) {
            const taskId = this.activeTaskId;
            const roomNumber = this.currentRoom || this.targetRoomNumber || '102';
            this.activeTaskId = null;

            broadcast('rover:arrived', { taskId, roomNumber });

            try {
              await transitionTask(
                prisma,
                taskId,
                TaskStatus.ARRIVED,
                { actorType: ActorType.ROVER, actorId: 'Rover-01' }
              );
              await transitionTask(
                prisma,
                taskId,
                TaskStatus.AWAITING_CONFIRMATION,
                { actorType: ActorType.SYSTEM, actorId: 'KioskScreen' }
              );
              broadcast('kiosk:greeting', { taskId, roomNumber });
              console.log(`🎯 [Hardware Rover] Task ${taskId} advanced to ARRIVED & AWAITING_CONFIRMATION at Room ${roomNumber}!`);
            } catch (err: any) {
              console.warn('Hardware rover auto arrival task transition notice:', err.message);
            }
          }

          // Sync to database
          if (this.roverId) {
            await prisma.roverDevice.update({
              where: { id: this.roverId },
              data: {
                status: this.status,
                batteryLevel: this.batteryLevel,
                currentX: this.x,
                currentY: this.y,
                currentRoom: this.currentRoom,
                lastSeenAt: new Date()
              }
            });
          }
        });

        // Detect Pi socket disconnect
        socket.on('disconnect', () => {
          if (socket.id === this.piSocketId) {
            this.isPiConnected = false;
            this.piSocketId = null;
            console.log('⚠️ [Hardware Rover] Physical UGV-Beast disconnected! Switching to offline status.');
            broadcast('rover:hardware_status', this.getConnectionStatus());
          }
        });
      });
    } catch (err) {
      console.warn('HardwareRover socket listener init deferred.');
    }
  }

  getConnectionStatus() {
    return {
      mode: 'HARDWARE' as const,
      isHardwareConnected: this.isPiConnected,
      hardwareIp: this.piIp,
      lastHeartbeat: this.lastHeartbeat ? this.lastHeartbeat.toISOString() : null,
      roverName: this.name,
      details: this.isPiConnected
        ? `Physical UGV-Beast connected from ${this.piIp}`
        : 'Awaiting Raspberry Pi connection (python3 rover_client.py)'
    };
  }

  async getTelemetry(): Promise<RoverTelemetry> {
    return {
      roverId: this.roverId,
      name: this.name,
      status: this.isPiConnected ? this.status : RoverStatus.OFFLINE,
      batteryLevel: this.batteryLevel,
      currentX: this.x,
      currentY: this.y,
      currentRoom: this.currentRoom,
      speed: this.status === RoverStatus.MOVING ? 0.35 : 0
    };
  }

  async emergencyStop(): Promise<void> {
    this.status = RoverStatus.ESTOP;
    broadcast('rover:pi_command', { command: 'ESTOP' });
    console.log('🛑 [Hardware Rover] Sent ESTOP command to UGV-Beast.');
  }

  async dispatchToRoom(taskId: string, targetRoomNumber: string, targetCoords: Waypoint): Promise<void> {
    this.status = RoverStatus.MOVING;
    this.currentRoom = 'CORRIDOR';
    this.activeTaskId = taskId;
    this.targetRoomNumber = targetRoomNumber;

    let residentData: any = {};
    let medicationsData: any[] = [];

    try {
      const task = await prisma.roverTask.findUnique({
        where: { id: taskId },
        include: {
          resident: true
        }
      });
      if (task && task.resident) {
        residentData = {
          id: task.resident.id,
          name: task.resident.name,
          roomNumber: task.resident.roomNumber,
          faceEmbeddings: task.resident.faceEmbeddings,
          isEnrolled: task.resident.isEnrolled
        };
        if (Array.isArray(task.medications)) {
          medicationsData = task.medications;
        }
      }
    } catch (e) {
      console.warn('HardwareRover: Could not load task resident metadata:', e);
    }

    broadcast('rover:pi_command', {
      command: 'NAVIGATE',
      taskId,
      targetRoom: targetRoomNumber,
      targetX: targetCoords.x,
      targetY: targetCoords.y,
      speed: 0.25, // Safe 0.25m/s demo speed
      resident: residentData,
      medications: medicationsData
    });

    console.log(`🤖 [Hardware Rover] Sent NAVIGATE command to UGV-Beast for Room ${targetRoomNumber} (Task ${taskId}).`);
  }

  async returnToDock(): Promise<void> {
    this.status = RoverStatus.RETURNING;
    this.activeTaskId = null;

    broadcast('rover:pi_command', {
      command: 'RETURN_TO_DOCK',
      targetX: 10.0,
      targetY: 2.0
    });

    console.log('🔋 [Hardware Rover] Sent RETURN_TO_DOCK command to UGV-Beast.');
  }
}
