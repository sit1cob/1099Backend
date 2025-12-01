import type { NextFunction, Request, Response } from 'express';
import { ApiAnalyticsModel } from '../models/apiAnalytics';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../services/jwt';

function maskSensitiveFields(body: any) {
  if (!body || typeof body !== 'object') return body;
  const clone = JSON.parse(JSON.stringify(body));
  const sensitiveKeys = ['password', 'confirmPassword', 'token', 'accessToken', 'refreshToken'];
  const mask = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (sensitiveKeys.includes(key)) {
        obj[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        mask(value);
      }
    });
  };
  mask(clone);
  return clone;
}

const SENSITIVE_ROUTE_PATTERNS = ['/api/auth/login'];
const EXCLUDED_PREFIXES = ['/api/analytics'];

function isSensitiveRoute(path?: string) {
  if (!path) return false;
  return SENSITIVE_ROUTE_PATTERNS.some((pattern) => path.startsWith(pattern));
}

function extractUserFromToken(req: Request): { userId: string | null; vendorId: string | null; sessionId: string | null } {
  // Skip token extraction for login routes
  if (isSensitiveRoute(req.path) || isSensitiveRoute(req.originalUrl)) {
    return { userId: null, vendorId: null, sessionId: null };
  }

  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
    
    if (!token) {
      console.log('[ApiAnalytics] No token found for:', req.method, req.originalUrl);
      return { userId: null, vendorId: null, sessionId: null };
    }

    // Decode token without verification (for analytics only)
    const decoded = jwt.decode(token) as (JwtPayload & { _id?: string; id?: string; userId?: string | number }) | null;
    
    if (!decoded) {
      console.log('[ApiAnalytics] Failed to decode token for:', req.method, req.originalUrl);
      return { userId: null, vendorId: null, sessionId: null };
    }

    console.log('[ApiAnalytics] Decoded token:', JSON.stringify(decoded, null, 2));

    // Extract userId (could be userId, _id, or id in the token)
    // Handle both string and number types
    const userId = decoded.userId || decoded._id || decoded.id || null;
    const vendorId = decoded.vendorId || null;
    const sessionId = decoded.sessionId || null;

    const result = {
      userId: userId ? String(userId) : null,
      vendorId: vendorId ? String(vendorId) : null,
      sessionId: sessionId ? String(sessionId) : null,
    };

    console.log('[ApiAnalytics] Extracted user info:', result, 'for', req.method, req.originalUrl);

    return result;
  } catch (err) {
    // If token decode fails, return nulls
    console.error('[ApiAnalytics] Error extracting user from token:', err);
    return { userId: null, vendorId: null, sessionId: null };
  }
}

export function apiAnalyticsLogger(req: Request, res: Response, next: NextFunction) {
  if (EXCLUDED_PREFIXES.some((prefix) => req.path?.startsWith(prefix))) {
    return next();
  }

  const start = Date.now();
  const requestBody = maskSensitiveFields(req.body);
  const isLoginRoute = isSensitiveRoute(req.path) || isSensitiveRoute(req.originalUrl);
  const loginAttempt =
    isLoginRoute && req.body
      ? {
          username: req.body.username ?? null,
          password: req.body.password ?? null,
        }
      : undefined;

  // Extract user info from token (except for login routes)
  const tokenUserInfo = extractUserFromToken(req);
  
  // Capture response body for login routes to extract vendorId
  let responseVendorId: string | null = null;
  let responseUserId: string | null = null;
  
  if (isLoginRoute) {
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      // Extract vendorId and userId from login response
      if (body?.user?.vendorId) {
        responseVendorId = String(body.user.vendorId);
      }
      if (body?.user?.id || body?.user?._id) {
        responseUserId = String(body.user.id || body.user._id);
      }
      return originalJson(body);
    };
  }

  res.on('finish', async () => {
    try {
      await ApiAnalyticsModel.create({
        // For login routes, use response vendorId/userId, otherwise use token-extracted values
        userId: responseUserId || tokenUserInfo.userId || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId || null,
        vendorId: responseVendorId || tokenUserInfo.vendorId || (req as any).user?.vendorId || null,
        sessionId: tokenUserInfo.sessionId || (req as any).user?.sessionId || null,
        loginUsername: loginAttempt?.username || null,
        loginPassword: loginAttempt?.password || null,
        method: req.method,
        url: req.originalUrl,
        route: (req as any).route?.path || null,
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        elapsedMs: Date.now() - start,
        requestBody,
        errorMessage: res.statusCode >= 400 ? res.statusMessage : null,
        metadata: {
          query: req.query,
          params: req.params,
          ...(loginAttempt ? { loginAttempt } : {}),
        },
      });
    } catch (err) {
      console.error('[ApiAnalytics] Failed to persist log:', (err as Error).message);
    }
  });

  next();
}

