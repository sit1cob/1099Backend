import mongoose, { Schema, Types } from 'mongoose';

const ApiAnalyticsSchema = new Schema(
  {
    userId: { type: String, default: null }, // Store as string to support both ObjectId and numeric IDs from tokens
    vendorId: { type: String, default: null }, // Store as string to support both ObjectId and numeric IDs from tokens
    sessionId: { type: String, default: null },
    loginUsername: { type: String, default: null },
    loginPassword: { type: String, default: null },
    method: { type: String, required: true },
    url: { type: String, required: true },
    route: { type: String, default: null },
    statusCode: { type: Number, required: true },
    success: { type: Boolean, required: true },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    elapsedMs: { type: Number, default: null },
    requestBody: { type: Schema.Types.Mixed },
    errorMessage: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// Delete existing model from both caches to force schema refresh
if (mongoose.models.ApiAnalytics) {
  delete mongoose.models.ApiAnalytics;
}
if (mongoose.connection?.models?.ApiAnalytics) {
  delete mongoose.connection.models.ApiAnalytics;
}

export const ApiAnalyticsModel = mongoose.model('ApiAnalytics', ApiAnalyticsSchema);

