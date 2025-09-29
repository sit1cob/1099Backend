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
  scheduledDate: { type: Date },
  applianceType: { type: String },
  applianceCode: { type: String },
  manufacturerBrand: { type: String },
  serviceDescription: { type: String },
  customerType: { type: String, default: 'Residential' },
  status: { type: String, default: 'available' },
  requiredSkills: [{ type: String }],
  serviceProvider: { type: String },
  productCategory: { type: String },
  priority: { type: String, default: 'medium' },
  vendorId: { type: Types.ObjectId, ref: 'Vendor' },
}, { timestamps: true });

export const JobModel = mongoose.models.Job || mongoose.model('Job', JobSchema);
