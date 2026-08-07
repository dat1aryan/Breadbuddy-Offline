import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-please';

export interface AuthedRequest extends Request {
  userId?: number;
  userEmail?: string;
}

export function signToken(payload: { id: number; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function authMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token big dawg. Sign in first.' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    req.userId = payload.id;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: 'Token expired/invalid. Sign in again bestie.' });
  }
}

export function requireUserId(req: AuthedRequest): number {
  if (req.userId === undefined) {
    throw new Error('Unauthorized');
  }
  return req.userId;
}
