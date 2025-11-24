import mongoose, { Schema, Document } from 'mongoose';

export interface IPhotoToken extends Document {
  token: string;
  assignmentId: string;
  userId: string;
  fileName: string;
  url: string;
  imageUrl: string;
  consumed: boolean;
  createdAt: Date;
  expiresAt: Date;
}

const photoTokenSchema = new Schema<IPhotoToken>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  assignmentId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  consumed: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
});

// Compound index for efficient queries
photoTokenSchema.index({ assignmentId: 1, userId: 1, consumed: 1 });
photoTokenSchema.index({ expiresAt: 1 }); // For cleanup jobs

export const PhotoTokenModel = mongoose.model<IPhotoToken>('PhotoToken', photoTokenSchema);
