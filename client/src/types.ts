export type TaskStatus =
  | 'SCHEDULED'
  | 'READY'
  | 'ASSIGNED'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'AWAITING_CONFIRMATION'
  | 'SNOOZED'
  | 'RETRY_PENDING'
  | 'COMPLETED'
  | 'STAFF_ATTENTION_REQUIRED'
  | 'CANCELLED'
  | 'FAILED';

export type RoverStatus =
  | 'IDLE'
  | 'MOVING'
  | 'ARRIVED'
  | 'WAITING'
  | 'RETURNING'
  | 'CHARGING'
  | 'OFFLINE'
  | 'ESTOP';

export interface MedicationItem {
  name: string;
  dose: string;
  instructions?: string;
  compartment?: number;
}

export interface Resident {
  id: string;
  name: string;
  roomNumber: string;
  notes?: string | null;
  photoUrl?: string | null;
  faceEmbeddings?: number[] | null;
  isEnrolled?: boolean;
  enrolledAt?: string | null;
  schedules?: RoverSchedule[];
  tasks?: RoverTask[];
}

export interface Room {
  id: string;
  number: string;
  name: string;
  waypointX: number;
  waypointY: number;
  zone: string;
}

export interface RoverDevice {
  id: string;
  name: string;
  status: RoverStatus;
  batteryLevel: number;
  currentRoom?: string | null;
  currentX: number;
  currentY: number;
  lastSeenAt: string;
  isActive: boolean;
}

export interface RoverSchedule {
  id: string;
  residentId: string;
  resident: Resident;
  roomId: string;
  room?: Room | null;
  itemName: string;
  medications?: MedicationItem[] | null;
  scheduledTime: string;
  frequency: string;
  assignedStaffId: string;
  roverId: string;
  maxAttempts: number;
  snoozeDurationMin: number;
  isActive: boolean;
  tasks?: RoverTask[];
}

export interface RoverTaskAttempt {
  id: string;
  taskId: string;
  attemptNumber: number;
  startedAt: string;
  arrivedAt?: string | null;
  completedAt?: string | null;
  result: string;
  reason?: string | null;
  notes?: string | null;
}

export interface RoverAuditLog {
  id: string;
  taskId?: string | null;
  actorType: 'SYSTEM' | 'CAREGIVER' | 'RESIDENT' | 'ROVER';
  actorId: string;
  event: string;
  metadata?: any;
  createdAt: string;
  task?: {
    resident?: Resident;
  };
}

export interface RoverTask {
  id: string;
  scheduleId?: string | null;
  schedule?: RoverSchedule | null;
  residentId: string;
  resident: Resident;
  roomId: string;
  roverId: string;
  rover: RoverDevice;
  medications?: MedicationItem[] | null;
  status: TaskStatus;
  scheduledAt: string;
  startedAt?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  attemptCount: number;
  snoozedUntil?: string | null;
  failureReason?: string | null;
  attempts?: RoverTaskAttempt[];
  auditLogs?: RoverAuditLog[];
}

export interface ResidentAssistance {
  id: string;
  residentId: string;
  resident: Resident;
  roomId: string;
  requestType: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  roverDispatched?: boolean;
  roverStatus?: string;
  busyReason?: string;
  priority?: 'NORMAL' | 'HIGH';
  message?: string;
}

export type UserRole = 'ADMIN' | 'NURSE' | 'CAREGIVER' | 'STAFF';
export type AuthSessionType = 'STAFF' | 'RESIDENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  badgeId?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Activity {
  id: string;
  residentId: string;
  resident?: Pick<Resident, 'id' | 'name' | 'roomNumber' | 'photoUrl'>;
  type: 'MEAL' | 'EXERCISE' | 'MEDICATION' | 'SOCIAL' | 'VISION_DETECTION' | 'CHECK_IN' | string;
  title: string;
  notes?: string | null;
  loggedBy: string;
  timestamp: string;
  createdAt?: string;
}

export interface HealthLog {
  id: string;
  residentId: string;
  resident?: Pick<Resident, 'id' | 'name' | 'roomNumber'>;
  systolic?: number | null;
  diastolic?: number | null;
  heartRate?: number | null;
  bloodSugar?: number | null;
  temperature?: number | null;
  oxygenLevel?: number | null;
  notes?: string | null;
  loggedBy: string;
  timestamp: string;
  createdAt?: string;
}

