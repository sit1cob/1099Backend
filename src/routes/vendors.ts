import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { VendorModel } from '../models/vendor';
import { OrderModel } from '../models/order';
import { JobAssignmentModel } from '../models/jobAssignment';
import { JobModel } from '../models/job';
import { PartModel } from '../models/part';
import mongoose from 'mongoose';
import { ExternalApiAdapter } from '../services/externalApiAdapter';

export const vendorsRouter = Router();

// GET /api/vendors/me - Get current vendor profile (proxies to external API)
// This must be defined BEFORE the authenticateJWT() middleware
vendorsRouter.get('/me', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[VendorProfile] ========================================');
    console.log('[VendorProfile] Calling EXTERNAL API...');
    console.log('[VendorProfile] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API
      const externalResponse = await ExternalApiAdapter.callExternalApi('/api/vendors/me', token, 'GET');
      
      console.log('[VendorProfile] ========== EXTERNAL API RESPONSE ==========');
      console.log('[VendorProfile] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[VendorProfile] ================================================');
      console.log('[VendorProfile] ✓ Returning external API response (success or failure)');

      // Always return external API response (even if failed)
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[VendorProfile] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'External API call failed' 
      });
    }
  } catch (err: any) {
    console.error('[VendorProfile] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch vendor profile' });
  }
});

// GET /api/vendors/me/jobs - NO AUTH (proxies to external API)
// This must be defined BEFORE the authenticateJWT() middleware
vendorsRouter.get('/me/jobs', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[VendorJobs] ========================================');
    console.log('[VendorJobs] Calling EXTERNAL API...');
    console.log('[VendorJobs] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API
      const externalResponse = await ExternalApiAdapter.callExternalApi('/api/vendors/me/jobs', token, 'GET');
      
      console.log('[VendorJobs] ========== EXTERNAL API RESPONSE ==========');
      console.log('[VendorJobs] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[VendorJobs] ================================================');
      console.log('[VendorJobs] ✓ Returning external API response (success or failure)');

      // Always return external API response (even if failed)
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[VendorJobs] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'External API call failed' 
      });
    }
  } catch (err: any) {
    console.error('[VendorJobs] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch vendor jobs' });
  }
});

// GET /api/vendors/me/assignments - NO AUTH (proxies to external API)
// This must be defined BEFORE the authenticateJWT() middleware
vendorsRouter.get('/me/assignments', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[VendorAssignments] ========================================');
    console.log('[VendorAssignments] Calling EXTERNAL API...');
    console.log('[VendorAssignments] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API
      const externalResponse = await ExternalApiAdapter.callExternalApi('/api/vendors/me/assignments', token, 'GET');
      
      console.log('[VendorAssignments] ========== EXTERNAL API RESPONSE ==========');
      console.log('[VendorAssignments] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[VendorAssignments] ================================================');
      console.log('[VendorAssignments] ✓ Returning external API response (success or failure)');

      // Always return external API response (even if failed)
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[VendorAssignments] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'External API call failed' 
      });
    }
  } catch (err: any) {
    console.error('[VendorAssignments] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch vendor assignments' });
  }
});

// GET /api/vendors/me/dashboard - NO AUTH (proxies to external API)
// Get dashboard statistics (available jobs, my jobs, completed)
// This must be defined BEFORE the authenticateJWT() middleware
vendorsRouter.get('/me/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[VendorDashboard] ========================================');
    console.log('[VendorDashboard] Calling EXTERNAL API...');
    console.log('[VendorDashboard] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API to get all necessary data
      const [availableJobsResponse, assignmentsResponse] = await Promise.all([
        ExternalApiAdapter.callExternalApi('/api/vendors/me/jobs', token, 'GET'),
        ExternalApiAdapter.callExternalApi('/api/vendors/me/assignments', token, 'GET')
      ]);
      
      console.log('[VendorDashboard] ========== EXTERNAL API RESPONSES ==========');
      console.log('[VendorDashboard] Available Jobs Response:', JSON.stringify(availableJobsResponse, null, 2));
      console.log('[VendorDashboard] Assignments Response:', JSON.stringify(assignmentsResponse, null, 2));
      console.log('[VendorDashboard] ================================================');

      // Calculate statistics
      // Extract jobs array - check if data is already an array, otherwise look for data.jobs
      const availableJobs = Array.isArray(availableJobsResponse?.data) 
        ? availableJobsResponse.data 
        : (availableJobsResponse?.data?.jobs || []);
      const assignments = assignmentsResponse?.data || [];
      
      const availableJobsCount = Array.isArray(availableJobs) ? availableJobs.length : 0;
      const myJobsCount = Array.isArray(assignments) ? assignments.length : 0;
      const completedCount = Array.isArray(assignments) 
        ? assignments.filter((a: any) => a.status === 'completed').length 
        : 0;
      
      console.log('[VendorDashboard] Calculated Statistics:');
      console.log('[VendorDashboard]   Available Jobs Count:', availableJobsCount);
      console.log('[VendorDashboard]   My Jobs Count:', myJobsCount);
      console.log('[VendorDashboard]   Completed Count:', completedCount);

      const dashboardData = {
        success: true,
        data: {
          availableJobs: availableJobsCount,
          myJobs: myJobsCount,
          completed: completedCount,
          statistics: {
            availableJobsCount,
            myJobsCount,
            completedCount,
            inProgressCount: Array.isArray(assignments) 
              ? assignments.filter((a: any) => ['assigned', 'arrived', 'in_progress'].includes(a.status)).length 
              : 0
          }
        }
      };

      console.log('[VendorDashboard] ✓ Returning dashboard statistics:', JSON.stringify(dashboardData, null, 2));

      return res.json(dashboardData);
    } catch (extErr: any) {
      console.error('[VendorDashboard] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'External API call failed' 
      });
    }
  } catch (err: any) {
    console.error('[VendorDashboard] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch dashboard data' });
  }
});

// POST /api/vendors/me/parts - NO AUTH (proxies to external API)
// This must be defined BEFORE the authenticateJWT() middleware
vendorsRouter.post('/me/parts', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[VendorParts] ========================================');
    console.log('[VendorParts] Calling EXTERNAL API...');
    console.log('[VendorParts] Body:', JSON.stringify(req.body, null, 2));
    console.log('[VendorParts] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API
      const externalResponse = await ExternalApiAdapter.callExternalApi(
        '/api/vendors/me/parts',
        token,
        'POST',
        req.body
      );
      
      console.log('[VendorParts] ========== EXTERNAL API RESPONSE ==========');
      console.log('[VendorParts] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[VendorParts] ================================================');
      console.log('[VendorParts] ✓ Returning external API response (success or failure)');

      // Always return external API response (even if failed)
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[VendorParts] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'External API call failed' 
      });
    }
  } catch (err: any) {
    console.error('[VendorParts] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to add parts' });
  }
});

// DELETE /api/vendors/me/parts/:partId - NO AUTH (proxies to external API)
// Delete a part that was previously added by the vendor
// This must be defined BEFORE the authenticateJWT() middleware
vendorsRouter.delete('/me/parts/:partId', async (req: AuthenticatedRequest, res) => {
  try {
    const { partId } = req.params;
    
    console.log('[DeleteVendorPart] ========================================');
    console.log('[DeleteVendorPart] Deleting part:', partId);
    console.log('[DeleteVendorPart] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API to delete the part
      const externalResponse = await ExternalApiAdapter.callExternalApi(
        `/api/vendors/me/parts/${partId}`,
        token,
        'DELETE'
      );
      
      console.log('[DeleteVendorPart] ========== EXTERNAL API RESPONSE ==========');
      console.log('[DeleteVendorPart] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[DeleteVendorPart] ================================================');
      console.log('[DeleteVendorPart] ✓ Returning external API response');

      // Return external API response
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

// Require auth for all vendor routes BELOW this point
vendorsRouter.use(authenticateJWT());

// GET /api/vendors/me
vendorsRouter.get('/me', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) {
      return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });
    }

    const vendor = await VendorModel.findById(req.user.vendorId).lean();
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Compute stats from assignments (basic version)
    const totalJobs = await JobAssignmentModel.countDocuments({ vendorId: req.user.vendorId });
    const completedJobs = await JobAssignmentModel.countDocuments({ vendorId: req.user.vendorId, status: 'completed' });
    const averageRating = null; // placeholder, not tracked currently

    return res.json({
      success: true,
      data: {
        id: String(vendor._id),
        name: vendor.name,
        phoneNumber: (vendor as any).phone || null,
        email: (vendor as any).email || null,
        serviceAreas: (vendor as any).serviceAreas || (vendor as any).zipCodes || [],
        appliances: (vendor as any).appliances || [],
        isActive: vendor.isActive !== false,
        createdAt: (vendor as any).createdAt || null,
        stats: { totalJobs, completedJobs, averageRating },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch vendor' });
  }
});

// PATCH /api/vendors/me
// Update vendor profile fields: phone, serviceAreas, appliances, available
vendorsRouter.patch('/me', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });

    const { phone, serviceAreas, appliances, available } = req.body || {};
    const updates: any = {};
    if (typeof phone === 'string') updates.phone = phone;
    if (Array.isArray(serviceAreas)) updates.serviceAreas = serviceAreas;
    if (Array.isArray(appliances)) updates.appliances = appliances;
    if (typeof available === 'boolean') updates.available = available;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    await VendorModel.updateOne({ _id: req.user.vendorId }, { $set: updates });
    const vendor = await VendorModel.findById(req.user.vendorId).lean();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    // Stats (same as GET /me)
    const totalJobs = await JobAssignmentModel.countDocuments({ vendorId: req.user.vendorId });
    const completedJobs = await JobAssignmentModel.countDocuments({ vendorId: req.user.vendorId, status: 'completed' });
    const averageRating = null;

    return res.json({
      success: true,
      data: {
        id: String(vendor._id),
        name: vendor.name,
        phoneNumber: (vendor as any).phone || null,
        serviceAreas: (vendor as any).serviceAreas || [],
        appliances: (vendor as any).appliances || [],
        available: (vendor as any).available !== false,
        isActive: vendor.isActive !== false,
        createdAt: (vendor as any).createdAt || null,
        stats: { totalJobs, completedJobs, averageRating },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to update vendor profile' });
  }
});

// Mapping helper (kept local to this file)
function mapToJobDTO(doc: any) {
  const soNumber = doc.soNumber || doc.raw?.SO_NO || `SO-${String(doc._id).slice(-6)}`;
  const customerName: string | undefined = doc.customerName || doc.raw?.CUS_NM || undefined;
  let firstName: string | undefined = customerName;
  let lastName: string | undefined = undefined;
  if (customerName && customerName.includes(' ')) {
    const parts = String(customerName).split(/\s+/);
    firstName = parts.shift();
    lastName = parts.join(' ') || undefined;
  }
  return {
    id: String(doc._id),
    soNumber,
    customerName: firstName || customerName || null,
    customerLastName: lastName || null,
    customerCity: doc.customerCity || doc.raw?.CUS_CTY_NM || null,
    customerState: doc.customerState || doc.raw?.CUS_ST_CD || null,
    customerZip: doc.customerZip || doc.raw?.ZIP_CD || doc.raw?.CN_ZIP_PC || null,
    applianceType: doc.applianceType || doc.raw?.HS_SP_CD || doc.raw?.SPECIALTY || null,
    serviceDescription: doc.serviceDescription || doc.raw?.SVC_RQ_DS || doc.raw?.REPAIR_TYPE || null,
    scheduledDate: doc.scheduledDate || (doc.raw?.SVC_SCH_DT ? new Date(doc.raw.SVC_SCH_DT) : null),
    scheduledTimeWindow: doc.scheduledTimeWindow || null,
    priority: doc.priority || 'medium',
    status: doc.status || 'available',
  };
}

// GET /api/vendors/me/dashboard
// Returns KPI-style metrics for the vendor dashboard
vendorsRouter.get('/me/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });

    const vendor = await VendorModel.findById(req.user.vendorId).lean();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const vendorId = req.user.vendorId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      activeOrders,
      acceptedOrders,
      availableOrders,
    ] = await Promise.all([
      // Active: total orders for this vendor where scheduledDate is today or later
      JobModel.countDocuments({ vendorId, scheduledDate: { $gte: startOfToday } }),
      // Accepted: vendor's accepted assignments
      JobAssignmentModel.countDocuments({ vendorId, status: 'assigned' }),
      // Available: open jobs not yet assigned (global)
      JobModel.countDocuments({ status: /^available$/i }),
    ]);

    const receivedOrders = activeOrders; // per request, same as active for now
    const problemOrders = 0; // per request, always 0

    const safeDiv = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
    // Percentages should be relative to the sum of all displayed segments
    const segmentTotal = activeOrders + acceptedOrders + receivedOrders + problemOrders;
    const pieBreakdown = [
      { key: 'active', count: activeOrders, percent: safeDiv(activeOrders, segmentTotal) },
      { key: 'accepted', count: acceptedOrders, percent: safeDiv(acceptedOrders, segmentTotal) },
      { key: 'received', count: receivedOrders, percent: safeDiv(receivedOrders, segmentTotal) },
      { key: 'problem', count: problemOrders, percent: safeDiv(problemOrders, segmentTotal) },
    ];

    return res.json({
      success: true,
      data: {
        date: new Date().toISOString(),
        greetingName: vendor.name || null,
        totals: { serviceOrders: receivedOrders, availableOrders },
        kpis: {
          activeOrders,
          acceptedOrders,
          receivedOrders,
          problemOrders,
        },
        chart: {
          total: receivedOrders,
          segments: pieBreakdown,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load dashboard' });
  }
});
