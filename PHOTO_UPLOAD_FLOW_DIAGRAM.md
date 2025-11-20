# Photo Upload Flow - Visual Diagram

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHOTO UPLOAD FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Client     │
│ (Mobile/Web) │
└──────┬───────┘
       │
       │ Step 1: Request Upload Tokens
       │ POST /api/assignments/1102/photo-upload-tokens
       │ Headers: Authorization: Bearer TOKEN
       │ Body: {
       │   "files": [
       │     {"fileName": "photo.png", "mimeType": "image/png"}
       │   ]
       │ }
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        YOUR BACKEND (WRAPPER API)                           │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  1. Extract Token from Authorization Header                        │    │
│  │     ✓ Extract: "Bearer TOKEN" → "TOKEN"                           │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  2. Validate Request (NEW!)                                        │    │
│  │     ✓ Check: Token exists                                         │    │
│  │     ✓ Check: files array exists and not empty                     │    │
│  │     ✓ Check: Each file has fileName and mimeType                  │    │
│  │     ✗ If validation fails → Return 400/401 with helpful message   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  3. Forward to External API                                        │    │
│  │     → ExternalApiAdapter.callExternalApi()                        │    │
│  │     → POST https://external-api.com/api/assignments/1102/...      │    │
│  │     → Headers: Authorization: Bearer TOKEN                         │    │
│  │     → Body: Same as received                                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ HTTP Request with Token
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL API (Replit)                                │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  1. Validate JWT Token                                             │    │
│  │     ✓ Verify signature                                            │    │
│  │     ✓ Check expiration                                            │    │
│  │     ✓ Check permissions                                           │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  2. Generate S3 Signed URLs                                        │    │
│  │     → For each file in request                                    │    │
│  │     → Generate unique key: jobs/XXX/parts/UUID.ext                │    │
│  │     → Create AWS signature                                        │    │
│  │     → Create upload policy                                        │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  3. Return Response                                                │    │
│  │     {                                                              │    │
│  │       "success": true,                                            │    │
│  │       "data": {                                                   │    │
│  │         "tokens": [{                                              │    │
│  │           "token": "uuid",                                        │    │
│  │           "uploadUrl": "https://s3...",                          │    │
│  │           "uploadFields": {                                       │    │
│  │             "key": "jobs/XXX/parts/UUID.png",                    │    │
│  │             "Policy": "...",                                     │    │
│  │             "X-Amz-Signature": "..."                            │    │
│  │           }                                                       │    │
│  │         }]                                                        │    │
│  │       }                                                           │    │
│  │     }                                                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ Response with S3 URLs
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        YOUR BACKEND (WRAPPER API)                           │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  4. Transform Response                                             │    │
│  │     → Add convenience fields:                                     │    │
│  │       • url: Full S3 URL                                          │    │
│  │       • imageUrl: Same as url                                     │    │
│  │       • photoToken: Copy of token                                 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  5. Return to Client                                               │    │
│  │     {                                                              │    │
│  │       "success": true,                                            │    │
│  │       "data": {                                                   │    │
│  │         "tokens": [{                                              │    │
│  │           "token": "uuid",                                        │    │
│  │           "uploadUrl": "https://s3...",                          │    │
│  │           "uploadFields": {...},                                 │    │
│  │           "url": "https://s3.../jobs/XXX/parts/UUID.png",       │    │
│  │           "imageUrl": "https://s3.../jobs/XXX/parts/UUID.png",  │    │
│  │           "photoToken": "uuid"                                   │    │
│  │         }]                                                        │    │
│  │       }                                                           │    │
│  │     }                                                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ Response with Tokens
                               │
                               ▼
┌──────────────┐
│   Client     │
│              │
│  Save:       │
│  • photoToken│
│  • uploadUrl │
│  • uploadFields
└──────┬───────┘
       │
       │ Step 2: Upload Photo to S3 (Direct)
       │ POST https://s3.amazonaws.com/...
       │ Content-Type: multipart/form-data
       │ Body: {
       │   ...uploadFields (all fields),
       │   file: <binary data>
       │ }
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AMAZON S3                                         │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  1. Verify Signature                                               │    │
│  │     ✓ Check X-Amz-Signature                                       │    │
│  │     ✓ Check Policy                                                │    │
│  │     ✓ Check expiration                                            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  2. Store File                                                     │    │
│  │     → Save to: jobs/XXX/parts/UUID.png                            │    │
│  │     → Set permissions                                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  3. Return Success                                                 │    │
│  │     → 204 No Content (success)                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ 204 No Content
                               │
                               ▼
┌──────────────┐
│   Client     │
│              │
│  Photo       │
│  uploaded!   │
└──────┬───────┘
       │
       │ Step 3: Create Part with Photo Token
       │ POST /api/assignments/1102/parts
       │ Headers: Authorization: Bearer TOKEN
       │ Body: {
       │   "brand": "Samsung",
       │   "partNumber": "12345",
       │   "photoTokens": ["uuid-from-step-1"]
       │ }
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        YOUR BACKEND (WRAPPER API)                           │
│                                                                             │
│  → Forward to External API                                                 │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL API (Replit)                                │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  1. Validate Token & photoTokens                                   │    │
│  │  2. Create Part Record                                             │    │
│  │  3. Associate Photos with Part                                     │    │
│  │  4. Return Part Data with Photo URLs                               │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────┐
│   Client     │
│              │
│  Part        │
│  created!    │
└──────────────┘

```

## 🎯 Key Points

### 1. **Three Separate Steps**
   - **Step 1**: Get upload tokens (your backend → external API)
   - **Step 2**: Upload to S3 (client → S3 directly)
   - **Step 3**: Create part (your backend → external API)

### 2. **Your Backend is a Wrapper**
   - Validates requests before forwarding
   - Adds convenience fields to responses
   - Provides better error messages
   - Logs all operations

### 3. **Direct S3 Upload**
   - Photos never go through your backend
   - Reduces server load
   - Faster uploads
   - Uses signed URLs for security

### 4. **Token Flow**
   ```
   JWT Token (Authorization)
      ↓
   Used for authentication
      ↓
   Get Photo Tokens
      ↓
   Photo Tokens (UUID)
      ↓
   Used to reference uploaded photos
      ↓
   Create Part with Photo Tokens
   ```

## 🔐 Security Flow

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       │ JWT Token (from login)
       │
       ▼
┌─────────────────────────────────────────┐
│  Your Backend                           │
│  • Doesn't validate JWT                 │
│  • Just passes it through               │
└──────┬──────────────────────────────────┘
       │
       │ JWT Token (forwarded)
       │
       ▼
┌─────────────────────────────────────────┐
│  External API                           │
│  • Validates JWT                        │
│  • Checks permissions                   │
│  • Generates S3 signed URLs             │
└──────┬──────────────────────────────────┘
       │
       │ S3 Signed URLs (time-limited)
       │
       ▼
┌─────────────────────────────────────────┐
│  Client                                 │
│  • Uses signed URLs to upload           │
└──────┬──────────────────────────────────┘
       │
       │ Upload with signed URL
       │
       ▼
┌─────────────────────────────────────────┐
│  Amazon S3                              │
│  • Validates signature                  │
│  • Stores file                          │
└─────────────────────────────────────────┘
```

## 📊 Data Flow

### Request Data
```
Client Request Body:
{
  "files": [
    {"fileName": "photo.png", "mimeType": "image/png"}
  ]
}
    ↓
Your Backend: (validates, forwards)
    ↓
External API: (generates tokens)
    ↓
Your Backend: (transforms, adds fields)
    ↓
Client Response:
{
  "success": true,
  "data": {
    "tokens": [{
      "token": "uuid",
      "uploadUrl": "https://s3...",
      "uploadFields": {...},
      "url": "https://s3.../path",
      "imageUrl": "https://s3.../path",
      "photoToken": "uuid"
    }]
  }
}
```

## 🚨 Error Flow

```
Client → Your Backend
         ↓
    Validation Error?
         ↓
    ┌────┴────┐
    │   Yes   │   No
    ↓         ↓
Return 400    Forward to External API
with helpful  ↓
message       External API Error?
              ↓
         ┌────┴────┐
         │   Yes   │   No
         ↓         ↓
    Return 500    Transform & Return
    with error    Success Response
    message
```

## 💡 Why This Design?

### Advantages:
1. ✅ **Separation of Concerns**: Your backend handles validation, external API handles business logic
2. ✅ **Scalability**: Direct S3 upload reduces backend load
3. ✅ **Security**: Time-limited signed URLs, JWT validation at external API
4. ✅ **Flexibility**: Easy to add caching, rate limiting, or other middleware
5. ✅ **Maintainability**: Clear separation between wrapper and external API

### Trade-offs:
1. ⚠️ **Extra Hop**: Request goes through your backend first
2. ⚠️ **Dependency**: Relies on external API availability
3. ⚠️ **Complexity**: Three-step process instead of one

## 🎓 Understanding the Pattern

This is a **Proxy Pattern** with **Transformation**:

```
┌─────────────────────────────────────────┐
│         Proxy Pattern                   │
│                                         │
│  Client → Proxy → Real Service         │
│           ↓                             │
│      • Validates                        │
│      • Transforms                       │
│      • Logs                             │
│      • Caches (optional)                │
└─────────────────────────────────────────┘
```

Your implementation adds:
- ✅ Request validation
- ✅ Response transformation
- ✅ Better error messages
- ✅ Comprehensive logging
