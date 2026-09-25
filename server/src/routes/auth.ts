import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { generateToken, comparePassword } from '../services/authService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { logAuditEvent } from '../services/auditService.js';
import { ActorType, UserRole } from '@prisma/client';

export const authRouter = Router();

// GET list of available staff users for 1-click role switcher / demo accounts
authRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        badgeId: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { role: 'asc' }
    });

    res.json({ success: true, data: users });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST standard login with email & password
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials or inactive account.'
      });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
      return;
    }

    const token = generateToken(user);

    // Audit log login event
    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: user.name,
      event: 'USER_LOGIN',
      metadata: {
        userId: user.id,
        email: user.email,
        role: user.role,
        badgeId: user.badgeId
      }
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        badgeId: user.badgeId,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST 1-Click quick login for hackathon judge presentation & rapid role switching
authRouter.post('/quick-login', async (req: Request, res: Response) => {
  try {
    const { role, email, id } = req.body;

    let user;
    if (id) {
      user = await prisma.user.findUnique({ where: { id } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    } else if (role) {
      user = await prisma.user.findFirst({
        where: { role: role as UserRole, isActive: true },
        orderBy: { createdAt: 'asc' }
      });
    } else {
      // Default to first user (Admin or Nurse)
      user = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      });
    }

    if (!user) {
      res.status(404).json({
        success: false,
        error: `No staff user found for the requested criteria.`
      });
      return;
    }

    const token = generateToken(user);

    await logAuditEvent(prisma, {
      actorType: ActorType.CAREGIVER,
      actorId: user.name,
      event: 'QUICK_ROLE_SWITCH',
      metadata: {
        userId: user.id,
        role: user.role,
        badgeId: user.badgeId
      }
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        badgeId: user.badgeId,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err: any) {
    console.error('Quick-login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /me current authenticated session
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        badgeId: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /resident-login for Resident In-Room Portal
authRouter.post('/resident-login', async (req: Request, res: Response) => {
  try {
    const { residentId, roomNumber } = req.body;

    let resident;
    if (residentId) {
      resident = await prisma.resident.findUnique({
        where: { id: residentId },
        include: {
          schedules: { where: { isActive: true }, orderBy: { scheduledTime: 'asc' } },
          tasks: { orderBy: { createdAt: 'desc' }, take: 5 },
          activities: { orderBy: { timestamp: 'desc' }, take: 10 },
          healthLogs: { orderBy: { timestamp: 'desc' }, take: 5 }
        }
      });
    } else if (roomNumber) {
      resident = await prisma.resident.findFirst({
        where: { roomNumber: String(roomNumber).trim() },
        include: {
          schedules: { where: { isActive: true }, orderBy: { scheduledTime: 'asc' } },
          tasks: { orderBy: { createdAt: 'desc' }, take: 5 },
          activities: { orderBy: { timestamp: 'desc' }, take: 10 },
          healthLogs: { orderBy: { timestamp: 'desc' }, take: 5 }
        }
      });
    } else {
      // Default to Mary Johnson (Room 102) for fast demo
      resident = await prisma.resident.findFirst({
        where: { roomNumber: '102' },
        include: {
          schedules: { where: { isActive: true }, orderBy: { scheduledTime: 'asc' } },
          tasks: { orderBy: { createdAt: 'desc' }, take: 5 },
          activities: { orderBy: { timestamp: 'desc' }, take: 10 },
          healthLogs: { orderBy: { timestamp: 'desc' }, take: 5 }
        }
      });
    }

    if (!resident) {
      res.status(404).json({
        success: false,
        error: 'Resident profile not found.'
      });
      return;
    }

    await logAuditEvent(prisma, {
      actorType: ActorType.RESIDENT,
      actorId: resident.name,
      event: 'RESIDENT_PORTAL_LOGIN',
      metadata: {
        residentId: resident.id,
        roomNumber: resident.roomNumber,
        device: 'IN_ROOM_TABLET'
      }
    });

    res.json({
      success: true,
      sessionType: 'RESIDENT',
      resident
    });
  } catch (err: any) {
    console.error('Resident login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

