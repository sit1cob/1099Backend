import type { Request, Response, NextFunction } from 'express';
import { jwtService, type JwtPayload } from '../services/jwt';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { username?: string };
}

export function authenticateJWT(options?: { skipValidation?: boolean }) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const header = req.headers['authorization'] || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
      if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
      
      // If skipValidation is true, just decode without verifying
      if (options?.skipValidation) {
        const decoded = jwt.decode(token) as JwtPayload;
        console.log('[Auth] Decoded token:', JSON.stringify(decoded));
        if (!decoded) {
          return res.status(401).json({ success: false, message: 'Invalid token format' });
        }
        // Don't check for userId here - let the route handle it
        req.user = decoded;
        next();
      } else {
        const payload = jwtService.verifyAccess(token);
        req.user = payload;
        next();
      }
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
