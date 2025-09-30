import mongoose, { Schema, Types } from 'mongoose';

export type NotificationType = 'new_job' | 'system' | 'message';

const NotificationSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true, required: true },
  title: { type: String, required: true },
  body: { type: String },
  type: { type: String, enum: ['new_job', 'system', 'message'], default: 'system', index: true },
  data: { type: Schema.Types.Mixed },
  readAt: { type: Date, index: true },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
