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

// GET /api/assignments/:id/details
// Comprehensive assignment details with all related information
assignmentsRouter.get('/:id/details', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid assignment id' });
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const assignment = await JobAssignmentModel.findById(id).lean();
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (String(assignment.vendorId) !== String(req.user.vendorId)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    // Fetch job details
    const jobDoc = await getJobDoc(new mongoose.Types.ObjectId(assignment.jobId));
    
    // Fetch parts
    const parts = await PartModel.find({ assignmentId: new mongoose.Types.ObjectId(id) })
      .sort({ createdAt: -1 })
      .lean();

    // Format response with all details
    const response = {
      assignment: {
        id: String(assignment._id),
        jobId: String(assignment.jobId),
        vendorId: String(assignment.vendorId),
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        confirmedAt: assignment.confirmedAt,
        arrivedAt: assignment.arrivedAt,
        completedAt: assignment.completedAt,
        completionNotes: assignment.completionNotes,
        vendorNotes: assignment.vendorNotes,
        notes: assignment.notes,
        customerSignature: assignment.customerSignature,
        laborHours: assignment.laborHours,
        totalPartsCost: assignment.totalPartsCost,
        totalLaborCost: assignment.totalLaborCost,
        totalCost: assignment.totalCost,
        action: assignment.action,
        customerNotHome: assignment.customerNotHome || {
          status: false,
          reason: null,
          imageUrl: null,
          additionalNote: null,
          recordedAt: null,
        },
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
      },
      job: jobDoc ? {
        id: String(jobDoc._id),
        soNumber: jobDoc.soNumber,
        customerName: jobDoc.customerName,
        customerAddress: jobDoc.customerAddress,
        customerCity: jobDoc.customerCity,
        customerState: jobDoc.customerState,
        customerZip: jobDoc.customerZip,
        customerPhone: jobDoc.customerPhone,
        customerAltPhone: jobDoc.customerAltPhone,
        customerEmail: jobDoc.customerEmail,
        scheduledDate: jobDoc.scheduledDate,
        scheduledTimeWindow: jobDoc.scheduledTimeWindow,
        applianceType: jobDoc.applianceType,
        applianceCode: jobDoc.applianceCode,
        manufacturerBrand: jobDoc.manufacturerBrand,
        serviceDescription: jobDoc.serviceDescription,
        productInfoUpdate: jobDoc.productInfoUpdate || {
          productLine: null,
          brand: null,
          modelNumber: null,
          serialNumber: null,
          issue: null,
          imageUrl: null,
        },
        status: jobDoc.status,
        priority: jobDoc.priority,
      } : null,
      parts: parts.map((part: any) => ({
        id: String(part._id),
        partNumber: part.partNumber,
        partName: part.partName,
        quantity: part.quantity,
        unitCost: part.unitCost,
        totalCost: part.totalCost,
        part_status: part.part_status,
        notes: part.notes,
        createdAt: part.createdAt,
        updatedAt: part.updatedAt,
      })),
      summary: {
        totalParts: parts.length,
        totalPartsCost: parts.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0),
        hasCustomerNotHome: assignment.customerNotHome?.status || false,
      },
    };

    return res.json({ success: true, data: response });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch assignment details' });
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

    // Business rule: when client sends 'arrived', persist status as 'arrived'
    if (status) {
      const normalized = String(status).toLowerCase();
      assignment.status = normalized === 'arrived' ? 'arrived' : status;
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

    // Mirror status onto underlying Job/Order document
    try {
      const normalizedNow = (status || assignment.status || '').toString().toLowerCase();
      if (normalizedNow === 'arrived') {
        // Set job/order status to 'arrived' when tech arrives
        await JobModel.updateOne({ _id: new mongoose.Types.ObjectId(String(assignment.jobId)) }, { $set: { status: 'arrived' } }).catch(() => {});
        await OrderModel.updateOne({ _id: new mongoose.Types.ObjectId(String(assignment.jobId)) }, { $set: { status: 'arrived' } } as any).catch(() => {});
      } else if (normalizedNow === 'completed') {
        await JobModel.updateOne({ _id: new mongoose.Types.ObjectId(String(assignment.jobId)) }, { $set: { status: 'completed' } });
        await OrderModel.updateOne({ _id: new mongoose.Types.ObjectId(String(assignment.jobId)) }, { $set: { status: 'completed' } } as any).catch(() => {});
      }
    } catch {}

    // Optional invoice stub when completed
    const invoice = assignment.status === 'completed' || String(status || '').toLowerCase() === 'completed'
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

    const { partNumber, partName, quantity, unitCost, part_status, notes } = req.body || {};

    const created = await PartModel.create({
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
      jobId: new mongoose.Types.ObjectId(assignment.jobId),
      partNumber,
      partName,
      quantity,
      unitCost,
      part_status,
      notes,
      addedByUserId: req.user?.id && mongoose.isValidObjectId(String(req.user.id)) ? new mongoose.Types.ObjectId(String(req.user.id)) : undefined,
    });

    return res.status(201).json({ success: true, data: { id: String(created._id), assignmentId, partNumber, partName, quantity, unitCost, totalCost: created.totalCost, part_status: (created as any).part_status, addedAt: created.createdAt } });
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

// DELETE /api/assignments/:assignmentId/parts/:partId
// Delete a specific part from an assignment
assignmentsRouter.delete('/:assignmentId/parts/:partId', async (req: AuthenticatedRequest, res) => {
  try {
    const { assignmentId, partId } = req.params;
    if (!mongoose.isValidObjectId(assignmentId)) return res.status(400).json({ success: false, message: 'Invalid assignmentId' });
    if (!mongoose.isValidObjectId(partId)) return res.status(400).json({ success: false, message: 'Invalid partId' });
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    // Verify assignment belongs to vendor
    const assignment = await JobAssignmentModel.findById(assignmentId).lean();
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (String(assignment.vendorId) !== String(req.user.vendorId)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });

    // Find and verify part belongs to this assignment
    const part = await PartModel.findById(partId).lean();
    if (!part) return res.status(404).json({ success: false, message: 'Part not found' });
    if (String(part.assignmentId) !== String(assignmentId)) {
      return res.status(400).json({ success: false, message: 'Part does not belong to this assignment' });
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

// PUT /api/assignments/:id/schedule
// Request to reschedule an assignment
assignmentsRouter.put('/:id/schedule', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid assignment id' });
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const assignment = await JobAssignmentModel.findById(id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (String(assignment.vendorId) !== String(req.user.vendorId)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const { newScheduledDate, newTimeWindow, rescheduleReason, vendorNotes } = req.body || {};

    // Validate required fields
    if (!newScheduledDate) {
      return res.status(400).json({ success: false, message: 'newScheduledDate is required' });
    }

    // Update the related job's scheduled date and time window
    try {
      const updateData: any = {
        scheduledDate: new Date(newScheduledDate),
      };
      
      if (newTimeWindow) {
        updateData.scheduledTimeWindow = newTimeWindow;
      }

      await JobModel.updateOne(
        { _id: new mongoose.Types.ObjectId(String(assignment.jobId)) },
        { $set: updateData }
      );
    } catch (jobUpdateErr) {
      console.error('Failed to update job schedule:', jobUpdateErr);
      return res.status(500).json({ success: false, message: 'Failed to update job schedule' });
    }

    // Update assignment notes with reschedule information
    const rescheduleNote = `Rescheduled to ${newScheduledDate}${newTimeWindow ? ` (${newTimeWindow})` : ''}. Reason: ${rescheduleReason || 'Not specified'}`;
    const updatedNotes = assignment.notes 
      ? `${assignment.notes}\n${rescheduleNote}` 
      : rescheduleNote;

    assignment.notes = updatedNotes;
    
    if (vendorNotes) {
      assignment.vendorNotes = vendorNotes;
    }

    await assignment.save();

    // Fetch updated job details
    const updatedJob = await JobModel.findById(assignment.jobId).lean();

    return res.json({
      success: true,
      message: 'Assignment rescheduled successfully',
      data: {
        assignmentId: String(assignment._id),
        jobId: String(assignment.jobId),
        newScheduledDate: updatedJob?.scheduledDate,
        newTimeWindow: updatedJob?.scheduledTimeWindow,
        rescheduleReason: rescheduleReason || null,
        notes: assignment.notes,
        vendorNotes: assignment.vendorNotes,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to reschedule assignment' });
  }
});

// PATCH /api/assignments/:assignmentId/customer-not-home
// Update customer not home status with reason, image, and notes
assignmentsRouter.patch('/:assignmentId/customer-not-home', async (req: AuthenticatedRequest, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.isValidObjectId(assignmentId)) return res.status(400).json({ success: false, message: 'Invalid assignmentId' });
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    // Verify assignment belongs to vendor
    const assignment = await JobAssignmentModel.findById(assignmentId);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (String(assignment.vendorId) !== String(req.user.vendorId)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const { status, reason, imageUrl, additionalNote } = req.body || {};

    // Validate that at least status is provided
    if (status === undefined) {
      return res.status(400).json({ success: false, message: 'status field is required' });
    }

    // Update customer not home object
    assignment.customerNotHome = {
      status: Boolean(status),
      reason: reason || undefined,
      imageUrl: imageUrl || undefined,
      additionalNote: additionalNote || undefined,
      recordedAt: status ? new Date() : undefined,
    } as any;

    await assignment.save();

    // Also update job status if customer not home
    if (status) {
      try {
        await JobModel.updateOne(
          { _id: new mongoose.Types.ObjectId(String(assignment.jobId)) },
          { $set: { status: 'customer_not_home' } }
        );
      } catch (jobUpdateErr) {
        console.error('Failed to update job status:', jobUpdateErr);
      }
    }

    return res.json({
      success: true,
      message: 'Customer not home status updated successfully',
      data: {
        assignmentId: String(assignment._id),
        customerNotHome: {
          status: assignment.customerNotHome.status,
          reason: assignment.customerNotHome.reason,
          imageUrl: assignment.customerNotHome.imageUrl,
          additionalNote: assignment.customerNotHome.additionalNote,
          recordedAt: assignment.customerNotHome.recordedAt,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to update customer not home status' });
  }
});
