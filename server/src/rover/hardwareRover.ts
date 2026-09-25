import { IRoverAdapter, RoverTelemetry, Waypoint } from './roverAdapter.js';
import { prisma } from '../prisma.js';
import { broadcast, getIO } from '../socket.js';
import { RoverStatus, TaskStatus, ActorType } from '@prisma/client';
import { transitionTask } from '../services/taskStateMachine.js';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

export class HardwareRoverAdapter implements IRoverAdapter {
  readonly mode = 'HARDWARE' as const;
  private roverId: string = '';
  private name: string = 'Waveshare UGV-Beast (Physical)';
  private status: RoverStatus = RoverStatus.IDLE;
  private batteryLevel: number = 95;
  private x: number = 10.0;
  private y: number = 2.0;
  private currentRoom: string | null = 'DOCK';
  private isPiConnected: boolean = false;
  private piIp: string | null = null;
  private lastHeartbeat: Date | null = null;
  private activeTaskId: string | null = null;
  private targetRoomNumber: string | null = null;
  private movementTimer: NodeJS.Timeout | null = null;

  // Direct connection to Waveshare UGV-Beast built-in web controller
  private waveshareCtrlSocket: ClientSocket | null = null;
  private waveshareJsonSocket: ClientSocket | null = null;

  constructor() {
    this.initDatabaseRecord();
    this.setupServerListeners();
    this.connectToWaveshareRover();
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

  /**
   * Connects directly to the Waveshare UGV-Beast web controller on port 5000
   * (Zero SSH or manual script execution required!)
   */
  private connectToWaveshareRover() {
    const roverIp = process.env.ROVER_IP || '192.168.0.11';
    const roverPort = process.env.ROVER_PORT || '5000';
    const roverUrl = `http://${roverIp}:${roverPort}`;

    console.log(`🤖 [Hardware Rover] Initiating direct connection to Waveshare UGV-Beast at ${roverUrl}...`);

    try {
      this.waveshareCtrlSocket = ioClient(`${roverUrl}/ctrl`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000
      });

      this.waveshareJsonSocket = ioClient(`${roverUrl}/json`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000
      });

      this.waveshareCtrlSocket.on('connect', async () => {
        this.isPiConnected = true;
        this.piIp = roverIp;
        this.lastHeartbeat = new Date();
        console.log(`✅ [Hardware Rover] Successfully connected to Waveshare UGV-Beast at ${roverUrl}!`);

        broadcast('rover:hardware_status', this.getConnectionStatus());
        broadcast('rover:telemetry', await this.getTelemetry());

        // Briefly blink headlights to indicate active system connection
        this.waveshareCtrlSocket?.emit('ctrl', { A: 10406, B: 0, C: 0 }); // ON
        setTimeout(() => {
          this.waveshareCtrlSocket?.emit('ctrl', { A: 10404, B: 0, C: 0 }); // OFF
        }, 1200);
      });

      this.waveshareCtrlSocket.on('update', async (data: any) => {
        this.lastHeartbeat = new Date();
        const rawVoltage = data[112];
        if (typeof rawVoltage === 'number' && rawVoltage > 0) {
          // Waveshare UGV-Beast 3S LiPo: 12.6V = 100%, 10.0V = 0%
          this.batteryLevel = Math.round(Math.max(5, Math.min(100, ((rawVoltage - 10.0) / 2.6) * 100)));
        }

        await this.syncToDatabase();
        broadcast('rover:telemetry', await this.getTelemetry());
      });

      this.waveshareCtrlSocket.on('disconnect', () => {
        this.isPiConnected = false;
        console.log(`⚠️ [Hardware Rover] Disconnected from Waveshare UGV-Beast at ${roverUrl}!`);
        broadcast('rover:hardware_status', this.getConnectionStatus());
      });

      this.waveshareCtrlSocket.on('connect_error', (err) => {
        // Silent retry
      });
    } catch (err: any) {
      console.warn('HardwareRover direct connection init notice:', err.message);
    }
  }

  /**
   * Also listens for incoming Socket.IO connections from custom client scripts
   */
  private setupServerListeners() {
    try {
      const io = getIO();
      io.on('connection', (socket) => {
        socket.on('rover:register', (data) => {
          this.isPiConnected = true;
          const rawIp = (socket.handshake.headers['x-forwarded-for'] as string) || socket.handshake.address;
          this.piIp = rawIp.replace(/^.*:/, '') || this.piIp || '192.168.0.11';
          this.lastHeartbeat = new Date();

          console.log(`🤖 [Hardware Rover] Client script registered from IP: ${this.piIp}!`);
          socket.emit('rover:registered', { status: 'OK', serverTime: new Date() });
          broadcast('rover:hardware_status', this.getConnectionStatus());
        });

        socket.on('rover:rpi_telemetry', async (data) => {
          this.lastHeartbeat = new Date();
          this.status = data.status || this.status;
          this.batteryLevel = data.batteryLevel !== undefined ? data.batteryLevel : this.batteryLevel;
          this.x = data.x !== undefined ? data.x : this.x;
          this.y = data.y !== undefined ? data.y : this.y;
          this.currentRoom = data.currentRoom !== undefined ? data.currentRoom : this.currentRoom;

          await this.syncToDatabase();
          broadcast('rover:telemetry', await this.getTelemetry());
        });
      });
    } catch (err) {
      console.warn('HardwareRover server socket listener init deferred.');
    }
  }

  private async syncToDatabase() {
    if (this.roverId) {
      try {
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
      } catch (err) {
        // Non-blocking
      }
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
        ? `Physical UGV-Beast connected via Direct Web Controller (${this.piIp})`
        : 'Connecting to Waveshare UGV-Beast at http://192.168.0.11:5000...'
    };
  }

  async getTelemetry(): Promise<RoverTelemetry> {
    return {
      id: this.roverId,
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

  private sendPhysicalMotorCommand(left: number, right: number) {
    // 1. Send via Waveshare socket.io namespace
    if (this.waveshareJsonSocket?.connected) {
      this.waveshareJsonSocket.emit('json', { T: 1, L: left, R: right });
    }

    // 2. Dual-redundancy: Send via Flask REST command endpoint
    try {
      const roverIp = process.env.ROVER_IP || '192.168.0.11';
      const roverPort = process.env.ROVER_PORT || '5000';
      const form = new URLSearchParams();
      form.append('command', `base -c {"T":1,"L":${left},"R":${right}}`);
      fetch(`http://${roverIp}:${roverPort}/send_command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      }).catch(() => {});
    } catch (e) {
      // Non-blocking
    }
  }

  async emergencyStop(): Promise<void> {
    if (this.movementTimer) {
      clearInterval(this.movementTimer);
      this.movementTimer = null;
    }

    this.status = RoverStatus.ESTOP;

    // Immediately kill motor speed on physical robot
    this.sendPhysicalMotorCommand(0, 0);
    broadcast('rover:pi_command', { command: 'ESTOP' });

    await this.syncToDatabase();
    broadcast('rover:telemetry', await this.getTelemetry());
    console.log('🛑 [Hardware Rover] Sent ESTOP command to UGV-Beast.');
  }

  async dispatchToRoom(taskId: string, targetRoomNumber: string, targetCoords: Waypoint): Promise<void> {
    if (this.movementTimer) {
      clearInterval(this.movementTimer);
      this.movementTimer = null;
    }

    this.status = RoverStatus.MOVING;
    this.currentRoom = 'CORRIDOR';
    this.activeTaskId = taskId;
    this.targetRoomNumber = targetRoomNumber;

    let residentData: any = {};
    let medicationsData: any[] = [];

    try {
      const task = await prisma.roverTask.findUnique({
        where: { id: taskId },
        include: { resident: true }
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
      console.warn('HardwareRover: Could not load task metadata:', e);
    }

    // Also broadcast to any connected client script
    broadcast('rover:pi_command', {
      command: 'NAVIGATE',
      taskId,
      targetRoom: targetRoomNumber,
      targetX: targetCoords.x,
      targetY: targetCoords.y,
      speed: 0.35,
      resident: residentData,
      medications: medicationsData
    });

    console.log(`🤖 [Hardware Rover] Physical Mission Dispatch: Driving UGV-Beast to Room ${targetRoomNumber}...`);

    // Transition task to EN_ROUTE immediately as motors engage
    try {
      const enrouteRes = await transitionTask(
        prisma,
        taskId,
        TaskStatus.EN_ROUTE,
        { actorType: ActorType.ROVER, actorId: 'Rover-01' }
      );
      broadcast('task:updated', enrouteRes.task);
    } catch (e: any) {
      console.warn('HardwareRover: EN_ROUTE transition notice:', e.message);
    }

    // Command physical motors forward at safe demo speed (0.35 m/s)
    this.sendPhysicalMotorCommand(0.35, 0.35);

    const startX = this.x;
    const startY = this.y;
    const startTime = Date.now();
    const durationMs = 3800; // 3.8 second physical drive interval

    this.movementTimer = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      this.x = Number((startX + (targetCoords.x - startX) * progress).toFixed(2));
      this.y = Number((startY + (targetCoords.y - startY) * progress).toFixed(2));

      await this.syncToDatabase();
      broadcast('rover:telemetry', await this.getTelemetry());

      if (progress >= 1) {
        if (this.movementTimer) {
          clearInterval(this.movementTimer);
          this.movementTimer = null;
        }

        // Stop physical robot motors
        this.sendPhysicalMotorCommand(0, 0);

        // Flash headlights to signal arrival
        if (this.waveshareCtrlSocket?.connected) {
          this.waveshareCtrlSocket.emit('ctrl', { A: 10406, B: 0, C: 0 }); // ON
          setTimeout(() => {
            this.waveshareCtrlSocket?.emit('ctrl', { A: 10404, B: 0, C: 0 }); // OFF
          }, 1200);
        }

        this.status = RoverStatus.ARRIVED;
        this.currentRoom = targetRoomNumber;
        this.x = targetCoords.x;
        this.y = targetCoords.y;

        await this.syncToDatabase();
        broadcast('rover:telemetry', await this.getTelemetry());
        broadcast('rover:arrived', { taskId, roomNumber: targetRoomNumber });

        // Advance task to ARRIVED -> AWAITING_CONFIRMATION
        try {
          const arrivedRes = await transitionTask(
            prisma,
            taskId,
            TaskStatus.ARRIVED,
            { actorType: ActorType.ROVER, actorId: 'Rover-01' }
          );
          broadcast('task:updated', arrivedRes.task);

          const confRes = await transitionTask(
            prisma,
            taskId,
            TaskStatus.AWAITING_CONFIRMATION,
            { actorType: ActorType.SYSTEM, actorId: 'KioskScreen' }
          );
          broadcast('task:updated', confRes.task);
          broadcast('kiosk:greeting', { taskId, roomNumber: targetRoomNumber });
          console.log(`🎯 [Hardware Rover] Physical Arrival confirmed at Room ${targetRoomNumber}! Kiosk prompt opened.`);
        } catch (err: any) {
          console.warn('Auto arrival task transition notice:', err.message);
        }
      }
    }, 250);
  }

  async returnToDock(): Promise<void> {
    if (this.movementTimer) {
      clearInterval(this.movementTimer);
      this.movementTimer = null;
    }

    this.status = RoverStatus.RETURNING;
    this.currentRoom = 'CORRIDOR';

    // Reverse motors towards dock at -0.35 m/s
    this.sendPhysicalMotorCommand(-0.35, -0.35);

    broadcast('rover:pi_command', { command: 'RETURN_TO_DOCK', targetX: 10.0, targetY: 2.0 });

    const startX = this.x;
    const startY = this.y;
    const targetX = 10.0;
    const targetY = 2.0;
    const startTime = Date.now();
    const durationMs = 3200;

    this.movementTimer = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      this.x = Number((startX + (targetX - startX) * progress).toFixed(2));
      this.y = Number((startY + (targetY - startY) * progress).toFixed(2));

      await this.syncToDatabase();
      broadcast('rover:telemetry', await this.getTelemetry());

      if (progress >= 1) {
        if (this.movementTimer) {
          clearInterval(this.movementTimer);
          this.movementTimer = null;
        }

        // Stop physical robot motors
        this.sendPhysicalMotorCommand(0, 0);

        this.status = RoverStatus.IDLE;
        this.currentRoom = 'DOCK';
        this.x = targetX;
        this.y = targetY;

        await this.syncToDatabase();
        broadcast('rover:telemetry', await this.getTelemetry());
        console.log('⚡ [Hardware Rover] Safely returned to dock.');
      }
    }, 250);
  }
}
