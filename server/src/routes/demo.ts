import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { TaskStatus, RoverStatus, ActorType } from '@prisma/client';
import { transitionTask } from '../services/taskStateMachine.js';
import { triggerTaskRetry } from '../services/snoozeRetryService.js';
import { getRoverAdapter } from '../rover/roverManager.js';

export const demoRouter = Router();

// POST 1-Click Demo Reset (resets Mary Johnson, Room 102, and Rover-01)
demoRouter.post('/reset', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Executing 1-Click Demo Database Reset...');

    // 1. Clear tasks and logs
    await prisma.roverAuditLog.deleteMany();
    await prisma.roverTaskAttempt.deleteMany();
    await prisma.residentAssistance.deleteMany();
    await prisma.roverTask.deleteMany();

    // 2. Reset Rover-01 to Dock
    const rover = await prisma.roverDevice.findFirst({ where: { name: 'Rover-01' } });
    if (rover) {
      await prisma.roverDevice.update({
        where: { id: rover.id },
        data: {
          status: RoverStatus.IDLE,
          batteryLevel: 100,
          currentRoom: 'DOCK',
          currentX: 10.0,
          currentY: 2.0,
          lastSeenAt: new Date()
        }
      });
    }

    // 3. Find Mary Johnson & Schedule
    const mary = await prisma.resident.findFirst({ where: { roomNumber: '102' } });
    const room102 = await prisma.room.findFirst({ where: { number: '102' } });
    const schedule = await prisma.roverSchedule.findFirst({ where: { residentId: mary?.id } });

    if (mary && room102 && rover && schedule) {
      // Create initial READY task
      const task = await prisma.roverTask.create({
        data: {
          scheduleId: schedule.id,
          residentId: mary.id,
          roomId: room102.id,
          roverId: rover.id,
          status: TaskStatus.READY,
          scheduledAt: new Date(),
          attemptCount: 0
        },
        include: { resident: true, rover: true, schedule: true }
      });

      await prisma.roverAuditLog.create({
        data: {
          taskId: task.id,
          actorType: ActorType.SYSTEM,
          actorId: 'DemoResetDaemon',
          event: 'DEMO_STATE_INITIALIZED',
          metadata: {
            message: 'Hero Scenario initialized for Mary Johnson (Room 102)',
            status: 'READY'
          }
        }
      });

      broadcast('demo:reset', { message: 'Demo reset successfully' });
      broadcast('task:created', task);
      broadcast('rover:telemetry', {
        roverId: rover.id,
        name: rover.name,
        status: RoverStatus.IDLE,
        batteryLevel: 100,
        currentX: 10.0,
        currentY: 2.0,
        currentRoom: 'DOCK',
        speed: 0
      });

      res.json({ success: true, message: 'Demo reset completed successfully.', task });
    } else {
      res.json({ success: true, message: 'Cleaned records. Please run full seed if entities are missing.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Fast-Forward Snooze: Immediately wakes up any snoozed task and dispatches retry
demoRouter.post('/fast-forward-snooze', async (req: Request, res: Response) => {
  try {
    const snoozedTask = await prisma.roverTask.findFirst({
      where: {
        status: { in: [TaskStatus.SNOOZED, TaskStatus.RETRY_PENDING] }
      },
      orderBy: { updatedAt: 'desc' },
      include: { resident: true, rover: true, schedule: true }
    });

    if (!snoozedTask) {
      res.status(404).json({ success: false, error: 'No task is currently in SNOOZED state to fast-forward.' });
      return;
    }

    const retriedTask = await triggerTaskRetry(prisma, snoozedTask.id, {
      actorType: ActorType.CAREGIVER,
      actorId: 'Presenter (Fast-Forward)'
    });

    broadcast('task:updated', retriedTask);

    // Dispatch rover navigation
    const room = await prisma.room.findFirst({
      where: {
        OR: [
          { id: snoozedTask.roomId },
          { number: snoozedTask.roomId }
        ]
      }
    });

    const targetCoords = {
      x: room?.waypointX ?? 16.0,
      y: room?.waypointY ?? 10.0
    };

    getRoverAdapter()
      .dispatchToRoom(snoozedTask.id, room?.number ?? '102', targetCoords)
      .catch(console.error);

    res.json({
      success: true,
      message: `Task retry triggered immediately for ${snoozedTask.resident.name} (Attempt ${snoozedTask.attemptCount}).`,
      task: retriedTask
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Simulate Emergency Assistance Call
demoRouter.post('/simulate-assistance', async (req: Request, res: Response) => {
  try {
    const mary = await prisma.resident.findFirst({ where: { roomNumber: '102' } });
    const room102 = await prisma.room.findFirst({ where: { number: '102' } });

    if (!mary || !room102) {
      res.status(404).json({ success: false, error: 'Resident or Room 102 not found' });
      return;
    }

    const alert = await prisma.residentAssistance.create({
      data: {
        residentId: mary.id,
        roomId: room102.id,
        status: 'PENDING',
        requestType: 'NURSE_CALL',
        notes: 'Simulated alert: Resident Mary Johnson requested immediate staff presence.'
      },
      include: { resident: true }
    });

    broadcast('assistance:alert', alert);

    res.json({
      success: true,
      message: 'Simulated assistance alert triggered for Mary Johnson (Room 102).',
      alert
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

