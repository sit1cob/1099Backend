import { Schema, model } from 'mongoose';

export interface IPartPhoto {
  partId: number;
  photoId?: number; // ID from external API if available
  photoUrl: string;
  description?: string;
  uploadedAt: Date;
  uploadedBy?: string; // vendor username or ID
}

const partPhotoSchema = new Schema<IPartPhoto>(
  {
    partId: { type: Number, required: true, index: true },
    photoId: { type: Number },
    photoUrl: { type: String, required: true },
    description: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String },
  },
  { timestamps: true }
);

// Index for efficient queries
partPhotoSchema.index({ partId: 1, uploadedAt: -1 });

export const PartPhotoModel = model<IPartPhoto>('PartPhoto', partPhotoSchema);
