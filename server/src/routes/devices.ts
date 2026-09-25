import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { RoverStatus, ActorType, TaskStatus } from '@prisma/client';
import { logAuditEvent } from '../services/auditService.js';
import { getRoverAdapter, getRoverConnectionInfo } from '../rover/roverManager.js';
import { transitionTask } from '../services/taskStateMachine.js';

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

const defaultRoverIp = process.env.ROVER_IP || '192.168.0.11';
const defaultRoverPort = process.env.ROVER_PORT || '5000';

let roverCameraConfig = {
  streamUrl: process.env.ROVER_CAMERA_URL || `/api/rover/devices/stream`,
  resolution: '1280x720',
  fps: 30,
  mode: process.env.ROVER_MODE || 'HARDWARE'
};

// Handler for proxying live MJPEG camera stream from Waveshare robot
const handleCameraStream = async (req: Request, res: Response) => {
  const roverIp = process.env.ROVER_IP || '192.168.0.11';
  const roverPort = process.env.ROVER_PORT || '5000';
  const roverPin = process.env.ROVER_PIN || '1122';

  try {
    // 1. Authenticate with PIN on robot
    const loginResp = await fetch(`http://${roverIp}:${roverPort}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `pin=${encodeURIComponent(roverPin)}`,
      redirect: 'manual'
    });

    const cookieHeader = loginResp.headers.get('set-cookie');
    const cookie = cookieHeader ? cookieHeader.split(';')[0] : '';

    // 2. Fetch the live MJPEG stream
    const streamResp = await fetch(`http://${roverIp}:${roverPort}/video_feed`, {
      headers: cookie ? { Cookie: cookie } : {}
    });

    if (!streamResp.ok || !streamResp.body) {
      res.status(502).send('Camera stream unreachable on robot');
      return;
    }

    res.setHeader('Content-Type', streamResp.headers.get('content-type') || 'multipart/x-mixed-replace; boundary=frame');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    const reader = streamResp.body.getReader();
    req.on('close', () => {
      reader.cancel().catch(() => {});
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: err.message });
    }
  }
};

// Proxy live MJPEG camera stream directly from Waveshare robot (handles PIN auth & CORS automatically)
devicesRouter.get('/stream', handleCameraStream);

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

// Proxy stream alias with ID
devicesRouter.get('/:id/camera/stream', handleCameraStream);

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
        ...roverCameraConfig,
        streamUrl: `/api/rover/devices/stream`
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

    let device = (id && id !== 'undefined')
      ? await prisma.roverDevice.findUnique({ where: { id } }).catch(() => null)
      : null;
    if (!device) device = await prisma.roverDevice.findFirst({ where: { name: 'Rover-01' } });
    if (!device) device = await prisma.roverDevice.findFirst();
    if (!device) {
      res.status(404).json({ success: false, error: 'Rover device not found' });
      return;
    }

    const updated = await prisma.roverDevice.update({
      where: { id: device.id },
      data: {
        status: RoverStatus.ESTOP,
        lastSeenAt: new Date()
      }
    });

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: 'Caregiver Station',
      event: 'ROVER_EMERGENCY_STOP_TRIGGERED',
      metadata: { roverId: device.id, name: updated.name }
    });

    broadcast('rover:estop', { roverId: device.id, status: 'ESTOP' });
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

    let device = (id && id !== 'undefined')
      ? await prisma.roverDevice.findUnique({ where: { id } }).catch(() => null)
      : null;
    if (!device) device = await prisma.roverDevice.findFirst({ where: { name: 'Rover-01' } });
    if (!device) device = await prisma.roverDevice.findFirst();
    if (!device) {
      res.status(404).json({ success: false, error: 'Rover device not found' });
      return;
    }

    const updated = await prisma.roverDevice.update({
      where: { id: device.id },
      data: {
        status: RoverStatus.RETURNING,
        lastSeenAt: new Date()
      }
    });

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: 'Caregiver Station',
      event: 'COMMAND_RETURN_TO_DOCK',
      metadata: { roverId: device.id, name: updated.name }
    });

    broadcast('rover:command', { command: 'RETURN_TO_DOCK', roverId: device.id });
    broadcast('rover:telemetry', updated);
    getRoverAdapter().returnToDock().catch(console.error);

    res.json({ success: true, data: updated, message: 'Rover instructed to return to dock.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Send Rover to Any Room
devicesRouter.post('/:id/send-to-room', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { roomNumber, destination } = req.body;
    const targetRoom = String(roomNumber || destination || '').trim();

    if (!targetRoom) {
      res.status(400).json({ success: false, error: 'Target room or location is required (e.g., 101, 102, STATION, MED_ROOM, DOCK).' });
      return;
    }

    let device = (id && id !== 'undefined')
      ? await prisma.roverDevice.findUnique({ where: { id } }).catch(() => null)
      : null;
    if (!device) device = await prisma.roverDevice.findFirst({ where: { name: 'Rover-01' } });
    if (!device) device = await prisma.roverDevice.findFirst();
    if (!device) {
      res.status(404).json({ success: false, error: 'Rover device not found' });
      return;
    }

    // Handle return to dock command
    if (['DOCK', 'CHARGING', 'CHARGING_STATION', 'BASE'].includes(targetRoom.toUpperCase())) {
      const updated = await prisma.roverDevice.update({
        where: { id: device.id },
        data: { status: RoverStatus.RETURNING, lastSeenAt: new Date() }
      });
      await logAuditEvent(prisma, {
        actorType: ActorType.CAREGIVER,
        actorId: 'Caregiver Station',
        event: 'COMMAND_RETURN_TO_DOCK',
        metadata: { roverId: device.id, name: updated.name }
      });
      broadcast('rover:command', { command: 'RETURN_TO_DOCK', roverId: device.id });
      broadcast('rover:telemetry', updated);
      getRoverAdapter().returnToDock().catch(console.error);

      res.json({ success: true, message: 'Rover returning to Charging Station.', data: updated });
      return;
    }

    // Room coordinate dictionary mapped to blueprint layout
    const roomCoordinates: Record<string, { x: number; y: number; roomNumber: string; displayName: string }> = {
      '101': { x: 4.0, y: 10.0, roomNumber: '101', displayName: 'Room 101 (Robert Davis)' },
      '102': { x: 16.0, y: 10.0, roomNumber: '102', displayName: 'Room 102 (Mary Johnson)' },
      'STATION': { x: 4.0, y: 4.0, roomNumber: 'STATION', displayName: 'Nurse Station' },
      'NURSE': { x: 4.0, y: 4.0, roomNumber: 'STATION', displayName: 'Nurse Station' },
      'NURSE_STATION': { x: 4.0, y: 4.0, roomNumber: 'STATION', displayName: 'Nurse Station' },
      'MED_ROOM': { x: 16.0, y: 4.0, roomNumber: 'MED_ROOM', displayName: 'Medical Store' },
      'MEDICAL': { x: 16.0, y: 4.0, roomNumber: 'MED_ROOM', displayName: 'Medical Store' },
      'MEDICAL_STORE': { x: 16.0, y: 4.0, roomNumber: 'MED_ROOM', displayName: 'Medical Store' },
      'STORE': { x: 16.0, y: 4.0, roomNumber: 'MED_ROOM', displayName: 'Medical Store' },
      '103': { x: 4.0, y: 4.0, roomNumber: '103', displayName: 'Room 103 (Eleanor Vance)' }
    };

    const normKey = targetRoom.toUpperCase().replace(/\s+/g, '_');
    const targetInfo = roomCoordinates[targetRoom] || roomCoordinates[normKey] || {
      x: 16.0,
      y: 10.0,
      roomNumber: targetRoom,
      displayName: `Room ${targetRoom}`
    };

    // Clean up any stale active task on this rover that was already delivered/arrived
    await prisma.roverTask.updateMany({
      where: {
        roverId: device.id,
        status: { in: [TaskStatus.ARRIVED, TaskStatus.AWAITING_CONFIRMATION] }
      },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date()
      }
    });

    // 1. Check if there's already an active ready/scheduled mission for this room
    let task = await prisma.roverTask.findFirst({
      where: {
        status: { in: [TaskStatus.READY, TaskStatus.SCHEDULED, TaskStatus.ASSIGNED] },
        OR: [
          { roomId: targetInfo.roomNumber },
          { resident: { roomNumber: targetInfo.roomNumber } }
        ]
      },
      include: { resident: true, rover: true, schedule: true }
    });

    if (task) {
      const result = await transitionTask(
        prisma,
        task.id,
        TaskStatus.DISPATCHED,
        { actorType: ActorType.CAREGIVER, actorId: 'Caregiver Station' },
        { metadata: { action: `Manual Dashboard Command: Send to ${targetInfo.displayName}` } }
      );
      broadcast('task:updated', result.task);
      getRoverAdapter().dispatchToRoom(task.id, targetInfo.roomNumber, { x: targetInfo.x, y: targetInfo.y }).catch(console.error);

      res.json({
        success: true,
        message: `Rover dispatched to ${targetInfo.displayName}!`,
        data: result.task
      });
      return;
    }

    // 2. Otherwise create an on-demand direct navigation task
    let resident = await prisma.resident.findFirst({
      where: { roomNumber: targetInfo.roomNumber }
    });
    if (!resident) {
      resident = await prisma.resident.findFirst();
    }

    const newTask = await prisma.roverTask.create({
      data: {
        residentId: resident!.id,
        roomId: targetInfo.roomNumber,
        roverId: device.id,
        status: TaskStatus.READY,
        scheduledAt: new Date(),
        medications: [
          {
            name: targetInfo.roomNumber === 'STATION'
              ? 'Nurse Desk Handover'
              : targetInfo.roomNumber === 'MED_ROOM'
              ? 'Medical Store Supplies'
              : 'Direct Care Dispatch',
            dose: '1 unit',
            instructions: 'Initiated via Dashboard Command Bar',
            compartment: 'A1'
          }
        ]
      },
      include: { resident: true, rover: true, schedule: true }
    });

    const result = await transitionTask(
      prisma,
      newTask.id,
      TaskStatus.DISPATCHED,
      { actorType: ActorType.CAREGIVER, actorId: 'Caregiver Station' },
      { metadata: { action: `Manual Dashboard Command: Send to ${targetInfo.displayName}` } }
    );

    broadcast('task:created', newTask);
    broadcast('task:updated', result.task);

    getRoverAdapter().dispatchToRoom(newTask.id, targetInfo.roomNumber, { x: targetInfo.x, y: targetInfo.y }).catch(console.error);

    res.json({
      success: true,
      message: `Rover instructed to navigate to ${targetInfo.displayName}!`,
      data: result.task
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Alias for goto-room
devicesRouter.post('/:id/goto-room', async (req: Request, res: Response) => {
  req.url = `/${req.params.id}/send-to-room`;
  devicesRouter.handle(req, res, () => {});
});

