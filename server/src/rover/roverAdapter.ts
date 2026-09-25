import { RoverStatus } from '@prisma/client';

export interface Waypoint {
  x: number;
  y: number;
  label?: string;
}

export interface RoverTelemetry {
  id: string;
  roverId: string;
  name: string;
  status: RoverStatus;
  batteryLevel: number;
  currentX: number;
  currentY: number;
  currentRoom?: string | null;
  speed: number;
}

export interface IRoverAdapter {
  readonly mode: 'SIMULATION' | 'HARDWARE';
  status?: RoverStatus;
  dispatchToRoom(taskId: string, targetRoomNumber: string, targetCoords: Waypoint): Promise<void>;
  returnToDock(): Promise<void>;
  emergencyStop(): Promise<void>;
  getTelemetry(): Promise<RoverTelemetry>;
}
