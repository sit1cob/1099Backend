import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedbackAnswer {
  questionId: string;
  answer: string | number;
}

export interface IFeedbackMetadata {
  appVersion: string;
  deviceModel: string;
  osVersion: string;
  timestamp: string;
}

export interface IFeedback extends Document {
  userId: mongoose.Types.ObjectId;
  metadata: IFeedbackMetadata;
  answers: IFeedbackAnswer[];
  submittedAt: Date;
}

const FeedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    metadata: {
      appVersion: { type: String, required: true },
      deviceModel: { type: String, required: true },
      osVersion: { type: String, required: true },
      timestamp: { type: String, required: true }
    },
    answers: [
      {
        questionId: { type: String, required: true },
        answer: { type: Schema.Types.Mixed, required: true }
      }
    ],
    submittedAt: { type: Date, default: () => new Date() }
  },
  {
    timestamps: true
  }
);

// Add indexes for better query performance
FeedbackSchema.index({ submittedAt: -1 });
FeedbackSchema.index({ 'metadata.appVersion': 1 });

export const FeedbackModel = mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);
