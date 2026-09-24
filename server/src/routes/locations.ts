import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';

export const locationsRouter = Router();

// GET all rooms
locationsRouter.get('/rooms', async (req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { number: 'asc' }
    });
    res.json({ success: true, data: rooms });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all residents
locationsRouter.get('/residents', async (req: Request, res: Response) => {
  try {
    const residents = await prisma.resident.findMany({
      include: {
        schedules: true,
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: residents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
