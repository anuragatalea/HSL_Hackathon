import { PrismaClient, TaskStatus, RoverStatus, ActorType } from '@prisma/client';
import { logAuditEvent } from './auditService.js';
import { TransitionActor } from './taskStateMachine.js';

export interface SnoozeResult {
  task: any;
  attempt: any;
  escalated: boolean;
  snoozedUntil?: Date | null;
}

/**
 * Handles the resident unavailable exception flow.
 * Increments attempts, logs to RoverTaskAttempt, and either snoozes or escalates to staff attention.
 */
export async function handleResidentUnavailable(
  prisma: PrismaClient,
  taskId: string,
  actor: TransitionActor = { actorType: ActorType.RESIDENT, actorId: 'Resident' },
  overrideSnoozeMinutes?: number,
  reason: string = 'Resident not in room or unavailable'
): Promise<SnoozeResult> {
  return prisma.$transaction(async (tx) => {
    const task = await tx.roverTask.findUnique({
      where: { id: taskId },
      include: { schedule: true, resident: true, rover: true }
    });

    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    const maxAttempts = task.schedule?.maxAttempts ?? 3;
    const snoozeMinutes = overrideSnoozeMinutes ?? task.schedule?.snoozeDurationMin ?? 10;
    const nextAttemptCount = task.attemptCount + 1;
    const now = new Date();

    // 1. Record the failed/snoozed attempt in RoverTaskAttempt
    const attempt = await tx.roverTaskAttempt.create({
      data: {
        taskId: task.id,
        attemptNumber: nextAttemptCount,
        startedAt: task.startedAt ?? now,
        arrivedAt: task.arrivedAt ?? now,
        completedAt: now,
        result: nextAttemptCount >= maxAttempts ? 'ESCALATED' : 'SNOOZED',
        reason: reason,
        notes: `Attempt ${nextAttemptCount} of ${maxAttempts}`
      }
    });

    // 2. Check for escalation threshold
    if (nextAttemptCount >= maxAttempts) {
      // Escalate to staff
      const escalatedTask = await tx.roverTask.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.STAFF_ATTENTION_REQUIRED,
          attemptCount: nextAttemptCount,
          snoozedUntil: null,
          failureReason: `Exceeded maximum retry attempts (${nextAttemptCount}/${maxAttempts}). Nurse intervention required.`
        }
      });

      // Rover returns to safe state
      if (task.roverId) {
        await tx.roverDevice.update({
          where: { id: task.roverId },
          data: { status: RoverStatus.RETURNING, lastSeenAt: now }
        });
      }

      await logAuditEvent(tx, {
        taskId: task.id,
        actorType: ActorType.SYSTEM,
        actorId: 'SnoozeRetryEngine',
        event: 'TASK_ESCALATED_STAFF_ATTENTION',
        metadata: {
          attemptsMade: nextAttemptCount,
          maxAttempts,
          reason,
          resident: task.resident.name,
          room: task.resident.roomNumber
        }
      });

      return {
        task: escalatedTask,
        attempt,
        escalated: true
      };
    }

    // 3. Otherwise, set snooze timer
    const snoozedUntil = new Date(now.getTime() + snoozeMinutes * 60 * 1000);

    const snoozedTask = await tx.roverTask.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.SNOOZED,
        attemptCount: nextAttemptCount,
        snoozedUntil: snoozedUntil,
        failureReason: reason
      }
    });

    // Rover status updates to waiting
    if (task.roverId) {
      await tx.roverDevice.update({
        where: { id: task.roverId },
        data: { status: RoverStatus.WAITING, lastSeenAt: now }
      });
    }

    await logAuditEvent(tx, {
      taskId: task.id,
      actorType: actor.actorType,
      actorId: actor.actorId,
      event: 'RESIDENT_UNAVAILABLE_SNOOZED',
      metadata: {
        attemptNumber: nextAttemptCount,
        maxAttempts,
        snoozeDurationMin: snoozeMinutes,
        snoozedUntil: snoozedUntil.toISOString(),
        resident: task.resident.name,
        room: task.resident.roomNumber
      }
    });

    return {
      task: snoozedTask,
      attempt,
      escalated: false,
      snoozedUntil
    };
  });
}

/**
 * Triggers a retry for a snoozed task.
 */
export async function triggerTaskRetry(
  prisma: PrismaClient,
  taskId: string,
  actor: TransitionActor = { actorType: ActorType.SYSTEM, actorId: 'RetryScheduler' }
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.roverTask.findUnique({
      where: { id: taskId },
      include: { rover: true, resident: true }
    });

    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    if (task.status !== TaskStatus.SNOOZED && task.status !== TaskStatus.RETRY_PENDING) {
      throw new Error(`Cannot retry task in status '${task.status}'. Must be SNOOZED or RETRY_PENDING.`);
    }

    const now = new Date();

    const retriedTask = await tx.roverTask.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.DISPATCHED,
        snoozedUntil: null,
        startedAt: now,
        arrivedAt: null
      }
    });

    if (task.roverId) {
      await tx.roverDevice.update({
        where: { id: task.roverId },
        data: { status: RoverStatus.MOVING, lastSeenAt: now }
      });
    }

    await logAuditEvent(tx, {
      taskId: task.id,
      actorType: actor.actorType,
      actorId: actor.actorId,
      event: 'RETRY_DISPATCHED',
      metadata: {
        attemptCount: task.attemptCount,
        resident: task.resident.name,
        room: task.resident.roomNumber
      }
    });

    return retriedTask;
  });
}
