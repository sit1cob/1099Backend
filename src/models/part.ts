import mongoose, { Schema, Types } from 'mongoose';

const PartSchema = new Schema({
  assignmentId: { type: Types.ObjectId, ref: 'JobAssignment', required: true },
  jobId: { type: Types.ObjectId, ref: 'Job', required: true },
  partNumber: { type: String },
  partName: { type: String },
  quantity: { type: Number, default: 1 },
  unitCost: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  notes: { type: String },
  addedByUserId: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });

PartSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('unitCost')) {
    const qty = Number(this.get('quantity') || 0);
    const unit = Number(this.get('unitCost') || 0);
    this.set('totalCost', Number((qty * unit).toFixed(2)));
  }
  next();
});

export const PartModel = mongoose.models.Part || mongoose.model('Part', PartSchema);
