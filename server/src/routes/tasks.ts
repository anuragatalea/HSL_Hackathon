import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { transitionTask } from '../services/taskStateMachine.js';
import { handleResidentUnavailable, triggerTaskRetry } from '../services/snoozeRetryService.js';
import { TaskStatus, ActorType } from '@prisma/client';
import { getRoverAdapter } from '../rover/roverManager.js';

export const tasksRouter = Router();

// GET all tasks (filterable by status)
tasksRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) {
      where.status = status as TaskStatus;
    }

    const tasks = await prisma.roverTask.findMany({
      where,
      include: {
        resident: true,
        rover: true,
        schedule: true,
        attempts: { orderBy: { attemptNumber: 'asc' } },
        auditLogs: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET task by ID
tasksRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const task = await prisma.roverTask.findUnique({
      where: { id },
      include: {
        resident: true,
        rover: true,
        schedule: true,
        attempts: { orderBy: { attemptNumber: 'asc' } },
        auditLogs: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST manually create a task (e.g. for instant demo triggers)
tasksRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { residentId, roomId, roverId, scheduleId, medications } = req.body;

    let taskMeds = medications;
    if (!taskMeds && scheduleId) {
      const sched = await prisma.roverSchedule.findUnique({ where: { id: scheduleId } });
      taskMeds = sched?.medications;
    }

    const task = await prisma.roverTask.create({
      data: {
        residentId,
        roomId,
        roverId,
        scheduleId: scheduleId ?? null,
        medications: taskMeds ?? undefined,
        status: TaskStatus.READY,
        scheduledAt: new Date()
      },
      include: { resident: true, rover: true, schedule: true }
    });

    broadcast('task:created', task);

    res.status(201).json({ success: true, data: task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST dispatch task (READY -> DISPATCHED)
tasksRouter.post('/:id/dispatch', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { staffId = 'Nurse Sarah Jenkins (RN-402)' } = req.body;

    const result = await transitionTask(
      prisma,
      id,
      TaskStatus.DISPATCHED,
      { actorType: ActorType.CAREGIVER, actorId: staffId },
      { metadata: { action: 'Dispatched from Caregiver Station' } }
    );

    const room = await prisma.room.findFirst({
      where: {
        OR: [
          { id: result.task.roomId },
          { number: result.task.roomId }
        ]
      }
    });

    broadcast('task:updated', result.task);
    broadcast('rover:command', {
      command: 'DISPATCH',
      taskId: result.task.id,
      targetRoom: room?.number || result.task.roomId,
      resident: {
        id: result.task.residentId,
        name: result.task.resident.name,
        roomNumber: result.task.resident.roomNumber,
        faceEmbeddings: result.task.resident.faceEmbeddings,
        isEnrolled: result.task.resident.isEnrolled
      },
      medications: result.task.medications
    });

    const targetCoords = {
      x: room?.waypointX ?? 16.0,
      y: room?.waypointY ?? 10.0
    };

    getRoverAdapter()
      .dispatchToRoom(result.task.id, room?.number ?? '102', targetCoords)
      .catch(console.error);

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST arrive at destination (EN_ROUTE -> ARRIVED -> AWAITING_CONFIRMATION)
tasksRouter.post('/:id/arrive', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Transition to ARRIVED
    await transitionTask(
      prisma,
      id,
      TaskStatus.ARRIVED,
      { actorType: ActorType.ROVER, actorId: 'Rover-01' }
    );

    // Transition immediately to AWAITING_CONFIRMATION
    const result = await transitionTask(
      prisma,
      id,
      TaskStatus.AWAITING_CONFIRMATION,
      { actorType: ActorType.SYSTEM, actorId: 'KioskScreen' }
    );

    broadcast('task:updated', result.task);
    broadcast('kiosk:arrived', { taskId: result.task.id });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST resident unavailable / snooze
tasksRouter.post('/:id/snooze', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { snoozeMinutes, reason = 'Resident resting / unavailable' } = req.body;

    const result = await handleResidentUnavailable(
      prisma,
      id,
      { actorType: ActorType.RESIDENT, actorId: 'Resident' },
      snoozeMinutes ? Number(snoozeMinutes) : undefined,
      reason
    );

    broadcast('task:updated', result.task);
    if (result.escalated) {
      broadcast('task:escalated', { taskId: result.task.id, reason });
    }

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST retry snoozed task
tasksRouter.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const task = await triggerTaskRetry(
      prisma,
      id,
      { actorType: ActorType.SYSTEM, actorId: 'RetryEngine' }
    );

    broadcast('task:updated', task);
    broadcast('rover:command', { command: 'DISPATCH', taskId: task.id, targetRoom: task.roomId });

    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST confirm delivery (AWAITING_CONFIRMATION -> COMPLETED)
tasksRouter.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { signature = 'Confirmed on Touch Screen', residentName } = req.body;

    const result = await transitionTask(
      prisma,
      id,
      TaskStatus.COMPLETED,
      { actorType: ActorType.RESIDENT, actorId: residentName ?? 'Mary Johnson' },
      { metadata: { signature, completedVia: 'On-Rover Kiosk' } }
    );

    broadcast('task:updated', result.task);
    broadcast('rover:command', { command: 'RETURN_TO_DOCK' });
    getRoverAdapter().returnToDock().catch(console.error);

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST manual resolution after escalation
tasksRouter.post('/:id/manual-complete', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { staffId = 'Nurse Sarah Jenkins (RN-402)', notes } = req.body;

    const result = await transitionTask(
      prisma,
      id,
      TaskStatus.COMPLETED,
      { actorType: ActorType.CAREGIVER, actorId: staffId },
      { metadata: { notes, manualResolution: true } }
    );

    broadcast('task:updated', result.task);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST cancel task
tasksRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason = 'Cancelled by Staff' } = req.body;

    const result = await transitionTask(
      prisma,
      id,
      TaskStatus.CANCELLED,
      { actorType: ActorType.CAREGIVER, actorId: 'Staff' },
      { failureReason: reason }
    );

    broadcast('task:updated', result.task);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
