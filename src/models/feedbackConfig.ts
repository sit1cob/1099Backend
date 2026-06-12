import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedbackQuestion {
  id: string;
  question: string;
  type: 'rating' | 'text' | 'boolean' | 'multiple_choice';
  options?: string[]; // For multiple choice questions
  required?: boolean;
  order?: number;
}

export interface IFeedbackConfig extends Document {
  title: string;
  description?: string;
  questions: IFeedbackQuestion[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackConfigSchema = new Schema(
  {
    title: { type: String, required: true, default: 'User Feedback Survey' },
    description: { type: String },
    questions: [
      {
        id: { type: String, required: true },
        question: { type: String, required: true },
        type: { 
          type: String, 
          required: true, 
          enum: ['rating', 'text', 'boolean', 'multiple_choice'],
          default: 'text'
        },
        options: [{ type: String }],
        required: { type: Boolean, default: true },
        order: { type: Number, default: 0 }
      }
    ],
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

// Index for finding active config
FeedbackConfigSchema.index({ isActive: 1 });

export const FeedbackConfigModel = mongoose.models.FeedbackConfig || mongoose.model<IFeedbackConfig>('FeedbackConfig', FeedbackConfigSchema);
