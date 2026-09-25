import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { ActorType } from '@prisma/client';
import { logAuditEvent } from '../services/auditService.js';

export const assistanceRouter = Router();

// GET all assistance requests
assistanceRouter.get('/', async (req: Request, res: Response) => {
  try {
    const requests = await prisma.residentAssistance.findMany({
      include: { resident: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create an assistance request (called from On-Rover Kiosk)
assistanceRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { residentId, roomId, requestType = 'GENERAL_ASSISTANCE', notes } = req.body;

    if (!residentId || !roomId) {
      res.status(400).json({ success: false, error: 'Missing residentId or roomId.' });
      return;
    }

    const assistance = await prisma.residentAssistance.create({
      data: {
        residentId,
        roomId,
        requestType,
        status: 'PENDING',
        notes
      },
      include: { resident: true }
    });

    await logAuditEvent(prisma, {
      actorType: ActorType.RESIDENT,
      actorId: assistance.resident.name,
      event: 'RESIDENT_ASSISTANCE_REQUESTED',
      metadata: {
        room: roomId,
        requestType,
        assistanceId: assistance.id
      }
    });

    // Broadcast urgent alert to Caregiver Station
    broadcast('assistance:alert', assistance);

    res.status(201).json({ success: true, data: assistance });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH acknowledge assistance request
assistanceRouter.patch('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { staffId = 'Nurse Sarah Jenkins (RN-402)' } = req.body;

    const updated = await prisma.residentAssistance.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date()
      },
      include: { resident: true }
    });

    broadcast('assistance:updated', updated);

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH resolve assistance request
assistanceRouter.patch('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body;

    const updated = await prisma.residentAssistance.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        notes
      },
      include: { resident: true }
    });

    broadcast('assistance:updated', updated);

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
