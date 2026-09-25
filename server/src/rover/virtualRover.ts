import { IRoverAdapter, RoverTelemetry, Waypoint } from './roverAdapter.js';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { RoverStatus, TaskStatus, ActorType } from '@prisma/client';
import { transitionTask } from '../services/taskStateMachine.js';

export class VirtualRoverAdapter implements IRoverAdapter {
  readonly mode = 'SIMULATION' as const;
  private roverId: string = '';
  private name: string = 'Rover-01 (Virtual)';
  private x: number = 10.0;
  private y: number = 2.0; // Dock coordinates
  private status: RoverStatus = RoverStatus.IDLE;
  private batteryLevel: number = 100;
  private currentRoom: string | null = 'DOCK';
  private movementTimer: NodeJS.Timeout | null = null;
  private activeTaskId: string | null = null;

  constructor() {
    this.initDatabaseRecord();
  }

  private async initDatabaseRecord() {
    try {
      const rover = await prisma.roverDevice.findFirst({ where: { name: 'Rover-01' } });
      if (rover) {
        this.roverId = rover.id;
        this.x = rover.currentX;
        this.y = rover.currentY;
        this.status = rover.status;
        this.batteryLevel = rover.batteryLevel;
        this.currentRoom = rover.currentRoom;
      }
    } catch (e) {
      console.warn('VirtualRover: Initial fetch failed, using default coordinates.');
    }
  }

  async getTelemetry(): Promise<RoverTelemetry> {
    return {
      id: this.roverId,
      roverId: this.roverId,
      name: this.name,
      status: this.status,
      batteryLevel: this.batteryLevel,
      currentX: this.x,
      currentY: this.y,
      currentRoom: this.currentRoom,
      speed: this.status === RoverStatus.MOVING || this.status === RoverStatus.RETURNING ? 0.35 : 0
    };
  }

  async emergencyStop(): Promise<void> {
    if (this.movementTimer) {
      clearInterval(this.movementTimer);
      this.movementTimer = null;
    }
    this.status = RoverStatus.ESTOP;
    await this.syncToDatabase();
    broadcast('rover:telemetry', await this.getTelemetry());
    console.log('🛑 [Virtual Rover] EMERGENCY STOP ACTIVATED!');
  }

  async dispatchToRoom(taskId: string, targetRoomNumber: string, targetCoords: Waypoint): Promise<void> {
    if (this.movementTimer) clearInterval(this.movementTimer);

    this.activeTaskId = taskId;
    this.status = RoverStatus.MOVING;
    this.currentRoom = 'CORRIDOR';

    // Battery drops 1% per mission
    this.batteryLevel = Math.max(10, this.batteryLevel - 1);

    await this.syncToDatabase();
    broadcast('rover:telemetry', await this.getTelemetry());

    console.log(`🤖 [Virtual Rover] Dispatching to Room ${targetRoomNumber} at (${targetCoords.x}, ${targetCoords.y})`);

    // Movement interpolation towards target coordinates
    this.movementTimer = setInterval(async () => {
      const dx = targetCoords.x - this.x;
      const dy = targetCoords.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 0.5) {
        // Arrived at room!
        clearInterval(this.movementTimer!);
        this.movementTimer = null;
        this.x = targetCoords.x;
        this.y = targetCoords.y;
        this.status = RoverStatus.ARRIVED;
        this.currentRoom = targetRoomNumber;

        await this.syncToDatabase();
        broadcast('rover:telemetry', await this.getTelemetry());
        broadcast('rover:arrived', { taskId, roomNumber: targetRoomNumber });

        console.log(`🎯 [Virtual Rover] Arrived at Room ${targetRoomNumber}!`);

        // Automatically advance task to ARRIVED -> AWAITING_CONFIRMATION
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
          broadcast('kiosk:greeting', { taskId, roomNumber: targetRoomNumber });
        } catch (err: any) {
          console.warn('Auto arrival task transition notice:', err.message);
        }
      } else {
        // Move 0.35 meters closer
        const step = 0.5;
        this.x += (dx / distance) * step;
        this.y += (dy / distance) * step;

        await this.syncToDatabase();
        broadcast('rover:telemetry', await this.getTelemetry());
      }
    }, 400); // Update every 400ms for smooth live rendering
  }

  async returnToDock(): Promise<void> {
    if (this.movementTimer) clearInterval(this.movementTimer);

    const DOCK_X = 10.0;
    const DOCK_Y = 2.0;

    this.status = RoverStatus.RETURNING;
    this.currentRoom = 'CORRIDOR';

    await this.syncToDatabase();
    broadcast('rover:telemetry', await this.getTelemetry());

    console.log('🔋 [Virtual Rover] Returning to Dock...');

    this.movementTimer = setInterval(async () => {
      const dx = DOCK_X - this.x;
      const dy = DOCK_Y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 0.5) {
        // Arrived at Dock!
        clearInterval(this.movementTimer!);
        this.movementTimer = null;
        this.x = DOCK_X;
        this.y = DOCK_Y;
        this.status = RoverStatus.IDLE;
        this.currentRoom = 'DOCK';

        await this.syncToDatabase();
        broadcast('rover:telemetry', await this.getTelemetry());
        broadcast('rover:docked', { status: 'CHARGING' });

        console.log('⚡ [Virtual Rover] Safely docked and charging.');
      } else {
        const step = 0.5;
        this.x += (dx / distance) * step;
        this.y += (dy / distance) * step;

        await this.syncToDatabase();
        broadcast('rover:telemetry', await this.getTelemetry());
      }
    }, 400);
  }

  private async syncToDatabase() {
    if (!this.roverId) return;
    try {
      await prisma.roverDevice.update({
        where: { id: this.roverId },
        data: {
          currentX: Number(this.x.toFixed(2)),
          currentY: Number(this.y.toFixed(2)),
          status: this.status,
          batteryLevel: this.batteryLevel,
          currentRoom: this.currentRoom,
          lastSeenAt: new Date()
        }
      });
    } catch (e) {
      // Ignore transient sync errs
    }
  }
}
