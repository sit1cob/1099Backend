import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { PartModel } from '../models/part';
import { JobAssignmentModel } from '../models/jobAssignment';

export const partsRouter = Router();
partsRouter.use(authenticateJWT());

// DELETE /api/parts/:id
partsRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid part id' });
    if (!req.user?.vendorId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const part = await PartModel.findById(id).lean();
    if (!part) return res.status(404).json({ success: false, message: 'Part not found' });

    // Ensure the part belongs to an assignment of this vendor
    const assignment = await JobAssignmentModel.findById((part as any).assignmentId).lean();
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment for this part not found' });
    if (String((assignment as any).vendorId) !== String(req.user.vendorId)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    await PartModel.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    return res.json({ success: true, message: 'Part deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to delete part' });
  }
});
