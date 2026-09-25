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

export type MedicationCategory =
  | 'CARDIOVASCULAR'
  | 'ANTIDIABETIC'
  | 'ANALGESIC_PAIN'
  | 'ANTIBIOTIC'
  | 'PSYCHIATRIC_NEUROLOGIC'
  | 'RESPIRATORY'
  | 'GASTROINTESTINAL'
  | 'SUPPLEMENT_VITAMIN';

export type DosageForm =
  | 'TABLET'
  | 'CAPSULE'
  | 'LIQUID_ORAL'
  | 'TRANSDERMAL_PATCH'
  | 'INJECTION'
  | 'INHALER';

export type AgeGroup =
  | 'PEDIATRIC_UNDER_18'
  | 'ADULT_18_64'
  | 'GERIATRIC_65_PLUS'
  | 'ALL_ADULTS';

export type FrequencyCode =
  | 'ONCE_DAILY_QD'
  | 'TWICE_DAILY_BID'
  | 'THREE_TIMES_TID'
  | 'FOUR_TIMES_QID'
  | 'EVERY_4_HOURS_Q4H'
  | 'AS_NEEDED_PRN';

export type StorageRequirement =
  | 'ROOM_TEMP'
  | 'REFRIGERATED_2_TO_8C';

export interface Medication {
  id: string;
  name: string;
  brandName?: string | null;
  ndcCode?: string | null;
  category: MedicationCategory;
  form: DosageForm;
  standardStrength: string;
  targetAgeGroup: AgeGroup;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  isBeersList: boolean;
  beersRiskNotes?: string | null;
  recommendedFrequency: FrequencyCode;
  maxTimesPerDay: number;
  minHoursBetweenDoses: number;
  maxDailyDoseMg?: number | null;
  instructions: string;
  requiresFood: boolean;
  storageTemp: StorageRequirement;
  isControlledSubstance: boolean;
  contraindications?: string | null;
  sideEffects?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

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
  roverId?: string;
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
  medicationId?: string | null;
  medication?: Medication | null;
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
  medicationId?: string | null;
  medication?: Medication | null;
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

