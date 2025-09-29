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
    const { username, password: pwd, role } = req.body || {};
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

    let vendorName: string | undefined;
    if (payload.vendorId) {
      const vendor = await VendorModel.findById(payload.vendorId).lean();
      vendorName = vendor?.name;
    }

    const permissions = ['view_assigned_jobs', 'update_job_status', 'upload_parts', 'view_vendor_portal'];

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: payload.userId,
          username: user.username,
          role: payload.role,
          vendorId: payload.vendorId,
          vendorName,
          permissions,
        },
      },
    });
  } catch (err: any) {
    console.error('[LOGIN]', err);
    return res.status(500).json({ success: false, message: err?.message || 'Login failed' });
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
        permissions,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Status check failed' });
  }
});

// POST /api/auth/register-vendor
// Public vendor registration: creates a Vendor and a User linked to it
// Body: { vendorName, username, password, email? }
authRouter.post('/register-vendor', async (req, res) => {
  try {
    const { vendorName, username, password: pwd, email } = req.body || {};
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
      vendor = await VendorModel.create({ name: vendorName, isActive: true });
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
        vendor: { id: String(vendor._id), name: vendor.name },
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
