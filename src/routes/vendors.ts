import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { VendorModel } from '../models/vendor';
import { OrderModel } from '../models/order';
import { JobAssignmentModel } from '../models/jobAssignment';

export const vendorsRouter = Router();

// Require auth for all vendor routes
vendorsRouter.use(authenticateJWT());

// GET /api/vendors/me
vendorsRouter.get('/me', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });
    const vendor = await VendorModel.findById(req.user.vendorId).lean();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
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
        isActive: vendor.isActive !== false,
        createdAt: (vendor as any).createdAt || null,
        stats: {
          totalJobs,
          completedJobs,
          averageRating,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch vendor' });
  }
});

// GET /api/vendors/me/jobs
// Returns available jobs (orders) for this vendor, filtered by vendor name
vendorsRouter.get('/me/jobs', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });
    const vendor = await VendorModel.findById(req.user.vendorId).lean();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const vendorName = vendor.name;

    const orders = await OrderModel.find({ vendorName }).sort({ scheduledDate: -1 }).limit(1000).lean();

    // Map to DTO similar to previous API
    const data = orders.map((o) => ({
      id: String(o._id),
      soNumber: o.soNumber || o.raw?.SO_NO || `SO-${String(o._id).slice(-6)}`,
      customerCity: o.customerCity || o.raw?.CUS_CTY_NM || 'Unknown City',
      customerState: o.customerState || o.raw?.CUS_ST_CD || null,
      customerZip: o.customerZip || o.raw?.ZIP_CD || o.raw?.CN_ZIP_PC || '00000',
      scheduledDate: o.scheduledDate || (o.raw?.SVC_SCH_DT ? new Date(o.raw.SVC_SCH_DT) : null),
      applianceType: o.raw?.HS_SP_CD || o.raw?.SPECIALTY || 'General Service',
      manufacturerBrand: o.raw?.MFG_BND_NM || null,
      serviceDescription: o.raw?.SVC_RQ_DS || o.raw?.REPAIR_TYPE || null,
      status: 'available' as const,
    }));

    return res.json({ success: true, data, count: data.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch vendor jobs' });
  }
});

// GET /api/vendors/me/assignments
vendorsRouter.get('/me/assignments', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });

    const assignments = await JobAssignmentModel.find({ vendorId: req.user.vendorId }).sort({ assignedAt: -1 }).lean();

    return res.json({ success: true, data: assignments, count: assignments.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch assignments' });
  }
});
