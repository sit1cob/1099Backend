import mongoose, { Schema, Types } from 'mongoose';

const JobSchema = new Schema({
  soNumber: { type: String, required: true, unique: true, index: true },
  serviceUnitNumber: { type: String },
  serviceLocation: { type: String },
  customerName: { type: String },
  customerAddress: { type: String },
  customerCity: { type: String },
  customerState: { type: String },
  customerZip: { type: String },
  customerPhone: { type: String },
  customerAltPhone: { type: String },
  customerEmail: { type: String },
  scheduledDate: { type: Date },
  scheduledTimeWindow: { type: String },
  applianceType: { type: String },
  applianceCode: { type: String },
  manufacturerBrand: { type: String },
  serviceDescription: { type: String },
  // Nested product details provided by vendor after taking the job
  productInfoUpdate: {
    productLine: { type: String },
    brand: { type: String },
    modelNumber: { type: String },
    serialNumber: { type: String },
    issue: { type: String },
    imageUrl: { type: String },
  },
  customerType: { type: String, default: 'Residential' },
  status: { type: String, default: 'available' },
  requiredSkills: [{ type: String }],
  serviceProvider: { type: String },
  productCategory: { type: String },
  priority: { type: String, default: 'medium' },
  vendorId: { type: Types.ObjectId, ref: 'Vendor' },
  assignmentId: { type: Types.ObjectId, ref: 'JobAssignment' },
}, { timestamps: true });

// Logging: mark if doc is new in pre-save, then log in post-save
JobSchema.pre('save', function (next) {
  // @ts-expect-error attach temp flag
  this._wasNew = this.isNew;
  next();
});

JobSchema.post('save', function (doc) {
  // @ts-expect-error temp flag from pre-save
  if (this._wasNew) {
    const info = {
      id: String(doc._id),
      soNumber: (doc as any).soNumber,
      city: (doc as any).customerCity,
      state: (doc as any).customerState,
    };
    console.log('[Job] Created', info);
  }
});

// Note: save() middleware does NOT run for insertMany(). Add a dedicated hook.
JobSchema.post('insertMany', function (docs: any[]) {
  try {
    const count = Array.isArray(docs) ? docs.length : 0;
    if (!count) return;
    const preview = (docs.slice(0, 3) as any[]).map((d) => ({ id: String(d._id), soNumber: d.soNumber, city: d.customerCity }));
    console.log(`[Job] insertMany created count=${count}`, preview);
  } catch (e) {
    // best-effort logging
  }
});

export const JobModel = mongoose.models.Job || mongoose.model('Job', JobSchema);
