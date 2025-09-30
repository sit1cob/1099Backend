import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { VendorModel } from '../models/vendor';
import { OrderModel } from '../models/order';
import { JobAssignmentModel } from '../models/jobAssignment';
import { JobModel } from '../models/job';

export const vendorsRouter = Router();

// Require auth for all vendor routes
vendorsRouter.use(authenticateJWT());

// GET /api/vendors/me
vendorsRouter.get('/me', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });

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
    status: 'available' as const,
  };
}

// GET /api/vendors/me/jobs
// Returns jobs for this vendor (same shape as /api/jobs/available), with pagination
vendorsRouter.get('/me/jobs', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });
    const vendor = await VendorModel.findById(req.user.vendorId).lean();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));

    // Prefer jobs collection filtered by vendorName
    const filter = { vendorName: vendor.name } as any;
    let total = await JobModel.countDocuments(filter);
    let docs = await JobModel.find(filter)
      .sort({ scheduledDate: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Fallback to legacy orders if no jobs
    if (total === 0) {
      total = await OrderModel.countDocuments({ vendorName: vendor.name });
      docs = await OrderModel.find({ vendorName: vendor.name })
        .sort({ scheduledDate: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean() as any[];
    }

    const jobs = (docs as any[]).map(mapToJobDTO);
    const totalPages = Math.ceil(total / pageSize) || 1;

    return res.json({
      success: true,
      data: {
        jobs,
        pagination: { page, pageSize, total, totalPages },
      },
    });
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
