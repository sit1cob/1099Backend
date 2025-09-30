import { Router } from 'express';
import { UserModel } from '../models/user';
import { VendorModel } from '../models/vendor';
import { password } from '../utils/password';
import { jwtService } from '../services/jwt';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password: pwd, role, fcmToken } = req.body || {};
    if (typeof fcmToken === 'string') {
      console.log('[LOGIN] received fcmToken len=', fcmToken.trim().length);
    } else {
      console.log('[LOGIN] no fcmToken in request');
    }
    if (!username || !pwd) return res.status(400).json({ success: false, message: 'username and password required' });

    const user = await UserModel.findOne({ username }).lean();
    if (!user || !user.passwordHash) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const ok = await password.compare(pwd, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (user.isActive === false) return res.status(403).json({ success: false, message: 'User disabled' });

    const payload = {
      userId: String(user._id),
      role: (role as string) || user.role || 'registered_user',
      vendorId: user.vendorId ? String(user.vendorId) : undefined,
      sessionId: `s_${Date.now()}`,
    };

    const accessToken = jwtService.signAccess(payload, '2h');
    const refreshToken = jwtService.signRefresh({ userId: payload.userId, role: payload.role }, '7d');

    // Persist session metadata and FCM token (if provided)
    const $set: Record<string, any> = { lastLoginAt: new Date() };
    const $addToSet: Record<string, any> = {};
    if (typeof fcmToken === 'string' && fcmToken.trim().length > 0) {
      $set.lastFcmToken = fcmToken.trim();
      $set.lastFcmAt = new Date();
      $addToSet.fcmTokens = fcmToken.trim();
    }
    if (Object.keys($addToSet).length > 0) {
      const result = await UserModel.updateOne({ _id: user._id }, { $set, $addToSet });
      console.log('[LOGIN] fcmToken update result', { matched: (result as any).matchedCount, modified: (result as any).modifiedCount });
    } else {
      const result = await UserModel.updateOne({ _id: user._id }, { $set });
      console.log('[LOGIN] profile update result', { matched: (result as any).matchedCount, modified: (result as any).modifiedCount });
    }
    // Fetch back minimal fields to verify
    const updated = await UserModel.findById(user._id).select('fcmTokens lastFcmToken lastFcmAt').lean();
    console.log('[LOGIN] user fcm snapshot', {
      tokensCount: (updated?.fcmTokens || []).length,
      lastFcmToken: updated?.lastFcmToken ? String(updated.lastFcmToken).slice(0, 8) + '…' : null,
      lastFcmAt: updated?.lastFcmAt || null,
    });

    // Fetch latest user doc after updates to return fresh data
    const freshUser = await UserModel.findById(user._id).lean();
    let vendorName: string | undefined;
    if (payload.vendorId) {
      const vendor = await VendorModel.findById(payload.vendorId).lean();
      vendorName = vendor?.name;
    }
    console.log('[LOGIN] fresh user', freshUser);

    const permissions = ['view_assigned_jobs', 'update_job_status', 'upload_parts', 'view_vendor_portal'];

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: String(freshUser?._id || user._id),
          username: freshUser?.username || user.username,
          role: freshUser?.role || payload.role,
          vendorId: freshUser?.vendorId ? String(freshUser.vendorId) : payload.vendorId,
          vendorName,
          email: freshUser?.email,
          lastFcmToken: freshUser?.lastFcmToken || updated?.lastFcmToken,
          lastFcmAt: freshUser?.lastFcmAt || updated?.lastFcmAt,
          fcmTokensCount: Array.isArray(freshUser?.fcmTokens) ? freshUser!.fcmTokens.length : (Array.isArray(updated?.fcmTokens) ? updated!.fcmTokens.length : 0),
          permissions,
        },
      },
    });
  } catch (err: any) {
    console.error('[LOGIN]', err);
    return res.status(500).json({ success: false, message: err?.message || 'Login failed' });
  }
});

// POST /api/auth/logout
// Body: { fcmToken?: string }
authRouter.post('/logout', authenticateJWT(), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { fcmToken } = (req.body || {}) as { fcmToken?: string };

    const updates: any = {};
    if (typeof fcmToken === 'string' && fcmToken.trim()) {
      updates.$pull = { fcmTokens: fcmToken.trim() };
      // Only unset last token fields if the provided token matches the last
      const user = await UserModel.findById(userId).select('lastFcmToken').lean();
      if (user?.lastFcmToken === fcmToken.trim()) {
        updates.$unset = { lastFcmToken: '', lastFcmAt: '' };
      }
    }

    if (Object.keys(updates).length > 0) {
      await UserModel.updateOne({ _id: userId }, updates);
    }

    return res.json({ success: true, message: 'Logged out' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Logout failed' });
  }
});

// GET /api/auth/status
authRouter.get('/status', authenticateJWT(), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const user = await UserModel.findById(userId).lean();
    if (!user) return res.status(401).json({ success: false, authenticated: false });
    const permissions = ['view_assigned_jobs', 'update_job_status', 'upload_parts', 'view_vendor_portal'];
    return res.json({
      success: true,
      authenticated: true,
      user: {
        id: String(user._id),
        role: user.role || 'registered_user',
        vendorId: user.vendorId ? String(user.vendorId) : undefined,
        lastFcmToken: user.lastFcmToken || undefined,
        lastFcmAt: user.lastFcmAt || undefined,
        fcmTokensCount: Array.isArray(user.fcmTokens) ? user.fcmTokens.length : 0,
        permissions,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Status check failed' });
  }
});

// POST /api/auth/register-vendor
// Public vendor registration: creates a Vendor and a User linked to it
// Body: { vendorName, username, password, email?, phone?, serviceAreas?: string[], appliances?: string[], available?: boolean }
authRouter.post('/register-vendor', async (req, res) => {
  try {
    const { vendorName, username, password: pwd, email, phone, serviceAreas, appliances, available } = req.body || {};
    if (!vendorName || !username || !pwd) {
      return res.status(400).json({ success: false, message: 'vendorName, username and password are required' });
    }

    // Enforce unique username
    const existingUser = await UserModel.findOne({ username }).lean();
    if (existingUser) {
      return res.status(409).json({ success: false, message: `Username '${username}' already exists` });
    }

    // Find or create vendor by name
    let vendor = await VendorModel.findOne({ name: vendorName });
    if (!vendor) {
      vendor = await VendorModel.create({
        name: vendorName,
        phone,
        serviceAreas: Array.isArray(serviceAreas) ? serviceAreas : undefined,
        appliances: Array.isArray(appliances) ? appliances : undefined,
        available: typeof available === 'boolean' ? available : undefined,
        isActive: true,
      } as any);
    } else {
      const updates: any = {};
      if (typeof phone === 'string') updates.phone = phone;
      if (Array.isArray(serviceAreas)) updates.serviceAreas = serviceAreas;
      if (Array.isArray(appliances)) updates.appliances = appliances;
      if (typeof available === 'boolean') updates.available = available;
      if (Object.keys(updates).length > 0) await VendorModel.updateOne({ _id: vendor._id }, { $set: updates });
      // refresh vendor with new values
      vendor = await VendorModel.findById(vendor._id);
    }

    // Hash password and create user
    const passwordHash = await password.hash(pwd);
    const user = await UserModel.create({
      username,
      email,
      passwordHash,
      role: 'registered_user',
      vendorId: vendor._id,
      isActive: true,
    });

    // Issue tokens
    const payload = {
      userId: String(user._id),
      role: 'registered_user',
      vendorId: String(vendor._id),
      sessionId: `s_${Date.now()}`,
    };

    const accessToken = jwtService.signAccess(payload, '2h');
    const refreshToken = jwtService.signRefresh({ userId: payload.userId, role: payload.role }, '7d');

    return res.status(201).json({
      success: true,
      message: 'Vendor and user registered',
      data: {
        vendor: {
          id: String(vendor._id),
          name: vendor.name,
          phone: (vendor as any).phone || null,
          serviceAreas: (vendor as any).serviceAreas || [],
          appliances: (vendor as any).appliances || [],
          available: (vendor as any).available !== false,
        },
        user: { id: String(user._id), username: user.username, role: 'registered_user', vendorId: String(vendor._id) },
        accessToken,
        refreshToken,
      },
    });
  } catch (err: any) {
    console.error('[REGISTER_VENDOR]', err);
    return res.status(500).json({ success: false, message: err?.message || 'Registration failed' });
  }
});
