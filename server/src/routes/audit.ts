import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { ActorType } from '@prisma/client';

export const auditRouter = Router();

// GET all audit logs (with filters)
auditRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { taskId, actorType, limit = 50 } = req.query;

    const where: any = {};
    if (taskId) where.taskId = taskId as string;
    if (actorType) where.actorType = actorType as ActorType;

    const logs = await prisma.roverAuditLog.findMany({
      where,
      include: {
        task: {
          include: {
            resident: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
