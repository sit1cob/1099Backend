import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh';

export interface JwtPayload {
  userId: string;
  role: string;
  vendorId?: string;
  sessionId?: string;
}

export const jwtService = {
  signAccess(payload: JwtPayload, expiresIn = '1h') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  },
  signRefresh(payload: JwtPayload, expiresIn = '7d') {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn });
  },
  verifyAccess(token: string) {
    return jwt.verify(token, JWT_SECRET) as JwtPayload & jwt.JwtPayload;
  }
};
