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

// DELETE /api/vendors/me/parts/:partId
// Delete a part that was previously added by the authenticated vendor
vendorsRouter.delete('/me/parts/:partId', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { partId } = req.params;
    if (!mongoose.isValidObjectId(partId)) {
      return res.status(400).json({ success: false, message: 'Invalid part id' });
    }

    // Find the part
    const part = await PartModel.findById(partId).lean();
    if (!part) return res.status(404).json({ success: false, message: 'Part not found' });

    // Verify the part belongs to an assignment owned by this vendor
    const assignment = await JobAssignmentModel.findById(part.assignmentId).lean();
    if (!assignment) return res.status(404).json({ success: false, message: 'Associated assignment not found' });
    if (String(assignment.vendorId) !== String(req.user.vendorId)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to delete this part' });
    }

    // Delete the part
    await PartModel.deleteOne({ _id: partId });

    return res.json({ 
      success: true, 
      message: 'Part deleted successfully',
      data: { 
        id: String(part._id),
        partNumber: part.partNumber,
        partName: part.partName
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to delete part' });
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
