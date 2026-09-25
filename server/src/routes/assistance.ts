import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { ActorType } from '@prisma/client';
import { logAuditEvent } from '../services/auditService.js';
import { getRoverAdapter } from '../rover/roverManager.js';

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

// POST create an assistance request (called from Resident Tablet or Kiosk)
assistanceRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { residentId, roomId, requestType = 'IN_ROOM_ASSISTANCE', notes } = req.body;

    if (!residentId || !roomId) {
      res.status(400).json({ success: false, error: 'Missing residentId or roomId.' });
      return;
    }

    // 1. Safeguard: Anti-Duplicate Panic-Click Debounce
    const existingPending = await prisma.residentAssistance.findFirst({
      where: { residentId, status: 'PENDING' },
      include: { resident: true }
    });

    if (existingPending) {
      res.json({
        success: true,
        data: existingPending,
        alreadyActive: true,
        message: 'An assistance request is already active for your room. Caregivers have been notified!'
      });
      return;
    }

    // 2. Create the assistance record in PostgreSQL
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

    // 3. Log initial request audit event
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

    // 4. Dual-Layer Rover Availability Check (Database Task + Physical Movement)
    const activeDelivery = await prisma.roverTask.findFirst({
      where: {
        status: { in: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'AWAITING_CONFIRMATION'] }
      },
      include: { resident: true }
    });

    const roverAdapter = getRoverAdapter();
    const isPhysicalRoverMoving = roverAdapter.status !== 'IDLE' && roverAdapter.status !== 'CHARGING';
    const isRoverBusy = !!activeDelivery || isPhysicalRoverMoving;

    // BRANCH A: Rover is FREE -> Dispatched as Rapid First Responder
    if (!isRoverBusy) {
      // Lookup coordinates for target room
      const room = await prisma.room.findFirst({
        where: { OR: [{ number: roomId }, { id: roomId }] }
      });
      const targetCoords = {
        x: room?.waypointX ?? 16.0,
        y: room?.waypointY ?? 10.0
      };

      // Instruct Rover Adapter & Edge Pi to navigate to room
      roverAdapter.dispatchToRoom(assistance.id, room?.number || roomId, targetCoords).catch(console.error);

      broadcast('rover:command', {
        command: 'NAVIGATE',
        type: 'ASSISTANCE',
        assistanceId: assistance.id,
        targetRoom: room?.number || roomId,
        targetX: targetCoords.x,
        targetY: targetCoords.y,
        speed: 0.3,
        resident: {
          id: assistance.resident.id,
          name: assistance.resident.name,
          roomNumber: assistance.resident.roomNumber
        }
      });

      // Immutable audit log
      await logAuditEvent(prisma, {
        actorType: ActorType.ROVER,
        actorId: 'Rover-01 (UGV-Beast)',
        event: 'ROVER_DISPATCHED_FOR_ASSISTANCE',
        metadata: {
          room: roomId,
          residentName: assistance.resident.name,
          targetCoords,
          assistanceId: assistance.id
        }
      });

      const alertPayload = {
        ...assistance,
        roverDispatched: true,
        roverStatus: 'EN_ROUTE_TO_ASSIST',
        priority: 'NORMAL',
        message: `Rover-01 autonomously dispatched to Room ${roomId} for ${assistance.resident.name}.`
      };

      broadcast('assistance:alert', alertPayload);

      res.status(201).json({
        success: true,
        data: assistance,
        roverDispatched: true,
        message: `Rover-01 is on its way to Room ${roomId} to assist you!`
      });
      return;
    }

    // BRANCH B: Rover is BUSY -> Protect delivery & Escalate urgently to Staff
    const busyReason = activeDelivery
      ? `Rover is currently delivering to Room ${activeDelivery.resident.roomNumber} (${activeDelivery.resident.name})`
      : 'Rover is currently in motion';

    await logAuditEvent(prisma, {
      actorType: ActorType.SYSTEM,
      actorId: 'AssistanceDispatcher',
      event: 'ROVER_BUSY_ESCALATED_TO_STAFF',
      metadata: {
        room: roomId,
        residentName: assistance.resident.name,
        activeDeliveryTaskId: activeDelivery?.id,
        busyReason,
        assistanceId: assistance.id
      }
    });

    const alertPayload = {
      ...assistance,
      roverDispatched: false,
      roverStatus: 'BUSY',
      priority: 'HIGH',
      busyReason,
      message: `🚨 URGENT: Room ${roomId} requested assistance! Rover is busy. Nurse physical response required!`
    };

    // Broadcast urgent high-priority siren alert to Caregiver Station
    broadcast('assistance:alert', alertPayload);
    broadcast('caregiver:urgent_call', alertPayload);

    res.status(201).json({
      success: true,
      data: assistance,
      roverDispatched: false,
      busyReason,
      message: `Rover is assisting another resident. Nurse has been alerted immediately to Room ${roomId}!`
    });
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

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: staffId,
      event: 'CAREGIVER_ACKNOWLEDGED_ASSISTANCE',
      metadata: {
        assistanceId: id,
        residentName: updated.resident.name,
        room: updated.roomId
      }
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

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: 'Caregiver Station',
      event: 'ASSISTANCE_RESOLVED',
      metadata: {
        assistanceId: id,
        residentName: updated.resident.name,
        room: updated.roomId,
        notes
      }
    });

    // If rover was dispatched to assist, instruct it to safely return to dock
    const adapter = getRoverAdapter();
    if (adapter.status === 'ARRIVED') {
      adapter.returnToDock().catch(console.error);
    }

    broadcast('assistance:updated', updated);

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
