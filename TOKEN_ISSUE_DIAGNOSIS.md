# Token Issue Diagnosis - July 13, 2026

## Problem Statement

Login succeeds and returns a valid access token, but the `/api/assignments/:id/models/search` endpoint returns "Invalid or expired token" when using that same token.

## Root Cause Analysis

### What's Working ✅
1. Login API returns a valid token from Replit
2. Replit server accepts the token directly
3. Token is not expired (valid for 8 hours)

### What's Failing ❌
1. EC2 wrapper API rejects the token when forwarding to Replit
2. The request never reaches Replit successfully

## Test Results

### Test 1: Login
```bash
curl 'https://app1099-api.searskairos.ai/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"test_vendor","password":"Demo2025@","role":"registered_user"}'
```
**Result**: ✅ SUCCESS - Returns valid token

### Test 2: Models Search via EC2 Wrapper
```bash
curl 'https://app1099-api.searskairos.ai/api/assignments/13092/models/search?q=VA6013' \
  -H 'Authorization: Bearer <token_from_login>'
```
**Result**: ❌ FAILED - "Invalid or expired token"

### Test 3: Models Search Directly to Replit
```bash
curl 'https://shs-1099-job-board.replit.app/api/assignments/13092/models/search?q=VA6013' \
  -H 'Authorization: Bearer <token_from_login>'
```
**Result**: ✅ SUCCESS - Returns model data

## Conclusion

The EC2 wrapper is not correctly forwarding requests to Replit. The issue is on the **EC2 server**, not in the codebase.

## Solution

### Step 1: Check EC2 Server Status
```bash
ssh 10.11.142.117
cd ~/1099Backend
pm2 status
pm2 logs 1099-api --lines 50
```

### Step 2: Verify Code Version
```bash
git log -1 --oneline
cat src/services/externalApiAdapter.ts | grep EXTERNAL_API_BASE_URL
```

Expected output:
```
const EXTERNAL_API_BASE_URL = 'https://shs-1099-job-board.replit.app';
```

### Step 3: Update and Restart
```bash
# Pull latest code
git pull origin main

# Rebuild
npm run build

# Restart PM2
pm2 restart 1099-api --update-env

# Verify
pm2 logs 1099-api --lines 20
```

### Step 4: Test Locally on EC2
```bash
curl -s "http://localhost:5001/api/assignments/13092/models/search?q=VA6013" \
  -H "Authorization: Bearer <fresh_token>"
```

Should return:
```json
{
  "success": true,
  "data": {
    "count": 1,
    "models": [...]
  }
}
```

## Architecture Notes

The current login flow:
1. Client calls EC2: `POST /api/auth/login`
2. EC2 calls Replit: `POST /api/auth/login`
3. Replit returns token signed with Replit's JWT_SECRET
4. EC2 forwards Replit's token to client
5. Client uses token for subsequent requests

The models/search flow:
1. Client calls EC2: `GET /api/assignments/:id/models/search`
2. EC2 forwards to Replit with the token
3. Replit validates token and returns data
4. EC2 forwards response to client

**Critical**: The token must be from Replit (not EC2) for this to work.

## Monitoring

Check PM2 logs for these indicators:

**Success**:
```
[Auth] Decoded token: {...}
GET /api/assignments/13092/models/search?q=VA6013 200 993.503 ms - 103
```

**Failure**:
```
[ExternalApiAdapter] ========== EXTERNAL API CALL FAILED ==========
[ExternalApiAdapter]   HTTP Status: 403
[ExternalApiAdapter]   Response Data: {
  "message": "Invalid or expired token"
}
```

## Next Steps

1. SSH to EC2 and run the diagnostic commands above
2. Share the output of `pm2 logs` and `git log -1`
3. If the issue persists after restart, check:
   - Network connectivity to Replit
   - Firewall rules
   - Load balancer configuration
