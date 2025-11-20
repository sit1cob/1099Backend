# Photo Upload Tokens API - Wrapper Implementation Guide

## Overview

The photo upload tokens API is already implemented as a **wrapper** that proxies requests to the external API. This document explains how to use it correctly.

## Current Implementation

### Endpoint
```
POST /api/assignments/:assignmentId/photo-upload-tokens
```

### Location
- **File**: `src/routes/assignments.ts` (lines 202-270)
- **Service**: `src/services/externalApiAdapter.ts`

### How It Works

The wrapper:
1. ✅ Extracts the JWT token from the `Authorization` header
2. ✅ Validates that a token is provided
3. ✅ Forwards the request body to the external API
4. ✅ Adds S3 URLs to the response for convenience
5. ✅ Returns the transformed response to the client

```typescript
// Current implementation (simplified)
assignmentsRouter.post('/:assignmentId/photo-upload-tokens', async (req, res) => {
  // Extract token from Authorization header
  const token = req.headers.authorization?.substring(7);
  
  // Call external API
  const externalResponse = await ExternalApiAdapter.callExternalApi(
    `/api/assignments/${assignmentId}/photo-upload-tokens`,
    token,
    'POST',
    req.body  // Forward entire request body
  );
  
  // Transform response to add S3 URLs
  // Return to client
});
```

## How to Use the Wrapper API

### Step 1: Get Photo Upload Tokens

**Request:**
```bash
POST https://your-api.com/api/assignments/1102/photo-upload-tokens
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "files": [
    {
      "fileName": "Screenshot 2025-10-15 at 6.40.10 PM.png",
      "mimeType": "image/png"
    },
    {
      "fileName": "part-photo-2.jpg",
      "mimeType": "image/jpeg"
    }
  ]
}
```

**Important Notes:**
- ✅ The `files` array is **required** and must contain at least one file
- ✅ Each file must have `fileName` and `mimeType`
- ✅ The `assignmentId` in the URL must be valid
- ✅ The JWT token must be valid and authorized for this assignment

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "token": "d2d12db9-3fbb-4840-8973-a55ecbb701b5",
        "uploadUrl": "https://parts-images-pr-us-east-2.s3.us-east-2.amazonaws.com/",
        "uploadFields": {
          "Content-Type": "image/png",
          "bucket": "parts-images-pr-us-east-2",
          "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
          "X-Amz-Credential": "AKIA.../20251118/us-east-2/s3/aws4_request",
          "X-Amz-Date": "20251118T131031Z",
          "key": "jobs/13048356/parts/b670206b-06c7-4e58-917a-8cd71105c9fb.png",
          "Policy": "...",
          "X-Amz-Signature": "..."
        },
        "url": "https://parts-images-pr-us-east-2.s3.us-east-2.amazonaws.com/jobs/13048356/parts/b670206b-06c7-4e58-917a-8cd71105c9fb.png",
        "imageUrl": "https://parts-images-pr-us-east-2.s3.us-east-2.amazonaws.com/jobs/13048356/parts/b670206b-06c7-4e58-917a-8cd71105c9fb.png",
        "photoToken": "d2d12db9-3fbb-4840-8973-a55ecbb701b5"
      }
    ]
  }
}
```

### Step 2: Upload Photos to S3 (Client-Side)

Use the `uploadUrl` and `uploadFields` from the response to upload directly to S3:

```javascript
// Example using fetch API
async function uploadPhotoToS3(file, tokenData) {
  const formData = new FormData();
  
  // Add all upload fields first
  Object.entries(tokenData.uploadFields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  // Add the file last
  formData.append('file', file);
  
  const response = await fetch(tokenData.uploadUrl, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('S3 upload failed');
  }
  
  return tokenData.photoToken;
}
```

### Step 3: Create Part with Photo Tokens

After uploading to S3, create the part with the photo tokens:

```bash
POST https://your-api.com/api/assignments/1102/parts
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "brand": "Samsung",
  "applianceType": "Cooktop",
  "partNumber": "ccccc",
  "serialNumber": "ccccc",
  "quantity": 1,
  "partType": "local",
  "notes": "ccccc",
  "photoTokens": ["d2d12db9-3fbb-4840-8973-a55ecbb701b5"]
}
```

## Common Errors and Solutions

### Error: "Files array is required with at least one file"

**Cause:** The request body is missing the `files` array or it's empty.

**Solution:**
```json
// ❌ Wrong
{}

// ❌ Wrong
{
  "files": []
}

// ✅ Correct
{
  "files": [
    {
      "fileName": "photo.png",
      "mimeType": "image/png"
    }
  ]
}
```

### Error: "No token provided"

**Cause:** Missing or invalid Authorization header.

**Solution:**
```bash
# ❌ Wrong
curl -X POST https://api.com/api/assignments/1102/photo-upload-tokens

# ✅ Correct
curl -X POST https://api.com/api/assignments/1102/photo-upload-tokens \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Error: 401 Unauthorized from External API

**Cause:** The JWT token is invalid or expired.

**Solution:**
1. Login again to get a fresh token
2. Ensure you're using the correct token for the assignment

## Complete Example Flow

### 1. Login to Get Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "vendor@example.com",
  "password": "password123",
  "role": "registered_user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

### 2. Get Photo Upload Tokens

```bash
POST /api/assignments/1102/photo-upload-tokens
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "files": [
    {
      "fileName": "part-photo.png",
      "mimeType": "image/png"
    }
  ]
}
```

### 3. Upload to S3 (JavaScript Example)

```javascript
const file = document.getElementById('fileInput').files[0];
const tokenData = response.data.tokens[0];

const formData = new FormData();
Object.entries(tokenData.uploadFields).forEach(([key, value]) => {
  formData.append(key, value);
});
formData.append('file', file);

await fetch(tokenData.uploadUrl, {
  method: 'POST',
  body: formData,
});
```

### 4. Create Part with Photo Token

```bash
POST /api/assignments/1102/parts
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "brand": "Samsung",
  "applianceType": "Cooktop",
  "partNumber": "12345",
  "quantity": 1,
  "partType": "local",
  "photoTokens": ["d2d12db9-3fbb-4840-8973-a55ecbb701b5"]
}
```

## Testing with Postman

### Collection Setup

1. **Create Environment Variables:**
   - `baseUrl`: `https://your-api.com`
   - `token`: (will be set after login)
   - `assignmentId`: `1102`

2. **Login Request:**
   ```
   POST {{baseUrl}}/api/auth/login
   Body (JSON):
   {
     "username": "vendor@example.com",
     "password": "password123",
     "role": "registered_user"
   }
   
   Test Script:
   pm.environment.set("token", pm.response.json().data.accessToken);
   ```

3. **Get Photo Upload Tokens:**
   ```
   POST {{baseUrl}}/api/assignments/{{assignmentId}}/photo-upload-tokens
   Headers:
   - Authorization: Bearer {{token}}
   
   Body (JSON):
   {
     "files": [
       {
         "fileName": "test-photo.png",
         "mimeType": "image/png"
       }
     ]
   }
   
   Test Script:
   const response = pm.response.json();
   if (response.success && response.data.tokens.length > 0) {
     pm.environment.set("photoToken", response.data.tokens[0].photoToken);
     pm.environment.set("uploadUrl", response.data.tokens[0].uploadUrl);
   }
   ```

4. **Upload to S3:**
   ```
   POST {{uploadUrl}}
   Body (form-data):
   - Add all fields from uploadFields
   - Add file with key "file"
   ```

5. **Create Part:**
   ```
   POST {{baseUrl}}/api/assignments/{{assignmentId}}/parts
   Headers:
   - Authorization: Bearer {{token}}
   
   Body (JSON):
   {
     "brand": "Samsung",
     "applianceType": "Cooktop",
     "partNumber": "12345",
     "quantity": 1,
     "partType": "local",
     "photoTokens": ["{{photoToken}}"]
   }
   ```

## Supported MIME Types

The following MIME types are commonly supported:
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/heic`
- `image/heif`

## Request Body Schema

### Photo Upload Tokens Request

```typescript
interface PhotoUploadTokensRequest {
  files: Array<{
    fileName: string;    // Original file name with extension
    mimeType: string;    // MIME type (e.g., "image/png")
  }>;
}
```

### Photo Upload Tokens Response

```typescript
interface PhotoUploadTokensResponse {
  success: boolean;
  data: {
    tokens: Array<{
      token: string;                    // Photo token for later reference
      uploadUrl: string;                // S3 upload URL
      uploadFields: {                   // Fields to include in S3 upload
        'Content-Type': string;
        bucket: string;
        'X-Amz-Algorithm': string;
        'X-Amz-Credential': string;
        'X-Amz-Date': string;
        key: string;
        Policy: string;
        'X-Amz-Signature': string;
      };
      url: string;                      // Final S3 URL (added by wrapper)
      imageUrl: string;                 // Same as url (added by wrapper)
      photoToken: string;               // Same as token (added by wrapper)
    }>;
  };
}
```

## Architecture Diagram

```
┌─────────────┐
│   Client    │
│  (Mobile/   │
│   Web App)  │
└──────┬──────┘
       │
       │ 1. POST /api/assignments/:id/photo-upload-tokens
       │    Authorization: Bearer TOKEN
       │    Body: { files: [...] }
       │
       ▼
┌─────────────────────────────────────────────────┐
│         Your Backend (Wrapper API)              │
│  ┌───────────────────────────────────────────┐  │
│  │  assignmentsRouter.post(                  │  │
│  │    '/:assignmentId/photo-upload-tokens'   │  │
│  │  )                                        │  │
│  └───────────────┬───────────────────────────┘  │
│                  │                               │
│                  │ 2. Extract token              │
│                  │ 3. Forward request            │
│                  │                               │
│  ┌───────────────▼───────────────────────────┐  │
│  │  ExternalApiAdapter.callExternalApi()     │  │
│  │  - Adds Authorization header              │  │
│  │  - Calls external API                     │  │
│  │  - Returns response                       │  │
│  └───────────────┬───────────────────────────┘  │
└──────────────────┼───────────────────────────────┘
                   │
                   │ 4. POST to external API
                   │    Authorization: Bearer TOKEN
                   │    Body: { files: [...] }
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         External API (Replit)                   │
│  - Validates token                              │
│  - Generates S3 signed URLs                     │
│  - Returns upload tokens                        │
└───────────────┬─────────────────────────────────┘
                │
                │ 5. Returns tokens with S3 URLs
                │
                ▼
┌─────────────────────────────────────────────────┐
│         Your Backend (Wrapper API)              │
│  - Transforms response                          │
│  - Adds convenience fields (url, imageUrl)      │
│  - Returns to client                            │
└───────────────┬─────────────────────────────────┘
                │
                │ 6. Returns transformed response
                │
                ▼
┌─────────────┐
│   Client    │
│  - Receives tokens                              │
│  - Uploads to S3 directly                       │
│  - Creates part with photoTokens                │
└─────────────┘
```

## Key Points

1. **Already a Wrapper**: The API is already implemented as a wrapper. You don't need to create a new wrapper.

2. **No Changes Needed**: The current implementation is correct and follows best practices.

3. **Request Format**: The error you're seeing is because the request body must include a `files` array.

4. **Direct S3 Upload**: Photos are uploaded directly to S3 from the client, not through your backend.

5. **Token Passthrough**: Your backend doesn't validate the JWT token; it passes it to the external API for validation.

## Troubleshooting

### Check if the wrapper is working:

```bash
# 1. Check if the endpoint exists
curl -X POST https://your-api.com/api/assignments/1102/photo-upload-tokens \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":[{"fileName":"test.png","mimeType":"image/png"}]}'

# 2. Check the logs
# Look for: [PhotoUploadTokens] messages in your backend logs
```

### Common Issues:

1. **Wrong URL**: Make sure you're using `/api/assignments/:assignmentId/photo-upload-tokens` (not `/api/jobs/...`)
2. **Missing files array**: Always include `{"files": [...]}`
3. **Invalid token**: Get a fresh token by logging in again
4. **Wrong assignment ID**: Use the correct assignment ID from your database

## Related Documentation

- `PARTS_PHOTO_UPLOAD_FLOW.md` - Detailed flow documentation
- `src/routes/assignments.ts` - Implementation code
- `src/services/externalApiAdapter.ts` - External API adapter service
