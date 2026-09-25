import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { logAuditEvent } from '../services/auditService.js';
import { ActorType } from '@prisma/client';

export const healthLogsRouter = Router();

// GET all health logs with optional filtering by residentId
healthLogsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { residentId, limit } = req.query;

    const where: any = {};
    if (residentId && typeof residentId === 'string') {
      where.residentId = residentId;
    }

    const take = limit ? parseInt(limit as string, 10) : 50;

    const logs = await prisma.healthLog.findMany({
      where,
      include: {
        resident: {
          select: {
            id: true,
            name: true,
            roomNumber: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: isNaN(take) ? 50 : take
    });

    res.json({ success: true, data: logs });
  } catch (err: any) {
    console.error('Error fetching health logs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single health log
healthLogsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const log = await prisma.healthLog.findUnique({
      where: { id },
      include: { resident: true }
    });

    if (!log) {
      res.status(404).json({ success: false, error: 'Health log not found' });
      return;
    }

    res.json({ success: true, data: log });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record new vital/health log
healthLogsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      residentId,
      systolic,
      diastolic,
      heartRate,
      bloodSugar,
      temperature,
      oxygenLevel,
      notes,
      loggedBy,
      timestamp
    } = req.body;

    if (!residentId) {
      res.status(400).json({
        success: false,
        error: 'residentId is required.'
      });
      return;
    }

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

    const newLog = await prisma.healthLog.create({
      data: {
        residentId,
        systolic: systolic !== undefined && systolic !== null ? Number(systolic) : null,
        diastolic: diastolic !== undefined && diastolic !== null ? Number(diastolic) : null,
        heartRate: heartRate !== undefined && heartRate !== null ? Number(heartRate) : null,
        bloodSugar: bloodSugar !== undefined && bloodSugar !== null ? Number(bloodSugar) : null,
        temperature: temperature !== undefined && temperature !== null ? Number(temperature) : null,
        oxygenLevel: oxygenLevel !== undefined && oxygenLevel !== null ? Number(oxygenLevel) : null,
        notes: notes || null,
        loggedBy: loggedBy || 'Staff',
        timestamp: timestamp ? new Date(timestamp) : new Date()
      },
      include: {
        resident: {
          select: {
            id: true,
            name: true,
            roomNumber: true
          }
        }
      }
    });

    // Real-time broadcast
    broadcast('health:created', { healthLog: newLog });

    // Check for critical vitals and log alert if needed
    const isCritical = (newLog.systolic && newLog.systolic >= 160) ||
      (newLog.oxygenLevel && newLog.oxygenLevel < 92) ||
      (newLog.heartRate && (newLog.heartRate > 120 || newLog.heartRate < 50));

    if (isCritical) {
      broadcast('vital:alert', {
        residentId,
        residentName: resident.name,
        roomNumber: resident.roomNumber,
        vital: newLog
      });
    }

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: loggedBy || 'Staff',
      event: 'HEALTH_VITALS_RECORDED',
      metadata: {
        healthLogId: newLog.id,
        residentName: resident.name,
        roomNumber: resident.roomNumber,
        vitals: {
          bp: newLog.systolic && newLog.diastolic ? `${newLog.systolic}/${newLog.diastolic}` : null,
          heartRate: newLog.heartRate,
          oxygenLevel: newLog.oxygenLevel,
          bloodSugar: newLog.bloodSugar,
          temperature: newLog.temperature
        }
      }
    });

    res.status(201).json({ success: true, data: newLog });
  } catch (err: any) {
    console.error('Error creating health log:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE health log
healthLogsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.healthLog.delete({
      where: { id }
    });

    broadcast('health:deleted', { id });
    res.json({ success: true, message: 'Health log deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
