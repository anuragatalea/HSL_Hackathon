import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { logAuditEvent } from '../services/auditService.js';
import { ActorType } from '@prisma/client';

export const schedulesRouter = Router();

// GET all delivery schedules
schedulesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.roverSchedule.findMany({
      include: {
        resident: true,
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { scheduledTime: 'asc' }
    });

    // Also attach room metadata for convenience
    const rooms = await prisma.room.findMany();
    const roomMap = new Map(rooms.map(r => [r.id, r]));

    const enriched = schedules.map(s => ({
      ...s,
      room: roomMap.get(s.roomId) || null
    }));

    res.json({ success: true, data: enriched });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create delivery schedule
schedulesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      residentId,
      roomId,
      itemName,
      medications,
      scheduledTime,
      frequency = 'DAILY',
      assignedStaffId,
      roverId,
      maxAttempts = 3,
      snoozeDurationMin = 10
    } = req.body;

    if (!residentId || !roomId || !scheduledTime || !assignedStaffId || !roverId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: residentId, roomId, scheduledTime, assignedStaffId, roverId.'
      });
      return;
    }

    // Determine display name
    let effectiveItemName = itemName;
    if (!effectiveItemName && Array.isArray(medications) && medications.length > 0) {
      effectiveItemName = medications.map((m: any) => m.name).join(', ');
    } else if (!effectiveItemName) {
      effectiveItemName = 'Prescription Delivery';
    }

    const schedule = await prisma.roverSchedule.create({
      data: {
        residentId,
        roomId,
        itemName: effectiveItemName,
        medications: Array.isArray(medications) ? medications : undefined,
        scheduledTime,
        frequency,
        assignedStaffId,
        roverId,
        maxAttempts: Number(maxAttempts),
        snoozeDurationMin: Number(snoozeDurationMin),
        isActive: true
      },
      include: { resident: true }
    });

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: assignedStaffId,
      event: 'SCHEDULE_CREATED',
      metadata: {
        scheduleId: schedule.id,
        itemName: effectiveItemName,
        medicationCount: Array.isArray(medications) ? medications.length : 0,
        resident: schedule.resident.name,
        scheduledTime
      }
    });

    broadcast('schedule:created', schedule);

    res.status(201).json({ success: true, data: schedule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update schedule
schedulesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      itemName,
      medications,
      scheduledTime,
      frequency,
      maxAttempts,
      snoozeDurationMin,
      isActive,
      assignedStaffId
    } = req.body;

    const updateData: any = {};
    if (itemName !== undefined) updateData.itemName = itemName;
    if (medications !== undefined) updateData.medications = medications;
    if (scheduledTime !== undefined) updateData.scheduledTime = scheduledTime;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (maxAttempts !== undefined) updateData.maxAttempts = Number(maxAttempts);
    if (snoozeDurationMin !== undefined) updateData.snoozeDurationMin = Number(snoozeDurationMin);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (assignedStaffId !== undefined) updateData.assignedStaffId = assignedStaffId;

    const schedule = await prisma.roverSchedule.update({
      where: { id },
      data: updateData,
      include: { resident: true }
    });

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: assignedStaffId || 'Caregiver',
      event: 'SCHEDULE_UPDATED',
      metadata: {
        scheduleId: schedule.id,
        itemName: schedule.itemName,
        resident: schedule.resident.name,
        scheduledTime: schedule.scheduledTime,
        isActive: schedule.isActive
      }
    });

    broadcast('schedule:updated', schedule);

    res.json({ success: true, data: schedule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE schedule
schedulesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.roverSchedule.findUnique({
      where: { id },
      include: { resident: true }
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Schedule not found' });
      return;
    }

    await prisma.roverSchedule.delete({
      where: { id }
    });

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: 'Caregiver Station',
      event: 'SCHEDULE_DELETED',
      metadata: {
        scheduleId: id,
        itemName: existing.itemName,
        resident: existing.resident.name
      }
    });

    broadcast('schedule:deleted', { id });

    res.json({ success: true, message: 'Schedule deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST trigger schedule immediately (creates a READY task now)
schedulesRouter.post('/:id/trigger', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { staffId = 'Caregiver' } = req.body;

    const schedule = await prisma.roverSchedule.findUnique({
      where: { id },
      include: { resident: true }
    });

    if (!schedule) {
      res.status(404).json({ success: false, error: 'Schedule not found' });
      return;
    }

    const rover = await prisma.roverDevice.findFirst({ where: { name: 'Rover-01' } });

    const task = await prisma.roverTask.create({
      data: {
        scheduleId: schedule.id,
        residentId: schedule.residentId,
        roomId: schedule.roomId,
        roverId: rover?.id || schedule.roverId,
        medications: schedule.medications ?? undefined,
        status: 'READY',
        scheduledAt: new Date()
      },
      include: { resident: true, rover: true, schedule: true }
    });

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: staffId,
      event: 'SCHEDULE_MANUALLY_TRIGGERED',
      metadata: {
        scheduleId: schedule.id,
        taskId: task.id,
        itemName: schedule.itemName,
        resident: schedule.resident.name
      }
    });

    broadcast('task:created', task);

    res.status(201).json({
      success: true,
      message: `Task generated for ${schedule.resident.name} (${schedule.itemName}) and marked READY for dispatch.`,
      data: task
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
