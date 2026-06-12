import mongoose, { Schema } from 'mongoose';

// Store external API responses for caching and mapping
const ExternalApiCacheSchema = new Schema({
  endpoint: { type: String, required: true, index: true }, // e.g., 'login', 'jobs', 'assignments'
  userId: { type: String, index: true }, // User identifier from external API
  username: { type: String, index: true },
  requestData: { type: Schema.Types.Mixed }, // Original request sent to external API
  externalResponse: { type: Schema.Types.Mixed, required: true }, // Raw response from external API
  mappedResponse: { type: Schema.Types.Mixed }, // Transformed response matching our API format
  externalToken: { type: String }, // Token from external API
  expiresAt: { type: Date }, // When this cache expires
}, { timestamps: true });

// Index for quick lookups
ExternalApiCacheSchema.index({ endpoint: 1, username: 1, createdAt: -1 });
ExternalApiCacheSchema.index({ externalToken: 1 });

export const ExternalApiCacheModel = mongoose.models.ExternalApiCache || mongoose.model('ExternalApiCache', ExternalApiCacheSchema);
