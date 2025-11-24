# Postman Collection Usage Guide

## 📦 Import the Collection

1. Open Postman
2. Click **Import** button
3. Select `postman-collection-photo-upload.json`
4. Collection will appear in your sidebar

## 🔧 Setup Collection Variables

The collection uses variables that auto-populate during workflow:

| Variable | Default | Auto-Set | Description |
|----------|---------|----------|-------------|
| `baseUrl` | `http://localhost:5010` | ❌ | Your API base URL |
| `accessToken` | (empty) | ✅ | JWT token from login |
| `assignmentId` | `123` | ❌ | Assignment ID to test with |
| `photoToken` | (empty) | ✅ | Token from upload |
| `partId` | (empty) | ✅ | Created part ID |
| `s3UploadUrl` | (empty) | ✅ | S3 presigned URL |
| `s3Key` | (empty) | ✅ | S3 object key |

### To Edit Variables:
1. Click on collection name
2. Go to **Variables** tab
3. Update `baseUrl` and `assignmentId` as needed

## 🚀 Quick Start Workflows

### Workflow 1: Multipart Upload (Recommended for Mobile)

**Single API call - easiest method**

```
1. Authentication → Login Vendor
   ✓ Token auto-saved

2. Photo Upload - Multipart → Upload Photos (Multipart)
   - Click "Select Files" for each photo field
   - Can upload up to 10 photos
   - Send request
   ✓ Photo tokens auto-saved

3. Parts Management → Create Part with Photos
   - photoTokens array already populated
   - Modify part details as needed
   - Send request
   ✓ Part created with photos linked
```

**Mobile App Code Example:**
```javascript
const formData = new FormData();
formData.append('photos', {
  uri: photoUri,
  type: 'image/jpeg',
  name: 'photo.jpg'
});

fetch(`${API_URL}/api/assignments/${assignmentId}/upload-photos`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

---

### Workflow 2: Token-Based Upload (Direct S3)

**Better for scalability, requires 2 steps**

```
1. Authentication → Login Vendor
   ✓ Token auto-saved

2. Photo Upload - Token Based → 1. Request Photo Upload Tokens
   - Modify file names/types in request body
   - Send request
   ✓ S3 credentials auto-saved

3. Photo Upload - Token Based → 2. Upload to S3
   ⚠️ MANUAL STEP:
   - Copy ALL fields from step 2 response (presignedPost.fields)
   - Paste into form-data fields
   - Select your image file (MUST BE LAST)
   - Send request (no auth needed)
   
4. Parts Management → Create Part with Photos
   - photoTokens array already populated
   - Send request
   ✓ Part created with photos linked
```

---

## 📋 Detailed Request Examples

### 1. Login Vendor

**Request:**
```json
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "vendor@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "email": "vendor@example.com",
      "role": "vendor"
    }
  }
}
```

**Auto-saved:** `accessToken` → Used in all subsequent requests

---

### 2. Request Photo Upload Tokens

**Request:**
```json
POST {{baseUrl}}/api/assignments/123/photo-upload-tokens
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "files": [
    {
      "fileName": "part_photo_1.jpg",
      "mimeType": "image/jpeg"
    },
    {
      "fileName": "part_photo_2.png",
      "mimeType": "image/png"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "token": "550e8400-e29b-41d4-a716-446655440000",
        "uploadUrl": "https://parts-images-st.s3.amazonaws.com/",
        "uploadFields": {
          "key": "jobs/12345/parts/550e8400.jpg",
          "Policy": "eyJleHBpcmF0aW9u...",
          "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
          "X-Amz-Credential": "AKIA.../20251124/us-east-2/s3/aws4_request",
          "X-Amz-Date": "20251124T160000Z",
          "X-Amz-Signature": "abc123...",
          "Content-Type": "image/jpeg"
        },
        "url": "https://parts-images-st.s3.amazonaws.com/jobs/12345/parts/550e8400.jpg",
        "imageUrl": "https://parts-images-st.s3.amazonaws.com/jobs/12345/parts/550e8400.jpg",
        "photoToken": "550e8400-e29b-41d4-a716-446655440000"
      }
    ]
  },
  "message": "Generated 2 upload token(s)"
}
```

**Auto-saved:** 
- `photoToken` → First token
- `s3UploadUrl` → Upload URL
- `s3Key` → S3 object key

---

### 3. Upload to S3 (Manual Configuration Required)

**⚠️ IMPORTANT:** You must manually copy fields from step 2 response

**Request:**
```
POST https://parts-images-st.s3.amazonaws.com/
Content-Type: multipart/form-data

Form Fields (IN THIS ORDER):
  key: jobs/12345/parts/550e8400.jpg
  Policy: eyJleHBpcmF0aW9u...
  X-Amz-Algorithm: AWS4-HMAC-SHA256
  X-Amz-Credential: AKIA.../20251124/us-east-2/s3/aws4_request
  X-Amz-Date: 20251124T160000Z
  X-Amz-Signature: abc123...
  Content-Type: image/jpeg
  file: [SELECT YOUR IMAGE FILE] ← MUST BE LAST
```

**Response:**
```
204 No Content
(Empty body = success)
```

**Steps in Postman:**
1. Go to **Body** tab → **form-data**
2. For each field in `uploadFields`, add a row:
   - Key: field name (e.g., "Policy")
   - Value: field value from response
   - Type: Text
3. Last row:
   - Key: `file`
   - Type: **File**
   - Click "Select Files" and choose your image

---

### 4. Upload Photos (Multipart) - EASIER METHOD

**Request:**
```
POST {{baseUrl}}/api/assignments/123/upload-photos
Authorization: Bearer {{accessToken}}
Content-Type: multipart/form-data

Form Fields:
  photos: [SELECT IMAGE FILE 1]
  photos: [SELECT IMAGE FILE 2]
  ... (up to 10 files)
```

**Response:**
```json
{
  "success": true,
  "message": "Uploaded 2 of 2 photos",
  "data": {
    "uploads": [
      {
        "fileName": "photo1.jpg",
        "token": "550e8400-e29b-41d4-a716-446655440000",
        "url": "https://parts-images-st.s3.amazonaws.com/jobs/12345/parts/550e8400.jpg",
        "imageUrl": "https://parts-images-st.s3.amazonaws.com/jobs/12345/parts/550e8400.jpg",
        "photoToken": "550e8400-e29b-41d4-a716-446655440000",
        "success": true
      },
      {
        "fileName": "photo2.jpg",
        "token": "660f9511-f3ac-52e5-b827-557766551111",
        "url": "https://parts-images-st.s3.amazonaws.com/jobs/12345/parts/660f9511.jpg",
        "imageUrl": "https://parts-images-st.s3.amazonaws.com/jobs/12345/parts/660f9511.jpg",
        "photoToken": "660f9511-f3ac-52e5-b827-557766551111",
        "success": true
      }
    ],
    "totalFiles": 2,
    "successCount": 2,
    "failureCount": 0
  }
}
```

**Auto-saved:** `photoToken` → First successful upload token

---

### 5. Create Part with Photos

**Request:**
```json
POST {{baseUrl}}/api/assignments/123/parts
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "brand": "Whirlpool",
  "applianceType": "Dishwasher",
  "partNumber": "W10822278",
  "partDescription": "Door Latch Assembly",
  "quantity": 1,
  "disposition": "installed",
  "photoTokens": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660f9511-f3ac-52e5-b827-557766551111"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "location": "/api/assignments/123/parts/456"
  },
  "message": "Part added successfully"
}
```

**Auto-saved:** `partId` → Created part ID

---

## 🎯 Testing Scenarios

### Scenario 1: Mobile App Upload Simulation
```
1. Login Vendor
2. Upload Photos (Multipart) with 3 photos
3. Create Part with Photos
4. Get Assignment Parts (verify photos linked)
```

### Scenario 2: Direct S3 Upload
```
1. Login Vendor
2. Request Photo Upload Tokens (2 files)
3. Upload to S3 (manually for each token)
4. Create Part with Photos
5. Get Photo View URL
```

### Scenario 3: Part Management
```
1. Login Vendor
2. Upload Photos (Multipart)
3. Create Part with Photos
4. Get Assignment Parts
5. Delete Part (verify cascade delete)
```

---

## 🔍 Troubleshooting

### Issue: "No token provided"
**Solution:** Run "Login Vendor" request first. Check Variables tab to confirm `accessToken` is set.

### Issue: S3 upload returns 403 Forbidden
**Causes:**
- Incorrect field order (file must be LAST)
- Missing or incorrect signature fields
- Expired presigned URL (valid for 1 hour)

**Solution:** 
1. Request new tokens (step 1)
2. Copy ALL fields exactly
3. Ensure file is last in form-data

### Issue: "Invalid assignmentId"
**Solution:** Update `assignmentId` variable with a valid assignment ID from your system.

### Issue: Multipart upload fails with file type error
**Allowed types:** JPEG, PNG, GIF, WebP, HEIC, HEIF
**Max size:** 10MB per file
**Max files:** 10 per request

---

## 📱 Mobile Integration Examples

### React Native
```javascript
const uploadPhotos = async (assignmentId, photoUris) => {
  const formData = new FormData();
  
  photoUris.forEach((uri) => {
    formData.append('photos', {
      uri: uri,
      type: 'image/jpeg',
      name: 'photo.jpg'
    });
  });

  const response = await fetch(
    `${API_URL}/api/assignments/${assignmentId}/upload-photos`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    }
  );

  return response.json();
};
```

### Flutter
```dart
Future<Map<String, dynamic>> uploadPhotos(
  String assignmentId, 
  List<File> photos
) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('$apiUrl/api/assignments/$assignmentId/upload-photos'),
  );
  
  request.headers['Authorization'] = 'Bearer $token';
  
  for (var photo in photos) {
    request.files.add(
      await http.MultipartFile.fromPath('photos', photo.path)
    );
  }
  
  var response = await request.send();
  var responseData = await response.stream.bytesToString();
  return jsonDecode(responseData);
}
```

### Swift (iOS)
```swift
func uploadPhotos(assignmentId: String, images: [UIImage]) async throws -> [String: Any] {
    var request = URLRequest(url: URL(string: "\(apiURL)/api/assignments/\(assignmentId)/upload-photos")!)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let boundary = UUID().uuidString
    request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    
    var body = Data()
    
    for image in images {
        if let imageData = image.jpegData(compressionQuality: 0.8) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"photos\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
        }
    }
    
    body.append("--\(boundary)--\r\n".data(using: .utf8)!)
    request.httpBody = body
    
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}
```

---

## 🔐 Security Notes

1. **Never commit tokens** - Use environment variables in production
2. **Token expiration** - Access tokens expire, implement refresh logic
3. **S3 presigned URLs** - Valid for 1 hour, request new tokens if expired
4. **File validation** - Server validates file types and sizes
5. **Authorization** - All endpoints require valid JWT except:
   - `/api/auth/login`
   - `/api/parts/search-sears`
   - S3 direct upload (uses presigned URL)

---

## 📊 Response Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed |
| 201 | Created | Resource created (part, token) |
| 204 | No Content | S3 upload success |
| 400 | Bad Request | Invalid data, missing fields |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | S3 signature invalid/expired |
| 404 | Not Found | Assignment/part doesn't exist |
| 422 | Unprocessable | Validation failed |
| 500 | Server Error | External API or server issue |

---

## 🎓 Best Practices

1. **Use Multipart Upload for Mobile** - Simpler, one API call
2. **Use Token-Based for Web** - Better progress tracking, scalable
3. **Batch Photo Uploads** - Upload all photos at once, not one-by-one
4. **Handle Errors Gracefully** - Check `success` field in responses
5. **Save Tokens** - Store photo tokens until part is created
6. **Validate Before Upload** - Check file size/type client-side
7. **Show Progress** - Use XHR for upload progress tracking
8. **Cleanup on Cancel** - If user cancels, tokens will auto-expire in 1 hour

---

## 📞 Support

For issues with:
- **External API** - Contact backend team
- **S3 Permissions** - Check AWS IAM configuration
- **This Collection** - Verify endpoint URLs and request format

---

**Last Updated:** November 24, 2025
**Collection Version:** 1.0
**API Base URL:** http://localhost:5010
