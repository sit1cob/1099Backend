# Photo Upload API - Troubleshooting Guide

## 🔍 Common Issues and Solutions

### Issue 1: "Files array is required with at least one file"

**Error Response:**
```json
{
  "success": false,
  "message": "Files array is required with at least one file. Example: {\"files\":[{\"fileName\":\"photo.png\",\"mimeType\":\"image/png\"}]}"
}
```

**Cause:** Request body is missing the `files` array or it's empty.

**Solutions:**

❌ **Wrong:**
```json
{}
```

❌ **Wrong:**
```json
{
  "files": []
}
```

✅ **Correct:**
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

### Issue 2: "No authorization token provided"

**Error Response:**
```json
{
  "success": false,
  "message": "No authorization token provided. Please include Authorization header with Bearer token."
}
```

**Cause:** Missing or invalid `Authorization` header.

**Solutions:**

❌ **Wrong:**
```bash
curl -X POST "https://api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Content-Type: application/json" \
  -d '{"files":[...]}'
```

✅ **Correct:**
```bash
curl -X POST "https://api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"files":[...]}'
```

**In Postman:**
1. Go to "Authorization" tab
2. Select "Bearer Token"
3. Paste your token (without "Bearer " prefix)

---

### Issue 3: "File at index X is missing required field 'fileName'"

**Error Response:**
```json
{
  "success": false,
  "message": "File at index 0 is missing required field 'fileName' (string)"
}
```

**Cause:** File object is missing the `fileName` field.

**Solutions:**

❌ **Wrong:**
```json
{
  "files": [
    {
      "mimeType": "image/png"
    }
  ]
}
```

✅ **Correct:**
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

### Issue 4: "File at index X is missing required field 'mimeType'"

**Error Response:**
```json
{
  "success": false,
  "message": "File at index 0 is missing required field 'mimeType' (string)"
}
```

**Cause:** File object is missing the `mimeType` field.

**Solutions:**

❌ **Wrong:**
```json
{
  "files": [
    {
      "fileName": "photo.png"
    }
  ]
}
```

✅ **Correct:**
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

### Issue 5: 401 Unauthorized from External API

**Error Response:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**Cause:** JWT token is invalid, expired, or doesn't have permission for this assignment.

**Solutions:**

1. **Login again to get a fresh token:**
   ```bash
   curl -X POST "https://api.com/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username":"vendor@example.com","password":"password123","role":"registered_user"}'
   ```

2. **Check token expiration:**
   - Decode your JWT at https://jwt.io
   - Check the `exp` field
   - If expired, login again

3. **Verify assignment access:**
   - Make sure you have permission to access this assignment
   - Try with a different assignment ID you know you have access to

---

### Issue 6: S3 Upload Fails (403 Forbidden)

**Error Response from S3:**
```xml
<Error>
  <Code>AccessDenied</Code>
  <Message>Invalid according to Policy</Message>
</Error>
```

**Causes:**

1. **Signature expired** - S3 signatures are time-limited (usually 15 minutes)
2. **Wrong fields** - Not all uploadFields were included
3. **Fields in wrong order** - File must be last
4. **Modified fields** - uploadFields were changed

**Solutions:**

1. **Get fresh tokens:**
   ```bash
   # Request new tokens - signatures are time-limited
   curl -X POST "https://api.com/api/assignments/1102/photo-upload-tokens" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"files":[{"fileName":"photo.png","mimeType":"image/png"}]}'
   ```

2. **Include ALL uploadFields:**
   ```javascript
   const formData = new FormData();
   
   // Add ALL fields from uploadFields
   Object.entries(tokenData.uploadFields).forEach(([key, value]) => {
     formData.append(key, value);
   });
   
   // Add file LAST
   formData.append('file', fileBlob);
   ```

3. **Don't modify uploadFields:**
   - Use them exactly as received
   - Don't change any values
   - Don't skip any fields

---

### Issue 7: S3 Upload Succeeds but Part Creation Fails

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid photo token"
}
```

**Cause:** Using wrong photo token or token not found.

**Solutions:**

1. **Use the correct photoToken:**
   ```javascript
   // From step 1 response
   const photoToken = response.data.tokens[0].photoToken;
   
   // Use in step 3
   {
     "photoTokens": [photoToken]
   }
   ```

2. **Verify token format:**
   - Should be a UUID: `"d2d12db9-3fbb-4840-8973-a55ecbb701b5"`
   - Not a URL or file path

3. **Check timing:**
   - Don't wait too long between steps
   - Photo tokens may expire

---

### Issue 8: Network Timeout

**Error Response:**
```json
{
  "success": false,
  "message": "External API call failed"
}
```

**Causes:**

1. External API is slow or down
2. Network connectivity issues
3. Request is too large

**Solutions:**

1. **Check external API status:**
   ```bash
   curl -I https://shs-1099-job-board.replit.app/api/health
   ```

2. **Retry the request:**
   - Wait a few seconds
   - Try again

3. **Check your network:**
   - Verify internet connection
   - Check firewall settings
   - Try from different network

4. **Reduce file count:**
   - If uploading many files, split into smaller batches
   - Try with just one file first

---

### Issue 9: Wrong Assignment ID

**Error Response:**
```json
{
  "success": false,
  "message": "Assignment not found"
}
```

**Cause:** Assignment ID doesn't exist or you don't have access.

**Solutions:**

1. **Verify assignment ID:**
   ```bash
   # Get your assignments
   curl -X GET "https://api.com/api/assignments" \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Check permissions:**
   - Make sure you're assigned to this job
   - Verify your role has access

3. **Use correct ID format:**
   - Should be a number: `1102`
   - Not a job ID or other identifier

---

### Issue 10: CORS Error (Browser Only)

**Error in Browser Console:**
```
Access to fetch at 'https://api.com/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**Cause:** CORS not configured for your origin.

**Solutions:**

1. **Contact backend team** to add your origin to CORS whitelist

2. **Use proxy in development:**
   ```javascript
   // In package.json (React)
   "proxy": "https://api.com"
   ```

3. **Test with Postman/cURL first:**
   - CORS only affects browsers
   - Verify API works outside browser

---

## 🔧 Debugging Checklist

### Before Making Request:

- [ ] Have valid JWT token (not expired)
- [ ] Token includes "Bearer " prefix in header
- [ ] Request body has `files` array
- [ ] Each file has `fileName` and `mimeType`
- [ ] Assignment ID is correct
- [ ] Using correct endpoint URL

### After Getting Response:

- [ ] Check HTTP status code
- [ ] Read error message carefully
- [ ] Check backend logs for `[PhotoUploadTokens]` messages
- [ ] Verify response structure matches expected format

### For S3 Upload:

- [ ] Got tokens successfully in step 1
- [ ] Using fresh tokens (not expired)
- [ ] Including ALL uploadFields
- [ ] File is added LAST in form data
- [ ] Not modifying any uploadFields values

### For Part Creation:

- [ ] S3 upload completed successfully
- [ ] Using correct photoToken (UUID format)
- [ ] Including all required part fields
- [ ] Using same token as step 1

---

## 📊 Logging and Monitoring

### Check Backend Logs

Look for these log messages:

```
[PhotoUploadTokens] ========================================
[PhotoUploadTokens] Calling EXTERNAL API: https://...
[PhotoUploadTokens] Body: {...}
[PhotoUploadTokens] ========================================
```

**What to check:**
- Is the request body correct?
- Is the token present?
- What's the external API URL?

```
[PhotoUploadTokens] ========== EXTERNAL API RESPONSE ==========
[PhotoUploadTokens] Response: {...}
[PhotoUploadTokens] ================================================
```

**What to check:**
- Did external API return success?
- Are tokens present in response?
- Any error messages?

```
[PhotoUploadTokens] ✓ Added S3 URLs to tokens
[PhotoUploadTokens] ✓ Returning transformed response
```

**What to check:**
- Were URLs added successfully?
- Is response being returned?

### Enable Verbose Logging

If you need more details, check the ExternalApiAdapter logs:

```
[ExternalApiAdapter] ========== EXTERNAL API REQUEST ==========
[ExternalApiAdapter] URL: ...
[ExternalApiAdapter] Method: POST
[ExternalApiAdapter] Request Body: {...}
```

---

## 🧪 Testing Steps

### 1. Test with Minimal Request

```bash
curl -X POST "https://api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":[{"fileName":"test.png","mimeType":"image/png"}]}'
```

**Expected:** Success response with tokens

### 2. Test with Multiple Files

```bash
curl -X POST "https://api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":[
    {"fileName":"test1.png","mimeType":"image/png"},
    {"fileName":"test2.jpg","mimeType":"image/jpeg"}
  ]}'
```

**Expected:** Success response with 2 tokens

### 3. Test Error Cases

```bash
# Test missing files array
curl -X POST "https://api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 400 with helpful error message

# Test missing token
curl -X POST "https://api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Content-Type: application/json" \
  -d '{"files":[{"fileName":"test.png","mimeType":"image/png"}]}'

# Expected: 401 with helpful error message
```

---

## 📞 Getting Help

### Information to Provide:

1. **Request details:**
   - Full cURL command (remove sensitive token)
   - Request body
   - Headers

2. **Response details:**
   - HTTP status code
   - Response body
   - Any error messages

3. **Environment:**
   - Are you using Postman, cURL, or code?
   - What's your base URL?
   - What assignment ID are you using?

4. **Logs:**
   - Backend logs with `[PhotoUploadTokens]` messages
   - Any error stack traces

### Quick Diagnostic Commands:

```bash
# 1. Test if API is reachable
curl -I https://shs-1099-job-board.replit.app/api/health

# 2. Test login
curl -X POST "https://api.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"vendor@example.com","password":"password123","role":"registered_user"}'

# 3. Test photo upload tokens with fresh token
TOKEN="your_token_here"
curl -X POST "https://api.com/api/assignments/1102/photo-upload-tokens" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":[{"fileName":"test.png","mimeType":"image/png"}]}' \
  -v  # Verbose mode for debugging
```

---

## ✅ Success Indicators

You know it's working when:

1. ✅ Step 1 returns `"success": true` with tokens array
2. ✅ Each token has `uploadUrl`, `uploadFields`, and `photoToken`
3. ✅ S3 upload returns 204 No Content
4. ✅ Part creation returns `"success": true` with part data
5. ✅ Backend logs show successful external API calls
6. ✅ No error messages in logs

---

## 🎯 Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| 401 Unauthorized | Login again to get fresh token |
| 400 Bad Request | Check request body has `files` array |
| S3 403 Forbidden | Get fresh tokens (signatures expire) |
| Network timeout | Retry after a few seconds |
| Wrong assignment | Verify assignment ID from your assignments list |
| Token expired | Check JWT expiration at jwt.io, login again |
| Missing fields | Ensure fileName and mimeType in each file |
| CORS error | Test with Postman/cURL first |
