import mongoose, { Schema } from 'mongoose';

const VendorSchema = new Schema({
  name: { type: String, required: true, index: true },
  phone: { type: String },
  zipCodes: [{ type: String }],
  skillSets: [{ type: String }],
  // New canonical fields
  serviceAreas: [{ type: String }],
  appliances: [{ type: String }],
  available: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const VendorModel = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
