import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { JobAssignmentModel } from '../models/jobAssignment';
import { JobModel } from '../models/job';
import { OrderModel } from '../models/order';
import { PartModel } from '../models/part';

export const assignmentsRouter = Router();
assignmentsRouter.use(authenticateJWT());

// Helper to fetch job-like doc (Job or Order)
async function getJobDoc(jobId: mongoose.Types.ObjectId) {
  const job = await JobModel.findById(jobId).lean();
  if (job) return job as any;
  const order = await OrderModel.findById(jobId).lean();
  if (order) return order as any;
  return null;
}

// GET /api/assignments
assignmentsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { status, dateFrom, dateTo } = req.query as { status?: string; dateFrom?: string; dateTo?: string };

    const query: any = { vendorId: new mongoose.Types.ObjectId(req.user.vendorId) };
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.assignedAt = {};
      if (dateFrom) query.assignedAt.$gte = new Date(dateFrom);
      if (dateTo) query.assignedAt.$lte = new Date(dateTo);
    }

    const assignments = await JobAssignmentModel.find(query).sort({ assignedAt: -1 }).lean();
    return res.json({ success: true, data: assignments, count: assignments.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch assignments' });
  }
});

// GET /api/assignments/:id
assignmentsRouter.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid assignment id' });
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const assignment = await JobAssignmentModel.findById(id).lean();
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (String(assignment.vendorId) !== String(req.user.vendorId)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const jobDoc = await getJobDoc(new mongoose.Types.ObjectId(assignment.jobId));
    const parts = await PartModel.find({ assignmentId: new mongoose.Types.ObjectId(id) }).lean();

    return res.json({ success: true, data: { ...assignment, job: jobDoc, parts, photos: [] } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch assignment' });
  }
});

// Shared handler to update/complete an assignment
async function updateAssignment(req: AuthenticatedRequest, res: any) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid assignment id' });
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const assignment = await JobAssignmentModel.findById(id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (String(assignment.vendorId) !== String(req.user.vendorId)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const {
      status,
      actualArrival,
      completedAt,
      completionNotes,
      customerSignature,
      laborHours,
      totalPartsCost,
      totalLaborCost,
      totalCost,
      notes,
    } = req.body || {};

    // Normalize status: if client sends 'arrived', keep status as 'assigned'
    // (business rule: arrival doesn't change overall state away from assigned)
    if (status) {
      const normalized = String(status).toLowerCase();
      assignment.status = normalized === 'arrived' ? 'assigned' : status;
    }
    if (actualArrival) assignment.arrivedAt = new Date(actualArrival);
    if (completedAt) assignment.completedAt = new Date(completedAt);
    if (completionNotes !== undefined) assignment.completionNotes = completionNotes;
    if (customerSignature !== undefined) (assignment as any).customerSignature = customerSignature;
    if (laborHours !== undefined) (assignment as any).laborHours = Number(laborHours);
    if (totalPartsCost !== undefined) (assignment as any).totalPartsCost = Number(totalPartsCost);
    if (totalLaborCost !== undefined) (assignment as any).totalLaborCost = Number(totalLaborCost);
    if (totalCost !== undefined) (assignment as any).totalCost = Number(totalCost);
    if (notes !== undefined) (assignment as any).notes = notes;

    await assignment.save();

    // Optional invoice stub when completed
    const invoice = status === 'completed' || assignment.status === 'completed'
      ? {
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(assignment._id).slice(-4)}`,
          totalCost: (assignment as any).totalCost || 0,
          pdfUrl: `/invoices/INV-${new Date().getFullYear()}-${String(assignment._id).slice(-4)}.pdf`,
        }
      : undefined;

    return res.json({ success: true, message: invoice ? 'Assignment completed successfully' : 'Assignment updated', data: { id: String(assignment._id), status: assignment.status, completedAt: assignment.completedAt, invoice } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to update assignment' });
  }
}

// PATCH /api/assignments/:id
assignmentsRouter.patch('/:id', updateAssignment);

// POST /api/assignments/:id (alias for update/complete)
assignmentsRouter.post('/:id', updateAssignment);

// POST /api/assignments/:assignmentId/parts
assignmentsRouter.post('/:assignmentId/parts', async (req: AuthenticatedRequest, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.isValidObjectId(assignmentId)) return res.status(400).json({ success: false, message: 'Invalid assignmentId' });
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const assignment = await JobAssignmentModel.findById(assignmentId).lean();
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (String(assignment.vendorId) !== String(req.user.vendorId)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });

    const { partNumber, partName, quantity, unitCost, notes } = req.body || {};

    const created = await PartModel.create({
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
      jobId: new mongoose.Types.ObjectId(assignment.jobId),
      partNumber,
      partName,
      quantity,
      unitCost,
      notes,
      addedByUserId: req.user?.id && mongoose.isValidObjectId(String(req.user.id)) ? new mongoose.Types.ObjectId(String(req.user.id)) : undefined,
    });

    return res.status(201).json({ success: true, data: { id: String(created._id), assignmentId, partNumber, partName, quantity, unitCost, totalCost: created.totalCost, addedAt: created.createdAt } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to add part' });
  }
});

// GET /api/assignments/:assignmentId/parts
assignmentsRouter.get('/:assignmentId/parts', async (req: AuthenticatedRequest, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.isValidObjectId(assignmentId)) return res.status(400).json({ success: false, message: 'Invalid assignmentId' });
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const assignment = await JobAssignmentModel.findById(assignmentId).lean();
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (String(assignment.vendorId) !== String(req.user.vendorId)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });

    const parts = await PartModel.find({ assignmentId: new mongoose.Types.ObjectId(assignmentId) }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: parts });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load parts' });
  }
});
