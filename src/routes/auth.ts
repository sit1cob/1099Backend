import { Router } from 'express';
import { UserModel } from '../models/user';
import { VendorModel } from '../models/vendor';
import { password } from '../utils/password';
import { jwtService } from '../services/jwt';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { ExternalApiAdapter, EXTERNAL_API_URL } from '../services/externalApiAdapter';

export const authRouter = Router();

// GET /api/auth/status - NO AUTH (proxies to external API)
authRouter.get('/status', async (req, res) => {
  try {
    console.log('[AuthStatus] ========================================');
    console.log('[AuthStatus] Calling EXTERNAL API:', `${EXTERNAL_API_URL}/api/auth/status`);
    console.log('[AuthStatus] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API
      const externalResponse = await ExternalApiAdapter.callExternalApi('/api/auth/status', token, 'GET');
      
      console.log('[AuthStatus] ========== EXTERNAL API RESPONSE ==========');
      console.log('[AuthStatus] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[AuthStatus] ================================================');
      console.log('[AuthStatus] ✓ Returning external API response');

      // Return external API response as-is
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[AuthStatus] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(401).json({ 
        success: false, 
        message: extErr.message || 'Invalid or expired token' 
      });
    }
  } catch (err: any) {
    console.error('[AuthStatus] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to check auth status' });
  }
});

// POST /api/auth/refresh - NO AUTH (proxies to external API)
authRouter.post('/refresh', async (req, res) => {
  try {
    console.log('[AuthRefresh] ========================================');
    console.log('[AuthRefresh] Calling EXTERNAL API:', `${EXTERNAL_API_URL}/api/auth/refresh`);
    console.log('[AuthRefresh] ========================================');

    try {
      // Call external API (no token needed for refresh)
      const externalResponse = await ExternalApiAdapter.callExternalApi('/api/auth/refresh', '', 'POST', req.body);
      
      console.log('[AuthRefresh] ========== EXTERNAL API RESPONSE ==========');
      console.log('[AuthRefresh] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[AuthRefresh] ================================================');
      console.log('[AuthRefresh] ✓ Returning external API response');

      // Return external API response as-is
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[AuthRefresh] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(401).json({ 
        success: false, 
        message: extErr.message || 'Token refresh failed' 
      });
    }
  } catch (err: any) {
    console.error('[AuthRefresh] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to refresh token' });
  }
});

// POST /api/auth/login
// First call external API, then call MongoDB, cache and compare responses
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password: pwd, role, fcmToken } = req.body || {};
    if (typeof fcmToken === 'string') {
      console.log('[LOGIN] received fcmToken len=', fcmToken.trim().length);
    } else {
      console.log('[LOGIN] no fcmToken in request');
    }
    if (!username || !pwd) return res.status(400).json({ success: false, message: 'username and password required' });

    console.log('[LOGIN] ========================================');
    console.log('[LOGIN] Starting dual API call for user:', username);
    console.log('[LOGIN] ========================================');

    // STEP 1: Call external API first
    console.log('[LOGIN] STEP 1: Calling EXTERNAL API:', `${EXTERNAL_API_URL}/api/auth/login`);
    let externalResponse;
    try {
      externalResponse = await ExternalApiAdapter.login(username, pwd, role);
      console.log('[LOGIN] ✓ External API call successful');
    } catch (extErr: any) {
      console.error('[LOGIN] ✗ External API call failed:', extErr.message);
      // Continue to MongoDB even if external fails
    }

    // STEP 2: Call MongoDB/Local API
    console.log('[LOGIN] STEP 2: Calling MONGODB/LOCAL API...');
    let mongoResponse;
    try {
      const user = await UserModel.findOne({ username }).lean();
      if (user && user.passwordHash) {
        const ok = await password.compare(pwd, user.passwordHash);
        if (ok && user.isActive !== false) {
          const payload = {
            userId: String(user._id),
            role: (role as string) || user.role || 'registered_user',
            vendorId: user.vendorId ? String(user.vendorId) : undefined,
            sessionId: `s_${Date.now()}`,
          };

          const accessToken = jwtService.signAccess(payload, '2h');
          const refreshToken = jwtService.signRefresh({ userId: payload.userId, role: payload.role }, '7d');

          // Update FCM token if provided
          const $set: Record<string, any> = { lastLoginAt: new Date() };
          const $addToSet: Record<string, any> = {};
          if (typeof fcmToken === 'string' && fcmToken.trim().length > 0) {
            $set.lastFcmToken = fcmToken.trim();
            $set.lastFcmAt = new Date();
            $addToSet.fcmTokens = fcmToken.trim();
          }
          if (Object.keys($addToSet).length > 0) {
            await UserModel.updateOne({ _id: user._id }, { $set, $addToSet });
          } else {
            await UserModel.updateOne({ _id: user._id }, { $set });
          }

          const freshUser = await UserModel.findById(user._id).lean();
          let vendorName: string | undefined;
          if (payload.vendorId) {
            const vendor = await VendorModel.findById(payload.vendorId).lean();
            vendorName = vendor?.name;
          }

          const permissions = ['view_assigned_jobs', 'update_job_status', 'upload_parts', 'view_vendor_portal'];

          mongoResponse = {
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
                permissions,
              },
            },
          };
          console.log('[LOGIN] ✓ MongoDB/Local API call successful');
        } else {
          console.log('[LOGIN] ✗ MongoDB/Local API: Invalid credentials or user disabled');
        }
      } else {
        console.log('[LOGIN] ✗ MongoDB/Local API: User not found');
      }
    } catch (mongoErr: any) {
      console.error('[LOGIN] ✗ MongoDB/Local API call failed:', mongoErr.message);
    }

    // STEP 3: Compare and log both responses
    console.log('[LOGIN] ========================================');
    console.log('[LOGIN] COMPARISON:');
    console.log('[LOGIN] ========================================');
    console.log('[LOGIN] External API Response:', externalResponse ? 'SUCCESS' : 'FAILED');
    console.log('[LOGIN] MongoDB API Response:', mongoResponse ? 'SUCCESS' : 'FAILED');
    
    if (externalResponse) {
      console.log('[LOGIN] External Response:', JSON.stringify(externalResponse, null, 2));
    }
    if (mongoResponse) {
      console.log('[LOGIN] MongoDB Response:', JSON.stringify(mongoResponse, null, 2));
    }
    console.log('[LOGIN] ========================================');

    // STEP 4: Return external response (or MongoDB as fallback)
    const finalResponse = externalResponse || mongoResponse;
    
    if (!finalResponse) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    console.log('[LOGIN] Returning response from:', externalResponse ? 'EXTERNAL API' : 'MONGODB API');
    return res.json(finalResponse);
  } catch (err: any) {
    console.error('[LOGIN] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Login failed' });
  }
});

// POST /api/auth/login-external
// First call external API, then call MongoDB, cache and compare responses
authRouter.post('/login-external', async (req, res) => {
  try {
    const { username, password: pwd, role, fcmToken } = req.body || {};
    if (!username || !pwd) {
      return res.status(400).json({ success: false, message: 'username and password required' });
    }

    console.log('[LOGIN-EXTERNAL] ========================================');
    console.log('[LOGIN-EXTERNAL] Starting dual API call for user:', username);
    console.log('[LOGIN-EXTERNAL] ========================================');

    // STEP 1: Call external API first
    console.log('[LOGIN-EXTERNAL] STEP 1: Calling EXTERNAL API:', `${EXTERNAL_API_URL}/api/auth/login`);
    let externalResponse;
    try {
      externalResponse = await ExternalApiAdapter.login(username, pwd, role);
      console.log('[LOGIN-EXTERNAL] ✓ External API call successful');
    } catch (extErr: any) {
      console.error('[LOGIN-EXTERNAL] ✗ External API call failed:', extErr.message);
      // Continue to MongoDB even if external fails
    }

    // STEP 2: Call MongoDB/Local API
    console.log('[LOGIN-EXTERNAL] STEP 2: Calling MONGODB/LOCAL API...');
    let mongoResponse;
    try {
      const user = await UserModel.findOne({ username }).lean();
      if (user && user.passwordHash) {
        const ok = await password.compare(pwd, user.passwordHash);
        if (ok && user.isActive !== false) {
          const payload = {
            userId: String(user._id),
            role: (role as string) || user.role || 'registered_user',
            vendorId: user.vendorId ? String(user.vendorId) : undefined,
            sessionId: `s_${Date.now()}`,
          };

          const accessToken = jwtService.signAccess(payload, '2h');
          const refreshToken = jwtService.signRefresh({ userId: payload.userId, role: payload.role }, '7d');

          // Update FCM token if provided
          const $set: Record<string, any> = { lastLoginAt: new Date() };
          const $addToSet: Record<string, any> = {};
          if (typeof fcmToken === 'string' && fcmToken.trim().length > 0) {
            $set.lastFcmToken = fcmToken.trim();
            $set.lastFcmAt = new Date();
            $addToSet.fcmTokens = fcmToken.trim();
          }
          if (Object.keys($addToSet).length > 0) {
            await UserModel.updateOne({ _id: user._id }, { $set, $addToSet });
          } else {
            await UserModel.updateOne({ _id: user._id }, { $set });
          }

          const freshUser = await UserModel.findById(user._id).lean();
          let vendorName: string | undefined;
          if (payload.vendorId) {
            const vendor = await VendorModel.findById(payload.vendorId).lean();
            vendorName = vendor?.name;
          }

          const permissions = ['view_assigned_jobs', 'update_job_status', 'upload_parts', 'view_vendor_portal'];

          mongoResponse = {
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
                permissions,
              },
            },
          };
          console.log('[LOGIN-EXTERNAL] ✓ MongoDB/Local API call successful');
        } else {
          console.log('[LOGIN-EXTERNAL] ✗ MongoDB/Local API: Invalid credentials or user disabled');
        }
      } else {
        console.log('[LOGIN-EXTERNAL] ✗ MongoDB/Local API: User not found');
      }
    } catch (mongoErr: any) {
      console.error('[LOGIN-EXTERNAL] ✗ MongoDB/Local API call failed:', mongoErr.message);
    }

    // STEP 3: Compare and log both responses
    console.log('[LOGIN-EXTERNAL] ========================================');
    console.log('[LOGIN-EXTERNAL] COMPARISON:');
    console.log('[LOGIN-EXTERNAL] ========================================');
    console.log('[LOGIN-EXTERNAL] External API Response:', externalResponse ? 'SUCCESS' : 'FAILED');
    console.log('[LOGIN-EXTERNAL] MongoDB API Response:', mongoResponse ? 'SUCCESS' : 'FAILED');
    
    if (externalResponse) {
      console.log('[LOGIN-EXTERNAL] External Response:', JSON.stringify(externalResponse, null, 2));
    }
    if (mongoResponse) {
      console.log('[LOGIN-EXTERNAL] MongoDB Response:', JSON.stringify(mongoResponse, null, 2));
    }
    console.log('[LOGIN-EXTERNAL] ========================================');

    // STEP 4: Return external response (or MongoDB as fallback)
    const finalResponse = externalResponse || mongoResponse;
    
    if (!finalResponse) {
      return res.status(401).json({ success: false, message: 'Both APIs failed' });
    }

    console.log('[LOGIN-EXTERNAL] Returning response from:', externalResponse ? 'EXTERNAL API' : 'MONGODB API');
    return res.json(finalResponse);
  } catch (err: any) {
    console.error('[LOGIN-EXTERNAL] Unexpected error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: err?.message || 'Login failed' 
    });
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

// GET /api/auth/vendor/assignments/:assignmentId/parts - NO AUTH (proxies to external API)
authRouter.get('/vendor/assignments/:assignmentId/parts', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    console.log('[GetAssignmentParts] ========================================');
    console.log('[GetAssignmentParts] Calling EXTERNAL API:', `${EXTERNAL_API_URL}/api/auth/vendor/assignments/${assignmentId}/parts`);
    console.log('[GetAssignmentParts] Assignment ID:', assignmentId);
    console.log('[GetAssignmentParts] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API
      const externalResponse = await ExternalApiAdapter.callExternalApi(
        `/api/auth/vendor/assignments/${assignmentId}/parts`,
        token,
        'GET'
      );
      
      console.log('[GetAssignmentParts] ========== EXTERNAL API RESPONSE ==========');
      console.log('[GetAssignmentParts] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[GetAssignmentParts] ================================================');
      console.log('[GetAssignmentParts] ✓ Returning external API response');

      // Return external API response as-is
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[GetAssignmentParts] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'External API call failed' 
      });
    }
  } catch (err: any) {
    console.error('[GetAssignmentParts] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to get assignment parts' });
  }
});

// DELETE /api/auth/vendor/parts/:partId - NO AUTH (proxies to external API)
authRouter.delete('/vendor/parts/:partId', async (req, res) => {
  try {
    const { partId } = req.params;
    
    console.log('[DeleteVendorPart] ========================================');
    console.log('[DeleteVendorPart] Calling EXTERNAL API:', `${EXTERNAL_API_URL}/api/auth/vendor/parts/${partId}`);
    console.log('[DeleteVendorPart] Part ID:', partId);
    console.log('[DeleteVendorPart] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API
      const externalResponse = await ExternalApiAdapter.callExternalApi(
        `/api/auth/vendor/parts/${partId}`,
        token,
        'DELETE'
      );
      
      console.log('[DeleteVendorPart] ========== EXTERNAL API RESPONSE ==========');
      console.log('[DeleteVendorPart] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[DeleteVendorPart] ================================================');
      console.log('[DeleteVendorPart] ✓ Returning external API response');

      // Return external API response as-is
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[DeleteVendorPart] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'External API call failed' 
      });
    }
  } catch (err: any) {
    console.error('[DeleteVendorPart] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to delete part' });
  }
});
