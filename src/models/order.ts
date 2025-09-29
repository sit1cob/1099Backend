import mongoose, { Schema } from 'mongoose';

const OrderSchema = new Schema({
  raw: { type: Schema.Types.Mixed, required: true },
  soNumber: { type: String, index: true },
  serviceUnitNumber: { type: String },
  vendorName: { type: String, index: true },
  customerCity: { type: String },
  customerState: { type: String },
  customerZip: { type: String, index: true },
  scheduledDate: { type: Date, index: true },
  sourceFile: { type: String },
  importedAt: { type: Date, default: () => new Date() },
}, { timestamps: true, strict: false });

export const OrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema);
