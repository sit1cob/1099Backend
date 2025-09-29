import type { Request, Response, NextFunction } from 'express';
import { jwtService, type JwtPayload } from '../services/jwt';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { username?: string };
}

export function authenticateJWT() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const header = req.headers['authorization'] || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
      if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
      const payload = jwtService.verifyAccess(token);
      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  };
}

export function requireAdmin() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    next();
  };
}
