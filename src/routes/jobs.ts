import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { VendorModel } from '../models/vendor';
import { OrderModel } from '../models/order';
import { JobModel } from '../models/job';
import { JobAssignmentModel } from '../models/jobAssignment';
import { UserModel } from '../models/user';
import { sendMulticast, chunk } from '../services/fcm';
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
    status: doc.status || 'available',
    vendorId: doc.vendorId ? String(doc.vendorId) : null,
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

// POST /api/jobs
// Create a new job (use this to trigger creation logs locally). Auth required.
jobsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    // Basic auth guard
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const body = req.body || {};
    if (!body.soNumber) {
      return res.status(400).json({ success: false, message: 'soNumber is required' });
    }

    const doc = await JobModel.create({
      soNumber: String(body.soNumber),
      serviceUnitNumber: body.serviceUnitNumber,
      serviceLocation: body.serviceLocation,
      customerName: body.customerName,
      customerAddress: body.customerAddress,
      customerCity: body.customerCity,
      customerState: body.customerState,
      customerZip: body.customerZip,
      customerPhone: body.customerPhone,
      customerAltPhone: body.customerAltPhone,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
      scheduledTimeWindow: typeof body.scheduledTimeWindow === 'string' ? body.scheduledTimeWindow : undefined,
      applianceType: body.applianceType,
      applianceCode: body.applianceCode,
      manufacturerBrand: body.manufacturerBrand,
      serviceDescription: typeof body.serviceDescription === 'string' ? body.serviceDescription : undefined,
      customerType: body.customerType,
      status: body.status || 'available',
      requiredSkills: Array.isArray(body.requiredSkills) ? body.requiredSkills : undefined,
      serviceProvider: body.serviceProvider,
      productCategory: body.productCategory,
      priority: body.priority || 'medium',
      vendorId: body.vendorId && mongoose.isValidObjectId(body.vendorId) ? new mongoose.Types.ObjectId(body.vendorId) : undefined,
    });

    // Fire-and-forget: send FCM notifications to all users with tokens
    (async () => {
      try {
        const users = await UserModel.find({ lastFcmToken: { $exists: true, $ne: '' } }).select('lastFcmToken').lean();
        const tokenSet = new Set<string>();
        for (const u of users as any[]) {
          const t = (u as any).lastFcmToken as string | undefined;
          if (t && t.trim()) tokenSet.add(t.trim());
        }
        const tokens = Array.from(tokenSet);

        const title = 'New job created';
        const bodyText = `${doc.soNumber || 'SO'} in ${doc.customerCity || 'your area'}`;
        const data = {
          type: 'new_job',
          jobId: String(doc._id),
          soNumber: String(doc.soNumber || ''),
          city: String(doc.customerCity || ''),
        } as any;

        const previewTokens = tokens.slice(0, 5);
        console.log('[JobCreate] Preparing notification (lastFcmToken only)', {
          tokensTotal: tokens.length,
          tokensPreview: previewTokens,
          message: { title, body: bodyText, data },
        });
        // Pretty-print just the FCM payload details
        console.log('[Notify] FCM payload (jobs)', JSON.stringify({ title, body: bodyText, data }, null, 2));
        // Print all FCM tokens as requested
        console.log('[JobCreate] All FCM tokens:', tokens);

        let success = 0, failure = 0, batches = 0;
        for (const batch of chunk(tokens, 500)) {
          batches += 1;
          console.log(`[JobCreate] Sending batch ${batches} size=${batch.length}`);
          const res = await sendMulticast(batch, { title, body: bodyText, data });
          console.log(`[JobCreate] Batch ${batches} result`, { successCount: res.successCount, failureCount: res.failureCount });
          success += res.successCount || 0;
          failure += res.failureCount || 0;
        }
        console.log(`[JobCreate] Notification summary tokens=${tokens.length}, batches=${batches}, success=${success}, failure=${failure}`);
      } catch (e) {
        console.error('[JobCreate] Notification error:', e);
      }
    })();

    return res.status(201).json({ success: true, data: mapToJobDTO(doc), message: 'Job created' });
  } catch (err: any) {
    if (String(err?.message || '').includes('duplicate key')) {
      return res.status(409).json({ success: false, message: 'soNumber already exists' });
    }
    return res.status(500).json({ success: false, message: err?.message || 'Failed to create job' });
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

    // Ensure the job exists either in jobs or orders (legacy)
    const job = await JobModel.findById(jobObjectId).lean();
    const order = job ? null : await OrderModel.findById(jobObjectId).lean();
    if (!job && !order) return res.status(404).json({ success: false, message: 'Job not found' });

    const { vendorNotes, action } = (req.body || {}) as { vendorNotes?: string; action?: string };
    const normalizedAction = (action || 'accept').toLowerCase();
    if (!['accept', 'decline'].includes(normalizedAction)) {
      return res.status(400).json({ success: false, message: "action must be 'accept' or 'decline'" });
    }

    // Prevent duplicate claim by same vendor; if exists, treat as idempotent and ensure job/order reflects assignment
    const existing = await JobAssignmentModel.findOne({ jobId: jobObjectId, vendorId: req.user.vendorId }).lean();
    if (existing) {
      if (job) {
        await JobModel.updateOne({ _id: jobObjectId }, { $set: { vendorId: req.user.vendorId, status: 'assigned' } });
      } else if (order) {
        try {
          await OrderModel.updateOne({ _id: jobObjectId }, { $set: { vendorId: req.user.vendorId, status: 'assigned' } as any });
        } catch {
          await OrderModel.updateOne({ _id: jobObjectId }, { $set: { vendorId: req.user.vendorId } as any });
        }
      }
      return res.status(200).json({
        success: true,
        message: 'Job already claimed by this vendor',
        data: {
          assignmentId: String(existing._id),
          jobId: String(existing.jobId),
          vendorId: String(existing.vendorId),
          status: 'assigned',
          claimedAt: new Date(existing.assignedAt || existing.createdAt || Date.now()).toISOString(),
        },
      });
    }

    const payload: any = {
      jobId: jobObjectId,
      vendorId: req.user.vendorId,
      status: normalizedAction === 'accept' ? 'assigned' : 'declined',
      vendorNotes,
      action: normalizedAction,
    };
    const assignment = await JobAssignmentModel.create(payload);

    // Reflect claim on the Job document if it exists there
    if (job) {
      await JobModel.updateOne({ _id: jobObjectId }, { $set: { vendorId: req.user.vendorId, status: 'assigned' } });
    } else if (order) {
      // Legacy path: reflect assignment on orders collection
      try {
        await OrderModel.updateOne({ _id: jobObjectId }, { $set: { vendorId: req.user.vendorId, status: 'assigned' } as any });
      } catch {
        // Some legacy orders may not have a status field; at least persist vendorId
        await OrderModel.updateOne({ _id: jobObjectId }, { $set: { vendorId: req.user.vendorId } as any });
      }
    }

    return res.status(201).json({
      success: true,
      message: normalizedAction === 'accept' ? 'Job successfully claimed' : 'Job declined',
      data: {
        assignmentId: String(assignment._id),
        jobId: String(assignment.jobId),
        vendorId: String(assignment.vendorId),
        status: assignment.status,
        claimedAt: assignment.assignedAt?.toISOString?.() || new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to claim job' });
  }
});
