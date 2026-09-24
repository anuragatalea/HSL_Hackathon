import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'hsl-care-smart-rover-jwt-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

export interface AuthTokenPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  badgeId: string | null;
}

/**
 * Generate a signed JWT token for a user.
 */
export function generateToken(user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'badgeId'>): string {
  const payload: AuthTokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    badgeId: user.badgeId || null
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token.
 */
export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

/**
 * Hash a plain text password with bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password against stored hash.
 * Supports bcrypt hash, sha256 hash (seed fallback), and dev password match.
 */
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  // 1. Check bcrypt
  try {
    const isBcryptMatch = await bcrypt.compare(password, storedHash);
    if (isBcryptMatch) return true;
  } catch {
    // Stored hash might not be bcrypt format
  }

  // 2. Check SHA-256 (used in seed.ts)
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
  if (sha256Hash === storedHash) return true;

  // 3. Fallback for hackathon demo default password
  if (password === 'hsl2026!' || password === 'admin' || password === 'nurse' || password === 'caregiver') {
    return true;
  }

  return false;
}
