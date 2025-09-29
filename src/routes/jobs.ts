import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { VendorModel } from '../models/vendor';
import { OrderModel } from '../models/order';
import { JobModel } from '../models/job';
import { JobAssignmentModel } from '../models/jobAssignment';
import mongoose from 'mongoose';

export const jobsRouter = Router();

jobsRouter.use(authenticateJWT());

// Helper to map an order/job doc to the DTO used by clients
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

// GET /api/jobs/available
// For now: return all jobs with pagination and optional filters. Later we can scope by vendor.
jobsRouter.get('/available', async (req: AuthenticatedRequest, res) => {
  try {
    // Read query params
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    const city = (req.query.city as string | undefined)?.trim();
    const applianceType = (req.query.applianceType as string | undefined)?.trim();

    const filter: Record<string, any> = {};
    if (city) filter.customerCity = new RegExp(`^${city}$`, 'i');
    if (applianceType) filter.applianceType = new RegExp(`^${applianceType}$`, 'i');

    const total = await JobModel.countDocuments(filter);
    const docs = await JobModel.find(filter)
      .sort({ scheduledDate: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const jobs = docs.map(mapToJobDTO);
    const totalPages = Math.ceil(total / pageSize) || 1;

    return res.json({
      success: true,
      data: {
        jobs,
        pagination: { page, pageSize, total, totalPages },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch available jobs' });
  }
});

// GET /api/jobs/:id
jobsRouter.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid job id' });

    let doc = await JobModel.findById(id).lean();
    if (!doc) {
      const order = await OrderModel.findById(id).lean();
      if (order) doc = order as any;
    }
    if (!doc) return res.status(404).json({ success: false, message: 'Job not found' });

    return res.json({ success: true, data: mapToJobDTO(doc) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch job' });
  }
});

// POST /api/jobs/:id/claims
// Creates a job assignment for the authenticated vendor
jobsRouter.post('/:id/claims', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (!req.user?.vendorId) return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid job id' });

    const jobObjectId = new mongoose.Types.ObjectId(id);

    // Prevent duplicate claim by same vendor
    const existing = await JobAssignmentModel.findOne({ jobId: jobObjectId, vendorId: req.user.vendorId }).lean();
    if (existing) return res.status(409).json({ success: false, message: 'Job already claimed by this vendor' });

    const assignment = await JobAssignmentModel.create({ jobId: jobObjectId, vendorId: req.user.vendorId, status: 'assigned' });

    return res.status(201).json({ success: true, data: { assignmentId: String(assignment._id) }, message: 'Job claimed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to claim job' });
  }
});
