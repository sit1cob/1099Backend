# Auto Photo Token Retrieval Feature

## Overview

This feature automatically saves and retrieves photo tokens when users upload photos and create parts, eliminating the need to manually pass `photoTokens` in the create part request.

## How It Works

### 1. Upload Photos
When a user uploads photos via `/api/assignments/:assignmentId/upload-photos`:

```javascript
POST /api/assignments/1641/upload-photos
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
  photos: [file1.jpg]
  photos: [file2.png]
```

**What Happens:**
1. Photos are uploaded to S3
2. Photo tokens are returned in response
3. **NEW:** Tokens are automatically saved to MongoDB with:
   - `assignmentId`: The assignment ID
   - `userId`: Extracted from JWT token
   - `token`: The photo token from external API
   - `consumed`: false (available for use)
   - `expiresAt`: 24 hours from upload

**Response:**
```json
{
  "success": true,
  "message": "Uploaded 1 of 1 photos",
  "data": {
    "uploads": [
      {
        "fileName": "photo.jpg",
        "token": "92d8096e-300d-4211-a9e4-a2e2268b60a2",
        "photoToken": "92d8096e-300d-4211-a9e4-a2e2268b60a2",
        "url": "https://s3.amazonaws.com/...",
        "success": true
      }
    ]
  }
}
```

### 2. Create Part (Without Photo Tokens)

When creating a part, you can now **omit** the `photoTokens` field:

```javascript
POST /api/assignments/1641/parts
Content-Type: application/json
Authorization: Bearer <token>

{
  "brand": "LG",
  "applianceType": "Dishwasher",
  "partNumber": "LG10822278",
  "partDescription": "Door Latch Assembly",
  "quantity": 1,
  "disposition": "installed"
  // photoTokens: NOT REQUIRED!
}
```

**What Happens:**
1. System checks if `photoTokens` is provided in request
2. If **NOT provided**, system queries MongoDB for:
   - Unconsumed tokens (`consumed: false`)
   - For this assignment (`assignmentId: 1641`)
   - For this user (from JWT)
   - Not expired (`expiresAt > now`)
3. Auto-retrieved tokens are added to request
4. Part is created with photos
5. Tokens are marked as `consumed: true`

**Console Output:**
```
[AddPart] No photoTokens provided, checking database...
[AddPart] ✓ Auto-retrieved 2 photo tokens from database
[AddPart] Tokens: ["92d8096e-300d-4211-a9e4-a2e2268b60a2", "..."]
[AddPart] ✓ Marked 2 tokens as consumed
```

### 3. Create Part (With Photo Tokens)

You can still manually provide `photoTokens` if needed:

```javascript
POST /api/assignments/1641/parts
Content-Type: application/json
Authorization: Bearer <token>

{
  "brand": "LG",
  "partNumber": "LG10822278",
  "quantity": 1,
  "disposition": "installed",
  "photoTokens": [
    "92d8096e-300d-4211-a9e4-a2e2268b60a2"
  ]
}
```

**What Happens:**
1. System uses the provided `photoTokens`
2. Database is not queried
3. Tokens are still marked as consumed after success

## Database Schema

### PhotoToken Collection

```typescript
{
  token: string;              // UUID from external API
  assignmentId: string;       // Assignment ID
  userId: string;             // User ID from JWT
  fileName: string;           // Original file name
  url: string;                // S3 URL
  imageUrl: string;           // S3 image URL
  consumed: boolean;          // false = available, true = used
  createdAt: Date;            // When uploaded
  expiresAt: Date;            // 24 hours from upload
}
```

**Indexes:**
- `token` (unique)
- `assignmentId`
- `userId`
- `consumed`
- `expiresAt`
- Compound: `(assignmentId, userId, consumed)`

## Use Cases

### Use Case 1: Mobile App - Simplified Flow

**Before (Manual Token Management):**
```javascript
// Step 1: Upload photos
const uploadResponse = await uploadPhotos(assignmentId, photos);
const tokens = uploadResponse.data.uploads.map(u => u.photoToken);

// Step 2: Store tokens in app state
setPhotoTokens(tokens);

// Step 3: Create part with tokens
await createPart(assignmentId, {
  ...partData,
  photoTokens: tokens  // Must remember to pass
});
```

**After (Automatic):**
```javascript
// Step 1: Upload photos
await uploadPhotos(assignmentId, photos);

// Step 2: Create part (no tokens needed!)
await createPart(assignmentId, {
  ...partData
  // photoTokens automatically retrieved!
});
```

### Use Case 2: Multi-Part Workflow

User uploads 5 photos, then creates 2 parts:

```javascript
// Upload 5 photos
POST /api/assignments/1641/upload-photos
// → 5 tokens saved to DB

// Create first part (uses all 5 photos)
POST /api/assignments/1641/parts
{
  "partNumber": "PART-001",
  // photoTokens auto-retrieved: all 5 tokens
}
// → 5 tokens marked as consumed

// Create second part (no photos available)
POST /api/assignments/1641/parts
{
  "partNumber": "PART-002",
  // No unconsumed tokens found
}
// → Part created without photos
```

### Use Case 3: Selective Token Usage

User wants to use specific tokens:

```javascript
// Upload 3 photos
POST /api/assignments/1641/upload-photos
// → Tokens: [A, B, C] saved

// Create part with only token A
POST /api/assignments/1641/parts
{
  "partNumber": "PART-001",
  "photoTokens": ["A"]  // Manually specify
}
// → Token A consumed, B and C still available

// Create another part (auto-uses B and C)
POST /api/assignments/1641/parts
{
  "partNumber": "PART-002"
  // Auto-retrieves tokens B and C
}
```

## Benefits

### For Mobile Apps
- ✅ Simpler API integration
- ✅ No state management for tokens
- ✅ Fewer API calls
- ✅ Better UX (less user input)

### For Backend
- ✅ Automatic token lifecycle management
- ✅ Prevents token reuse
- ✅ Built-in expiration (24 hours)
- ✅ User-scoped (can't use other users' tokens)

### For Users
- ✅ Upload photos once
- ✅ Create multiple parts without re-uploading
- ✅ No manual token copying

## Security Features

### 1. User Isolation
Tokens are scoped to the user who uploaded them:
```javascript
const storedTokens = await PhotoTokenModel.find({
  assignmentId,
  userId: String(userId),  // Only this user's tokens
  consumed: false
});
```

### 2. Assignment Isolation
Tokens are scoped to specific assignments:
```javascript
const storedTokens = await PhotoTokenModel.find({
  assignmentId: "1641",  // Only for this assignment
  userId: String(userId),
  consumed: false
});
```

### 3. Expiration
Tokens expire after 24 hours:
```javascript
expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)

// Query only non-expired tokens
expiresAt: { $gt: new Date() }
```

### 4. One-Time Use
Tokens are marked as consumed after use:
```javascript
await PhotoTokenModel.updateMany(
  { token: { $in: photoTokens } },
  { $set: { consumed: true } }
);
```

## Error Handling

### Upload Fails to Save Tokens
```javascript
try {
  await PhotoTokenModel.insertMany(photoTokenDocs);
} catch (dbErr) {
  console.error('Failed to save tokens:', dbErr.message);
  // Upload still succeeds, tokens just not auto-saved
}
```

### Retrieval Fails
```javascript
try {
  const storedTokens = await PhotoTokenModel.find({...});
} catch (dbErr) {
  console.error('Failed to retrieve tokens:', dbErr.message);
  // Part creation continues without tokens
}
```

### Mark as Consumed Fails
```javascript
try {
  await PhotoTokenModel.updateMany({...}, { consumed: true });
} catch (dbErr) {
  console.error('Failed to mark tokens as consumed:', dbErr.message);
  // Part creation still succeeds
}
```

## Cleanup Strategy

### Manual Cleanup
Delete expired tokens:
```javascript
await PhotoTokenModel.deleteMany({
  expiresAt: { $lt: new Date() }
});
```

### Scheduled Cleanup (Recommended)
Add a cron job to clean up expired tokens daily:
```javascript
// In server.ts or separate worker
import cron from 'node-cron';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const result = await PhotoTokenModel.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  console.log(`Cleaned up ${result.deletedCount} expired photo tokens`);
});
```

## Testing

### Test 1: Upload and Auto-Retrieve
```bash
# 1. Upload photos
curl -X POST http://localhost:5010/api/assignments/1641/upload-photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "photos=@photo1.jpg"

# 2. Create part without photoTokens
curl -X POST http://localhost:5010/api/assignments/1641/parts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "LG",
    "partNumber": "TEST123",
    "quantity": 1,
    "disposition": "installed"
  }'

# Expected: Part created with photo automatically attached
```

### Test 2: Manual Token Override
```bash
# 1. Upload photos
curl -X POST http://localhost:5010/api/assignments/1641/upload-photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "photos=@photo1.jpg"
# Response: { "uploads": [{ "photoToken": "abc-123" }] }

# 2. Create part with specific token
curl -X POST http://localhost:5010/api/assignments/1641/parts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "LG",
    "partNumber": "TEST123",
    "quantity": 1,
    "disposition": "installed",
    "photoTokens": ["abc-123"]
  }'

# Expected: Uses provided token, not auto-retrieved
```

### Test 3: Token Consumption
```bash
# 1. Upload photo
curl -X POST http://localhost:5010/api/assignments/1641/upload-photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "photos=@photo1.jpg"

# 2. Create first part (consumes token)
curl -X POST http://localhost:5010/api/assignments/1641/parts \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"brand": "LG", "partNumber": "PART1", "quantity": 1}'

# 3. Create second part (no tokens available)
curl -X POST http://localhost:5010/api/assignments/1641/parts \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"brand": "LG", "partNumber": "PART2", "quantity": 1}'

# Expected: First part has photo, second part has no photo
```

## Migration Notes

### Existing Code Compatibility
This feature is **100% backward compatible**:
- Old code that passes `photoTokens` still works
- New code can omit `photoTokens` for auto-retrieval
- No breaking changes

### Database Migration
No migration needed - collection is created automatically on first use.

## Monitoring

### Useful Queries

**Check unconsumed tokens:**
```javascript
db.phototokens.find({ consumed: false }).count()
```

**Check expired tokens:**
```javascript
db.phototokens.find({ expiresAt: { $lt: new Date() } }).count()
```

**Tokens by user:**
```javascript
db.phototokens.aggregate([
  { $group: { _id: "$userId", count: { $sum: 1 } } }
])
```

**Tokens by assignment:**
```javascript
db.phototokens.aggregate([
  { $group: { _id: "$assignmentId", count: { $sum: 1 } } }
])
```

## Troubleshooting

### Issue: Tokens not auto-retrieved
**Possible causes:**
1. Tokens expired (check `expiresAt`)
2. Tokens already consumed (check `consumed: true`)
3. Wrong assignment ID
4. Wrong user (tokens belong to different user)

**Debug:**
```javascript
// Check database
db.phototokens.find({
  assignmentId: "1641",
  consumed: false,
  expiresAt: { $gt: new Date() }
})
```

### Issue: Tokens not marked as consumed
**Possible causes:**
1. Part creation failed
2. Database update failed
3. Token doesn't exist in database

**Debug:**
Check server logs for:
```
[AddPart] ✓ Marked X tokens as consumed
```

---

**Last Updated:** November 24, 2025
**Feature Version:** 1.0
**Status:** Production Ready ✅
