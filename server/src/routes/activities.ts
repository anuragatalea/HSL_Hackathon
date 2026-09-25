import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { logAuditEvent } from '../services/auditService.js';
import { ActorType } from '@prisma/client';

export const activitiesRouter = Router();

// GET all activities with optional filtering by residentId or type
activitiesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { residentId, type, limit } = req.query;

    const where: any = {};
    if (residentId && typeof residentId === 'string') {
      where.residentId = residentId;
    }
    if (type && typeof type === 'string') {
      where.type = type;
    }

    const take = limit ? parseInt(limit as string, 10) : 50;

    const activities = await prisma.activity.findMany({
      where,
      include: {
        resident: {
          select: {
            id: true,
            name: true,
            roomNumber: true,
            photoUrl: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: isNaN(take) ? 50 : take
    });

    res.json({ success: true, data: activities });
  } catch (err: any) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single activity
activitiesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        resident: true
      }
    });

    if (!activity) {
      res.status(404).json({ success: false, error: 'Activity not found' });
      return;
    }

    res.json({ success: true, data: activity });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create new activity
activitiesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { residentId, type, title, notes, loggedBy, timestamp } = req.body;

    if (!residentId || !type || !title) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: residentId, type, and title are required.'
      });
      return;
    }

    // Verify resident exists
    const resident = await prisma.resident.findUnique({
      where: { id: residentId }
    });

    if (!resident) {
      res.status(404).json({
        success: false,
        error: `Resident with ID "${residentId}" not found.`
      });
      return;
    }

    const newActivity = await prisma.activity.create({
      data: {
        residentId,
        type,
        title,
        notes: notes || null,
        loggedBy: loggedBy || 'Staff',
        timestamp: timestamp ? new Date(timestamp) : new Date()
      },
      include: {
        resident: {
          select: {
            id: true,
            name: true,
            roomNumber: true,
            photoUrl: true
          }
        }
      }
    });

    // Real-time broadcast to connected panel clients
    broadcast('activity:created', { activity: newActivity });

    // Audit log
    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: loggedBy || 'Staff',
      event: 'ACTIVITY_LOGGED',
      metadata: {
        activityId: newActivity.id,
        residentName: resident.name,
        roomNumber: resident.roomNumber,
        type,
        title
      }
    });

    res.status(201).json({ success: true, data: newActivity });
  } catch (err: any) {
    console.error('Error creating activity:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE activity
activitiesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.activity.delete({
      where: { id }
    });

    broadcast('activity:deleted', { id });
    res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
