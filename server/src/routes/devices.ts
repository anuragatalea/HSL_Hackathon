import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { RoverStatus, ActorType } from '@prisma/client';
import { logAuditEvent } from '../services/auditService.js';
import { getRoverAdapter, getRoverConnectionInfo } from '../rover/roverManager.js';

export const devicesRouter = Router();

// GET rover hardware connection status
devicesRouter.get('/connection/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: getRoverConnectionInfo()
  });
});

// GET all rover devices
devicesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const devices = await prisma.roverDevice.findMany({
      include: {
        tasks: {
          where: {
            status: {
              notIn: ['COMPLETED', 'CANCELLED']
            }
          },
          take: 1
        }
      }
    });

    res.json({ success: true, data: devices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET device by ID
devicesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const device = await prisma.roverDevice.findUnique({
      where: { id }
    });

    if (!device) {
      res.status(404).json({ success: false, error: 'Device not found' });
      return;
    }

    res.json({ success: true, data: device });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// In-memory camera configuration
let roverCameraConfig = {
  streamUrl: process.env.ROVER_CAMERA_URL || 'http://192.168.1.150:5000/video_feed',
  resolution: '1280x720',
  fps: 30,
  mode: process.env.ROVER_MODE || 'SIMULATION'
};

// GET camera stream info
devicesRouter.get('/:id/camera', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const device = await prisma.roverDevice.findUnique({ where: { id } });
    if (!device) {
      res.status(404).json({ success: false, error: 'Device not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        roverId: id,
        roverName: device.name,
        ...roverCameraConfig
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH camera stream config
devicesRouter.patch('/:id/camera', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { streamUrl, resolution, fps } = req.body;
    if (streamUrl !== undefined) roverCameraConfig.streamUrl = streamUrl;
    if (resolution !== undefined) roverCameraConfig.resolution = resolution;
    if (fps !== undefined) roverCameraConfig.fps = Number(fps);

    res.json({
      success: true,
      message: 'Camera stream configuration updated.',
      data: { roverId: id, ...roverCameraConfig }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update telemetry (battery, x, y, status)
devicesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { batteryLevel, currentX, currentY, status, currentRoom } = req.body;

    const data: any = { lastSeenAt: new Date() };
    if (batteryLevel !== undefined) data.batteryLevel = Number(batteryLevel);
    if (currentX !== undefined) data.currentX = Number(currentX);
    if (currentY !== undefined) data.currentY = Number(currentY);
    if (status !== undefined) data.status = status as RoverStatus;
    if (currentRoom !== undefined) data.currentRoom = currentRoom;

    const updated = await prisma.roverDevice.update({
      where: { id },
      data
    });

    broadcast('rover:telemetry', updated);

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Emergency Stop
devicesRouter.post('/:id/estop', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const updated = await prisma.roverDevice.update({
      where: { id },
      data: {
        status: RoverStatus.ESTOP,
        lastSeenAt: new Date()
      }
    });

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: 'Caregiver Station',
      event: 'ROVER_EMERGENCY_STOP_TRIGGERED',
      metadata: { roverId: id, name: updated.name }
    });

    broadcast('rover:estop', { roverId: id, status: 'ESTOP' });
    broadcast('rover:telemetry', updated);
    getRoverAdapter().emergencyStop().catch(console.error);

    res.json({ success: true, data: updated, message: 'Emergency stop activated.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Return to Dock
devicesRouter.post('/:id/return-to-dock', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const updated = await prisma.roverDevice.update({
      where: { id },
      data: {
        status: RoverStatus.RETURNING,
        lastSeenAt: new Date()
      }
    });

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: 'Caregiver Station',
      event: 'COMMAND_RETURN_TO_DOCK',
      metadata: { roverId: id, name: updated.name }
    });

    broadcast('rover:command', { command: 'RETURN_TO_DOCK', roverId: id });
    broadcast('rover:telemetry', updated);
    getRoverAdapter().returnToDock().catch(console.error);

    res.json({ success: true, data: updated, message: 'Rover instructed to return to dock.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
