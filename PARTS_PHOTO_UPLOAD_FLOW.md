# Parts Photo Upload Flow - External Adapter Implementation

This document explains how the parts photo upload API flow is implemented using the external adapter.

## Overview

The parts photo upload flow consists of three main steps:
1. **Get Photo Upload Tokens** - Request signed S3 upload URLs from the external API
2. **Upload Photos to S3** - Direct upload to S3 using the signed URLs (client-side)
3. **Create Part with Photo Tokens** - Submit part data with photo tokens to associate photos with the part

## API Endpoints

All endpoints proxy requests to the external API using the `ExternalApiAdapter` service.

### 1. POST `/api/assignments/:assignmentId/photo-upload-tokens`

**Purpose**: Get signed S3 upload URLs and tokens for photo uploads.

**Request**:
```json
{
  "files": [
    {
      "fileName": "Screenshot 2025-10-15 at 6.40.10 PM.png",
      "mimeType": "image/png"
    }
  ]
}
```

**Response**:
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
          "X-Amz-Credential": "AKIA2SY2B7SUQ2PNH4NO/20251118/us-east-2/s3/aws4_request",
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

**Implementation**:
- Located in `src/routes/assignments.ts` (line 202)
- Uses `ExternalApiAdapter.callExternalApi()` to proxy the request
- Transforms the response to include S3 URLs for convenience
- No authentication validation - passes token through to external API

### 2. Direct S3 Upload (Client-Side)

**Purpose**: Upload the actual photo file to S3 using the signed URL.

**Request**: 
- Method: POST
- URL: The `uploadUrl` from step 1
- Content-Type: `multipart/form-data`
- Body: Form data with all `uploadFields` + the file

**Implementation**:
- This is done client-side (browser/mobile app)
- Uses the `uploadFields` from the token response
- File is uploaded directly to S3, not through our API

**Example curl**:
```bash
curl 'https://parts-images-pr-us-east-2.s3.us-east-2.amazonaws.com/' \
  -H 'Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryBBzxsNYkU3bymGQ6' \
  --data-raw '------WebKitFormBoundaryBBzxsNYkU3bymGQ6
Content-Disposition: form-data; name="Content-Type"

image/png
------WebKitFormBoundaryBBzxsNYkU3bymGQ6
Content-Disposition: form-data; name="key"

jobs/13048356/parts/b670206b-06c7-4e58-917a-8cd71105c9fb.png
------WebKitFormBoundaryBBzxsNYkU3bymGQ6
Content-Disposition: form-data; name="file"; filename="Screenshot 2025-10-15 at 6.40.10 PM.png"
Content-Type: image/png

[FILE DATA]
------WebKitFormBoundaryBBzxsNYkU3bymGQ6--'
```

### 3. POST `/api/assignments/:assignmentId/parts`

**Purpose**: Create a part and associate it with uploaded photos using photo tokens.

**Request**:
```json
{
  "brand": "GE",
  "applianceType": "Dishwasher",
  "partNumber": "xxxx",
  "serialNumber": "SERIALNUMBER",
  "quantity": 1,
  "partType": "local",
  "notes": "hh",
  "photoTokens": ["d2d12db9-3fbb-4840-8973-a55ecbb701b5"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "partNumber": "xxxx",
    "brand": "GE",
    "applianceType": "Dishwasher",
    "quantity": 1,
    "partType": "local",
    "notes": "hh",
    "photos": [...]
  }
}
```

**Implementation**:
- Located in `src/routes/assignments.ts` (line 452)
- Uses `ExternalApiAdapter.callExternalApi()` to proxy the request
- No authentication validation - passes token through to external API
- Returns the external API response as-is

## External Adapter Service

The `ExternalApiAdapter` service (`src/services/externalApiAdapter.ts`) provides:

### `callExternalApi(endpoint, token, method, data)`

**Purpose**: Make authenticated requests to the external API.

**Parameters**:
- `endpoint`: API endpoint path (e.g., `/api/assignments/1375/parts`)
- `token`: JWT access token from Authorization header
- `method`: HTTP method (GET, POST, PUT, PATCH, DELETE)
- `data`: Request body data (optional)

**Features**:
- Automatically adds `Authorization: Bearer {token}` header
- Sets `Content-Type: application/json`
- 30-second timeout
- Comprehensive error logging
- Returns external API response as-is

**Example Usage**:
```typescript
const response = await ExternalApiAdapter.callExternalApi(
  `/api/assignments/${assignmentId}/parts`,
  token,
  'POST',
  {
    brand: "GE",
    partNumber: "xxxx",
    photoTokens: ["token1", "token2"]
  }
);
```

## Complete Flow Example

```bash
# Step 1: Get upload tokens
curl 'https://shs-1099-job-board.replit.app/api/assignments/1375/photo-upload-tokens' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  --data-raw '{"files":[{"fileName":"photo.png","mimeType":"image/png"}]}'

# Step 2: Upload to S3 (client-side)
curl 'https://parts-images-pr-us-east-2.s3.us-east-2.amazonaws.com/' \
  -H 'Content-Type: multipart/form-data' \
  --data-raw '[form data with uploadFields + file]'

# Step 3: Create part with photo tokens
curl 'https://shs-1099-job-board.replit.app/api/assignments/1375/parts' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "brand":"GE",
    "applianceType":"Dishwasher",
    "partNumber":"xxxx",
    "quantity":1,
    "partType":"local",
    "photoTokens":["d2d12db9-3fbb-4840-8973-a55ecbb701b5"]
  }'
```

## Key Implementation Details

1. **No Authentication Validation**: All endpoints pass the token through to the external API without validation. The external API handles authentication.

2. **Direct S3 Upload**: Photos are uploaded directly to S3 from the client, not through our API. This reduces server load and improves performance.

3. **Token-Based Photo Association**: Photos are associated with parts using `photoTokens` rather than URLs. This allows the external API to manage photo access and permissions.

4. **Error Handling**: All errors from the external API are passed through to the client with appropriate HTTP status codes.

5. **Logging**: Comprehensive logging is included for debugging and monitoring.

## Route Ordering

**Important**: The photo upload and parts endpoints are defined **BEFORE** the `authenticateJWT()` middleware (line 627). This allows them to:
- Extract the token from headers without JWT validation
- Pass the token directly to the external API
- Let the external API handle authentication

## Related Files

- `src/routes/assignments.ts` - Route handlers
- `src/services/externalApiAdapter.ts` - External API adapter service
- `src/middleware/auth.ts` - Authentication middleware

