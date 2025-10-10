import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { VendorModel } from '../models/vendor';
import { OrderModel } from '../models/order';
import { JobModel } from '../models/job';
import { JobAssignmentModel } from '../models/jobAssignment';
import { UserModel } from '../models/user';
import { sendMulticast, chunk } from '../services/fcm';
import mongoose from 'mongoose';
import { PartModel } from '../models/part';
import { ExternalApiAdapter } from '../services/externalApiAdapter';

export const jobsRouter = Router();

// Helper to sync job from external API to MongoDB
async function syncJobToMongo(externalJob: any): Promise<any> {
  try {
    if (!externalJob || !externalJob.id) {
      console.log('[SyncJob] No valid job data to sync');
      return null;
    }

    const jobId = externalJob.id;
    
    // Check if job already exists in MongoDB
    const existingJob = await JobModel.findOne({ 
      $or: [
        { _id: mongoose.isValidObjectId(jobId) ? new mongoose.Types.ObjectId(jobId) : null },
        { soNumber: externalJob.soNumber }
      ]
    }).lean();

    const jobData = {
      soNumber: externalJob.soNumber || `SO-${jobId}`,
      customerName: externalJob.customerName || externalJob.firstName,
      customerAddress: externalJob.customerAddress || externalJob.address,
      customerCity: externalJob.customerCity || externalJob.city,
      customerState: externalJob.customerState || externalJob.state,
      customerZip: externalJob.customerZip || externalJob.zipCode,
      customerPhone: externalJob.customerPhone || externalJob.phoneNumber,
      customerEmail: externalJob.customerEmail || externalJob.email,
      applianceType: externalJob.applianceType || externalJob.appliance,
      manufacturerBrand: externalJob.manufacturerBrand || externalJob.brand,
      serviceDescription: externalJob.serviceDescription || externalJob.description,
      scheduledDate: externalJob.scheduledDate ? new Date(externalJob.scheduledDate) : undefined,
      scheduledTimeWindow: externalJob.scheduledTimeWindow || externalJob.timeWindow,
      priority: externalJob.priority || 'medium',
      status: externalJob.status || 'available',
      vendorId: externalJob.vendorId && mongoose.isValidObjectId(externalJob.vendorId) 
        ? new mongoose.Types.ObjectId(externalJob.vendorId) 
        : undefined,
    };

    if (existingJob) {
      // Update existing job
      await JobModel.updateOne({ _id: existingJob._id }, { $set: jobData });
      console.log('[SyncJob] Updated existing job:', existingJob._id);
      return await JobModel.findById(existingJob._id).lean();
    } else {
      // Create new job with the external ID if it's a valid ObjectId
      const createData = mongoose.isValidObjectId(jobId)
        ? { ...jobData, _id: new mongoose.Types.ObjectId(jobId) }
        : jobData;
      
      const newJob = await JobModel.create(createData);
      console.log('[SyncJob] Created new job:', newJob._id);
      return newJob;
    }
  } catch (err: any) {
    console.error('[SyncJob] Failed to sync job to MongoDB:', err.message);
    return null;
  }
}

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
    customerAddress: doc.customerAddress || null,
    customerCity: doc.customerCity || doc.raw?.CUS_CTY_NM || null,
    customerState: doc.customerState || doc.raw?.CUS_ST_CD || null,
    customerZip: doc.customerZip || doc.raw?.ZIP_CD || doc.raw?.CN_ZIP_PC || null,
    applianceType: doc.applianceType || doc.raw?.HS_SP_CD || doc.raw?.SPECIALTY || null,
    manufacturerBrand: doc.manufacturerBrand || null,
    serviceDescription: doc.serviceDescription || doc.raw?.SVC_RQ_DS || doc.raw?.REPAIR_TYPE || null,
    scheduledDate: doc.scheduledDate || (doc.raw?.SVC_SCH_DT ? new Date(doc.raw.SVC_SCH_DT) : null),
    scheduledTimeWindow: doc.scheduledTimeWindow || null,
    priority: doc.priority || 'medium',
    status: doc.status || 'available',
    vendorId: doc.vendorId ? String(doc.vendorId) : null,
    assignmentId: doc.assignmentId ? String(doc.assignmentId) : null,
    customerPhone: doc.customerPhone || null,
    customerEmail: doc.customerEmail || null,
    productInfoUpdate: {
      productLine: (doc.productInfoUpdate && doc.productInfoUpdate.productLine) || null,
      brand: (doc.productInfoUpdate && doc.productInfoUpdate.brand) || null,
      modelNumber: (doc.productInfoUpdate && doc.productInfoUpdate.modelNumber) || null,
      serialNumber: (doc.productInfoUpdate && doc.productInfoUpdate.serialNumber) || null,
      issue: (doc.productInfoUpdate && doc.productInfoUpdate.issue) || null,
      imageUrl: (doc.productInfoUpdate && doc.productInfoUpdate.imageUrl) || null,
    },
  };
}

// GET /api/jobs/available
// Call external API first, fallback to MongoDB if needed
jobsRouter.get('/available', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[JobsAvailable] ========================================');
    console.log('[JobsAvailable] Calling EXTERNAL API...');
    console.log('[JobsAvailable] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API
      const externalResponse = await ExternalApiAdapter.callExternalApi('/api/jobs/available', token, 'GET');
      
      console.log('[JobsAvailable] ========== EXTERNAL API RESPONSE ==========');
      console.log('[JobsAvailable] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[JobsAvailable] ================================================');
      console.log('[JobsAvailable] ✓ Returning external API response (success or failure)');

      // Always return external API response (even if failed)
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[JobsAvailable] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'External API call failed' 
      });
    }
  } catch (err: any) {
    console.error('[JobsAvailable] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch available jobs' });
  }
});

// GET /api/jobs/:id
// Call external API first, fallback to MongoDB if needed
jobsRouter.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    console.log('[JobDetails] ========================================')
    console.log('[JobDetails] Calling EXTERNAL API for job:', id);
    console.log('[JobDetails] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API
      const externalResponse = await ExternalApiAdapter.callExternalApi(`/api/jobs/${id}`, token, 'GET');
      
      console.log('[JobDetails] ========== EXTERNAL API RESPONSE ==========');
      console.log('[JobDetails] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[JobDetails] ================================================');

      // Sync job to MongoDB if successful
      if (externalResponse.success && externalResponse.data) {
        await syncJobToMongo(externalResponse.data);
        console.log('[JobDetails] ✓ Job synced to MongoDB');
      }

      console.log('[JobDetails] ✓ Returning external API response (success or failure)');

      // Always return external API response (even if failed)
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[JobDetails] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'External API call failed' 
      });
    }
  } catch (err: any) {
    console.error('[JobDetails] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch job details' });
  }
});

// POST /api/jobs/:id/claims - NO AUTH (proxies to external API)
// This must be defined BEFORE the authenticateJWT() middleware
jobsRouter.post('/:id/claims', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    console.log('[ClaimJob] ========================================');
    console.log('[ClaimJob] Attempting to claim job:', id);
    console.log('[ClaimJob] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    // Try external API first if token exists
    if (token) {
      try {
        console.log('[ClaimJob] Calling EXTERNAL API...');
        const externalResponse = await ExternalApiAdapter.callExternalApi(
          `/api/jobs/${id}/claims`,
          token,
          'POST',
          req.body
        );
        
        console.log('[ClaimJob] ========== EXTERNAL API RESPONSE ==========');
        console.log('[ClaimJob] Response:', JSON.stringify(externalResponse, null, 2));
        console.log('[ClaimJob] ================================================');
        console.log('[ClaimJob] ✓ Returning external API response (success or failure)');

        // Always return external API response (even if failed)
        const statusCode = externalResponse.success ? 201 : (externalResponse.data?.rescheduleResult ? 200 : 400);
        return res.status(statusCode).json(externalResponse);
      } catch (extErr: any) {
        console.error('[ClaimJob] ✗ External API call failed:', extErr.message);
        
        // Return the error from external API
        return res.status(500).json({ 
          success: false, 
          message: extErr.message || 'External API call failed' 
        });
      }
    }

    // MongoDB fallback - requires authentication
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided. MongoDB fallback requires authentication.' 
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to claim job' });
  }
});

// PATCH /api/jobs/:id/product-info-update - NO AUTH (works with external API token)
// Allows vendor to update product details: productLine, brand, modelNumber, serialNumber, issue, imageUrl
// This must be defined BEFORE the authenticateJWT() middleware
jobsRouter.patch('/:id/product-info-update', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    console.log('[ProductInfoUpdate] ========================================');
    console.log('[ProductInfoUpdate] Updating product info for job:', id);
    console.log('[ProductInfoUpdate] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const { productLine, brand, modelNumber, serialNumber, issue, imageUrl } = (req.body || {}) as { 
      productLine?: string; 
      brand?: string; 
      modelNumber?: string;
      serialNumber?: string;
      issue?: string;
      imageUrl?: string 
    };
    
    if (productLine == null && brand == null && modelNumber == null && serialNumber == null && issue == null && imageUrl == null) {
      return res.status(400).json({ success: false, message: 'No fields to update. Provide productLine, brand, modelNumber, serialNumber, issue, or imageUrl.' });
    }

    // First, fetch the job from external API to ensure it exists and vendor has access
    try {
      const jobResponse = await ExternalApiAdapter.callExternalApi(`/api/jobs/${id}`, token, 'GET');
      
      if (!jobResponse.success || !jobResponse.data) {
        return res.status(404).json({ success: false, message: 'Job not found or access denied' });
      }

      // Sync job to MongoDB if not already there
      await syncJobToMongo(jobResponse.data);
      console.log('[ProductInfoUpdate] Job synced to MongoDB');

      // Update product info in MongoDB
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid job id' });
      }

      const set: any = {};
      if (typeof productLine === 'string') set['productInfoUpdate.productLine'] = productLine;
      if (typeof brand === 'string') set['productInfoUpdate.brand'] = brand;
      if (typeof modelNumber === 'string') set['productInfoUpdate.modelNumber'] = modelNumber;
      if (typeof serialNumber === 'string') set['productInfoUpdate.serialNumber'] = serialNumber;
      if (typeof issue === 'string') set['productInfoUpdate.issue'] = issue;
      if (typeof imageUrl === 'string') set['productInfoUpdate.imageUrl'] = imageUrl;

      await JobModel.updateOne({ _id: id }, { $set: set });
      const updated = await JobModel.findById(id).lean();
      
      console.log('[ProductInfoUpdate] ✓ Product info updated successfully');
      return res.json({ success: true, data: mapToJobDTO(updated) });
    } catch (extErr: any) {
      console.error('[ProductInfoUpdate] ✗ Failed to update product info:', extErr.message);
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'Failed to update product info' 
      });
    }
  } catch (err: any) {
    console.error('[ProductInfoUpdate] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to update product info' });
  }
});

// Apply authentication middleware to all routes below this point
jobsRouter.use(authenticateJWT());

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
      customerEmail: body.customerEmail,
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

    // Fire-and-forget: send FCM notifications to users for vendors matching zipcode/appliance
    (async () => {
      try {
        const zip = String(doc.customerZip || '').trim();
        const appliance = String(doc.applianceType || '').trim();
        const vendorFilter: any = {};
        if (zip) vendorFilter.serviceAreas = { $in: [new RegExp(`^${zip}$`, 'i')] };
        if (appliance) vendorFilter.appliances = { $in: [new RegExp(`^${appliance}$`, 'i')] };

        const vendors = await VendorModel.find(vendorFilter).select('_id name').lean();
        const vendorIds = vendors.map((v: any) => v._id).filter(Boolean);

        // Auto-assign if exactly one vendor matches criteria
        if (vendorIds.length === 1) {
          try {
            const chosenVendorId = vendorIds[0];
            const jobObjectId = new mongoose.Types.ObjectId(String(doc._id));
            // Create assignment as 'assigned'
            const assignment = await JobAssignmentModel.create({
              jobId: jobObjectId,
              vendorId: chosenVendorId,
              status: 'assigned',
              action: 'accept',
            } as any);
            // Reflect on Job/Order
            await JobModel.updateOne({ _id: jobObjectId }, { $set: { vendorId: chosenVendorId, status: 'assigned', assignmentId: assignment._id } });
            await OrderModel.updateOne({ _id: jobObjectId }, { $set: { vendorId: chosenVendorId, status: 'assigned', assignmentId: assignment._id } } as any).catch(() => {});
          } catch (autoErr) {
            console.warn('[JobCreate] Auto-assign failed, continuing with notifications', autoErr);
          }
        }

        const users = vendorIds.length
          ? await UserModel.find({ vendorId: { $in: vendorIds }, lastFcmToken: { $exists: true, $ne: '' } })
              .select('lastFcmToken vendorId')
              .lean()
          : [];

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
