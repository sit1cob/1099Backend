import mongoose, { Schema, Types } from 'mongoose';

const JobAssignmentSchema = new Schema({
  jobId: { type: Types.ObjectId, required: true }, // references Job or Order id
  vendorId: { type: Types.ObjectId, ref: 'Vendor', required: true },
  status: { type: String, default: 'assigned' },
  assignedAt: { type: Date, default: () => new Date() },
  confirmedAt: { type: Date },
  arrivedAt: { type: Date },
  completedAt: { type: Date },
  completionNotes: { type: String },
  vendorNotes: { type: String },
  action: { type: String, enum: ['accept', 'decline', 'assigned'], default: 'assigned' },
}, { timestamps: true });

export const JobAssignmentModel = mongoose.models.JobAssignment || mongoose.model('JobAssignment', JobAssignmentSchema);
