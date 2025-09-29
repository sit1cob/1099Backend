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
  return {
    id: String(doc._id),
    soNumber,
    customerCity: doc.customerCity || doc.raw?.CUS_CTY_NM || 'Unknown City',
    customerState: doc.customerState || doc.raw?.CUS_ST_CD || null,
    customerZip: doc.customerZip || doc.raw?.ZIP_CD || doc.raw?.CN_ZIP_PC || '00000',
    scheduledDate: doc.scheduledDate || (doc.raw?.SVC_SCH_DT ? new Date(doc.raw.SVC_SCH_DT) : null),
    applianceType: doc.applianceType || doc.raw?.HS_SP_CD || doc.raw?.SPECIALTY || 'General Service',
    manufacturerBrand: doc.manufacturerBrand || doc.raw?.MFG_BND_NM || null,
    serviceDescription: doc.serviceDescription || doc.raw?.SVC_RQ_DS || doc.raw?.REPAIR_TYPE || null,
    status: 'available' as const,
  };
}

// GET /api/jobs/available
// Pull available jobs for the authenticated vendor based on vendor name match
jobsRouter.get('/available', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });

    const vendor = await VendorModel.findById(req.user.vendorId).lean();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    // 1) Prefer jobs collection by vendorName
    const jobs = await JobModel.find({ vendorName: vendor.name })
      .sort({ scheduledDate: -1 })
      .limit(1000)
      .lean();

    if (jobs.length > 0) {
      const jobIds = jobs.map(j => j._id).filter(Boolean) as mongoose.Types.ObjectId[];
      const assignedById = jobIds.length > 0
        ? await JobAssignmentModel.find({ vendorId: req.user.vendorId, jobId: { $in: jobIds } }).select('jobId').lean()
        : [];
      const assignedSet = new Set((assignedById as any[]).map(a => String(a.jobId)));
      const availableJobs = jobs.filter(j => !assignedSet.has(String(j._id))).map(mapToJobDTO);
      return res.json({ success: true, data: availableJobs, count: availableJobs.length });
    }

    // 2) Fallback to legacy orders collection
    const orders = await OrderModel.find({ vendorName: vendor.name }).sort({ scheduledDate: -1 }).limit(1000).lean();

    const soNumbers = orders.map(o => o.soNumber).filter(Boolean);
    const assigned = soNumbers.length > 0
      ? await JobAssignmentModel.aggregate([
          { $match: { vendorId: new mongoose.Types.ObjectId(req.user.vendorId) } },
          { $lookup: { from: 'jobs', localField: 'jobId', foreignField: '_id', as: 'job' } },
          { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
          { $match: { 'job.soNumber': { $in: soNumbers } } },
          { $project: { _id: 0, soNumber: '$job.soNumber' } }
        ])
      : [];
    const assignedSet = new Set((assigned as any[]).map(a => a.soNumber));
    const available = orders.filter(o => !o.soNumber || !assignedSet.has(o.soNumber)).map(mapToJobDTO);
    return res.json({ success: true, data: available, count: available.length });
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
