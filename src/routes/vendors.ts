import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { VendorModel } from '../models/vendor';
import { OrderModel } from '../models/order';
import { JobAssignmentModel } from '../models/jobAssignment';
import { JobModel } from '../models/job';
import { PartModel } from '../models/part';
import mongoose from 'mongoose';

export const vendorsRouter = Router();

// Require auth for all vendor routes
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
        isActive: vendor.isActive !== false,
        createdAt: (vendor as any).createdAt || null,
        stats: { totalJobs, completedJobs, averageRating },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch vendor' });
  }
});

// POST /api/vendors/me/parts
// Add one or more parts to an assignment that belongs to the authenticated vendor
vendorsRouter.post('/me/parts', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { assignmentId, parts, partNumber, partName, quantity, unitCost, notes } = req.body || {};
    if (!assignmentId || !mongoose.isValidObjectId(String(assignmentId))) {
      return res.status(400).json({ success: false, message: 'assignmentId is required' });
    }

    // Ensure assignment exists and belongs to this vendor
    const assignment = await JobAssignmentModel.findById(assignmentId).lean();
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (String(assignment.vendorId) !== String(req.user.vendorId)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const toCreate: Array<{ assignmentId: string; jobId: string; partNumber?: string; partName?: string; quantity?: number; unitCost?: number; notes?: string }> = [];

    const base = {
      assignmentId: String(assignmentId),
      jobId: String(assignment.jobId),
    } as any;

    if (Array.isArray(parts) && parts.length > 0) {
      for (const p of parts) {
        toCreate.push({
          ...base,
          partNumber: p.partNumber,
          partName: p.partName,
          quantity: p.quantity,
          unitCost: p.unitCost,
          notes: p.notes,
        });
      }
    } else {
      // Single part payload
      toCreate.push({
        ...base,
        partNumber,
        partName,
        quantity,
        unitCost,
        notes,
      });
    }

    // Filter out completely empty items (no identifiers)
    const filtered = toCreate.filter((p) => p.partNumber || p.partName);
    if (filtered.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid parts to add' });
    }

    const created = await PartModel.insertMany(filtered);
    const items = created.map((c) => ({
      id: String(c._id),
      assignmentId: String(c.assignmentId),
      jobId: String(c.jobId),
      partNumber: c.partNumber,
      partName: c.partName,
      quantity: c.quantity,
      unitCost: c.unitCost,
      totalCost: (c as any).totalCost,
      notes: (c as any).notes,
      addedAt: (c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt || new Date().toISOString())),
    }));

    if (items.length === 1) {
      return res.status(201).json({ success: true, data: items[0] });
    }
    return res.status(201).json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to add parts' });
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

// GET /api/vendors/me/jobs
// Returns jobs for this vendor (same shape as /api/jobs/available), with pagination
vendorsRouter.get('/me/jobs', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(400).json({ success: false, message: 'User is not linked to a vendor' });
    const vendor = await VendorModel.findById(req.user.vendorId).lean();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));

    // Prefer jobs collection filtered by vendorId and assigned status
    const filter: any = { vendorId: req.user.vendorId, status: /^assigned$/i };
    let total = await JobModel.countDocuments(filter);
    let docs = await JobModel.find(filter)
      .sort({ scheduledDate: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Fallback to legacy orders if no jobs
    if (total === 0) {
      // Legacy: try vendorId first if present on orders, else fallback to vendorName
      const orderFilter: any = { $or: [ { vendorId: req.user.vendorId }, { vendorName: vendor.name } ] };
      total = await OrderModel.countDocuments(orderFilter);
      docs = await OrderModel.find(orderFilter)
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
    const base = receivedOrders || activeOrders || 1;
    const pieBreakdown = [
      { key: 'active', count: activeOrders, percent: safeDiv(activeOrders, base) },
      { key: 'accepted', count: acceptedOrders, percent: safeDiv(acceptedOrders, base) },
      { key: 'received', count: receivedOrders, percent: safeDiv(receivedOrders, base) },
      { key: 'problem', count: problemOrders, percent: safeDiv(problemOrders, base) },
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
