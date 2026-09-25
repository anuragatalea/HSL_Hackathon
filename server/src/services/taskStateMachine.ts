import { PrismaClient, TaskStatus, RoverStatus, ActorType } from '@prisma/client';
import { logAuditEvent } from './auditService.js';

export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.SCHEDULED]: [TaskStatus.READY, TaskStatus.CANCELLED],
  [TaskStatus.READY]: [TaskStatus.ASSIGNED, TaskStatus.DISPATCHED, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]: [TaskStatus.DISPATCHED, TaskStatus.CANCELLED],
  [TaskStatus.DISPATCHED]: [TaskStatus.EN_ROUTE, TaskStatus.ARRIVED, TaskStatus.FAILED, TaskStatus.CANCELLED],
  [TaskStatus.EN_ROUTE]: [TaskStatus.ARRIVED, TaskStatus.FAILED, TaskStatus.CANCELLED],
  [TaskStatus.ARRIVED]: [TaskStatus.AWAITING_CONFIRMATION, TaskStatus.SNOOZED, TaskStatus.COMPLETED],
  [TaskStatus.AWAITING_CONFIRMATION]: [TaskStatus.COMPLETED, TaskStatus.SNOOZED, TaskStatus.CANCELLED],
  [TaskStatus.SNOOZED]: [TaskStatus.RETRY_PENDING, TaskStatus.CANCELLED],
  [TaskStatus.RETRY_PENDING]: [TaskStatus.DISPATCHED, TaskStatus.STAFF_ATTENTION_REQUIRED, TaskStatus.CANCELLED],
  [TaskStatus.STAFF_ATTENTION_REQUIRED]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.CANCELLED]: [],
  [TaskStatus.FAILED]: [TaskStatus.READY, TaskStatus.CANCELLED]
};

export interface TransitionActor {
  actorType: ActorType;
  actorId: string;
}

export interface TransitionOptions {
  metadata?: Record<string, any>;
  failureReason?: string;
  notes?: string;
}

/**
 * Validates and executes a task state transition inside a PostgreSQL transaction.
 * Automatically synchronizes rover status and writes an immutable audit log.
 */
export async function transitionTask(
  prisma: PrismaClient,
  taskId: string,
  targetStatus: TaskStatus,
  actor: TransitionActor,
  options: TransitionOptions = {}
) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch current task
    const task = await tx.roverTask.findUnique({
      where: { id: taskId },
      include: { rover: true, resident: true }
    });

    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    const currentStatus = task.status;

    // 2. Validate transition guard
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new Error(
        `Invalid task state transition: Cannot move from '${currentStatus}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`
      );
    }

    // 3. Prepare timestamp updates
    const now = new Date();
    const updateData: any = {
      status: targetStatus,
      updatedAt: now
    };

    if (targetStatus === TaskStatus.DISPATCHED && !task.startedAt) {
      updateData.startedAt = now;
    } else if (targetStatus === TaskStatus.ARRIVED) {
      updateData.arrivedAt = now;
    } else if (targetStatus === TaskStatus.COMPLETED) {
      updateData.completedAt = now;
    }

    if (options.failureReason) {
      updateData.failureReason = options.failureReason;
    }

    // 4. Update Task record
    const updatedTask = await tx.roverTask.update({
      where: { id: taskId },
      data: updateData,
      include: { resident: true, rover: true, schedule: true }
    });

    // 5. Synchronize RoverDevice status
    let newRoverStatus: RoverStatus | null = null;
    if (targetStatus === TaskStatus.DISPATCHED || targetStatus === TaskStatus.EN_ROUTE) {
      newRoverStatus = RoverStatus.MOVING;
    } else if (targetStatus === TaskStatus.ARRIVED || targetStatus === TaskStatus.AWAITING_CONFIRMATION) {
      newRoverStatus = RoverStatus.ARRIVED;
    } else if (targetStatus === TaskStatus.COMPLETED) {
      newRoverStatus = RoverStatus.RETURNING;
    } else if (targetStatus === TaskStatus.SNOOZED) {
      newRoverStatus = RoverStatus.WAITING;
    }

    if (newRoverStatus && task.roverId) {
      await tx.roverDevice.update({
        where: { id: task.roverId },
        data: {
          status: newRoverStatus,
          lastSeenAt: now
        }
      });
    }

    // 6. Write immutable audit log
    const auditLog = await logAuditEvent(tx, {
      taskId: task.id,
      actorType: actor.actorType,
      actorId: actor.actorId,
      event: `STATUS_${targetStatus}`,
      metadata: {
        from: currentStatus,
        to: targetStatus,
        resident: task.resident.name,
        room: task.resident.roomNumber,
        ...options.metadata
      }
    });

    return {
      task: updatedTask,
      auditLog,
      previousStatus: currentStatus,
      newStatus: targetStatus
    };
  });
}
