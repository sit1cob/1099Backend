import mongoose, { Schema, Types } from 'mongoose';

export type UserRole = 'admin' | 'registered_user' | 'guest';

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'registered_user', 'guest'], default: 'registered_user' },
  vendorId: { type: Types.ObjectId, ref: 'Vendor' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
  passwordChangedAt: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
