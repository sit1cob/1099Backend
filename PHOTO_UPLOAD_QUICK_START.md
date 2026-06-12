# Photo Upload API - Quick Start Guide

## 🚀 Quick Reference

### Endpoint
```
POST /api/assignments/:assignmentId/photo-upload-tokens
```

### Required Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Required Body
```json
{
  "files": [
    {
      "fileName": "photo.png",
      "mimeType": "image/png"
    }
  ]
}
```

---

## ✅ Correct Usage

### Example 1: Single Photo
```bash
curl -X POST "https://your-api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "fileName": "part-photo.png",
        "mimeType": "image/png"
      }
    ]
  }'
```

### Example 2: Multiple Photos
```bash
curl -X POST "https://your-api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"fileName": "photo-1.png", "mimeType": "image/png"},
      {"fileName": "photo-2.jpg", "mimeType": "image/jpeg"},
      {"fileName": "photo-3.heic", "mimeType": "image/heic"}
    ]
  }'
```

---

## ❌ Common Mistakes

### Mistake 1: Empty Request Body
```json
// ❌ WRONG
{}

// ✅ CORRECT
{
  "files": [
    {"fileName": "photo.png", "mimeType": "image/png"}
  ]
}
```

### Mistake 2: Empty Files Array
```json
// ❌ WRONG
{
  "files": []
}

// ✅ CORRECT
{
  "files": [
    {"fileName": "photo.png", "mimeType": "image/png"}
  ]
}
```

### Mistake 3: Missing Required Fields
```json
// ❌ WRONG - Missing mimeType
{
  "files": [
    {"fileName": "photo.png"}
  ]
}

// ❌ WRONG - Missing fileName
{
  "files": [
    {"mimeType": "image/png"}
  ]
}

// ✅ CORRECT
{
  "files": [
    {"fileName": "photo.png", "mimeType": "image/png"}
  ]
}
```

### Mistake 4: Missing Authorization Header
```bash
# ❌ WRONG
curl -X POST "https://api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Content-Type: application/json" \
  -d '{"files":[...]}'

# ✅ CORRECT
curl -X POST "https://api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":[...]}'
```

---

## 📋 Complete Flow (3 Steps)

### Step 1: Get Upload Tokens
```bash
POST /api/assignments/1102/photo-upload-tokens
Authorization: Bearer YOUR_TOKEN

{
  "files": [
    {"fileName": "photo.png", "mimeType": "image/png"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": [{
      "photoToken": "uuid-here",
      "uploadUrl": "https://s3-url",
      "uploadFields": { ... }
    }]
  }
}
```

### Step 2: Upload to S3 (Client-Side)
```javascript
const formData = new FormData();

// Add all uploadFields
Object.entries(token.uploadFields).forEach(([key, value]) => {
  formData.append(key, value);
});

// Add file last
formData.append('file', fileBlob);

// Upload to S3
await fetch(token.uploadUrl, {
  method: 'POST',
  body: formData
});
```

### Step 3: Create Part with Photo Token
```bash
POST /api/assignments/1102/parts
Authorization: Bearer YOUR_TOKEN

{
  "brand": "Samsung",
  "applianceType": "Cooktop",
  "partNumber": "12345",
  "quantity": 1,
  "partType": "local",
  "photoTokens": ["uuid-from-step-1"]
}
```

---

## 🔍 Supported MIME Types

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/heic`
- `image/heif`

---

## 🐛 Error Messages

| Error Code | Message | Solution |
|------------|---------|----------|
| 400 | Files array is required with at least one file | Add `files` array with at least one file object |
| 400 | File at index X is missing required field 'fileName' | Add `fileName` string to file object |
| 400 | File at index X is missing required field 'mimeType' | Add `mimeType` string to file object |
| 401 | No authorization token provided | Add `Authorization: Bearer TOKEN` header |
| 401 | Unauthorized (from external API) | Token is invalid or expired - login again |

---

## 🧪 Test in Postman

1. **Import Collection**: Import `postman/Photo_Upload_Wrapper_Examples.postman_collection.json`
2. **Set Variables**:
   - `baseUrl`: Your API URL
   - `assignmentId`: Valid assignment ID
3. **Run Requests**:
   - Run "1. Login" first to get token
   - Run "2. Get Photo Upload Tokens" to get upload URLs
   - Manually upload to S3 (step 5)
   - Run "4. Create Part with Photo Tokens"

---

## 📚 More Documentation

- **Detailed Guide**: `PHOTO_UPLOAD_WRAPPER_GUIDE.md`
- **Flow Documentation**: `PARTS_PHOTO_UPLOAD_FLOW.md`
- **cURL Examples**: `PHOTO_UPLOAD_CURL_EXAMPLES.sh`
- **Postman Collection**: `postman/Photo_Upload_Wrapper_Examples.postman_collection.json`

---

## 💡 Key Points

1. ✅ The API is **already a wrapper** - it proxies requests to the external API
2. ✅ The `files` array is **required** and must have at least one file
3. ✅ Each file must have both `fileName` and `mimeType`
4. ✅ Authorization header with Bearer token is **required**
5. ✅ Photos are uploaded **directly to S3** from the client (not through your backend)
6. ✅ Use the `photoToken` from step 1 when creating the part in step 3

---

## 🆘 Need Help?

**Check the logs:**
```bash
# Look for these log messages in your backend:
[PhotoUploadTokens] ========================================
[PhotoUploadTokens] Calling EXTERNAL API: ...
[PhotoUploadTokens] Body: ...
```

**Common issues:**
- Token expired → Login again
- Wrong assignment ID → Check your database
- Missing files array → Add `{"files": [...]}`
- S3 upload failed → Check uploadFields are copied correctly
