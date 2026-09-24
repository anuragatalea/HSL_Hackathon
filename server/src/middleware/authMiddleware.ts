import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthTokenPayload } from '../services/authService.js';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

/**
 * Middleware: Requires a valid JWT Bearer token.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Missing or malformed Bearer token.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.'
    });
  }
}

/**
 * Middleware: Optional authentication. Attaches req.user if valid token provided.
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyToken(token);
      req.user = payload;
    } catch {
      // Ignored for optional auth
    }
  }
  next();
}

/**
 * Middleware: Restricts route to specified user roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Role "${req.user.role}" does not have required permissions.`
      });
      return;
    }

    next();
  };
}
