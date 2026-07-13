# EC2 Deployment Fix - 401 Unauthorized Errors

## Problem Summary
The APIs on EC2 (https://app1099-api.searskairos.ai) are returning 401 errors because:
1. The `externalApiAdapter.ts` was pointing to the wrong URL
2. The `.env` file on EC2 doesn't have `PROS_API_BASE_URL` configured
3. The code needs to be rebuilt and redeployed

## Affected Endpoints
- `/api/assignments/:id/models/search` - 401 Unauthorized
- `/api/v3/assignments/:id` - 404 Not Found  
- `/api/feedback` - Missing token
- `/api/assignments/:id/models/:modelId/parts` - 401 Unauthorized

## Root Cause
The `externalApiAdapter.ts` was configured to use `https://shs-1099-job-board.replit.app` but needs to proxy to the correct external API based on the endpoint.

## Changes Made Locally

### 1. Fixed externalApiAdapter.ts
**File:** `src/services/externalApiAdapter.ts`
- Set `EXTERNAL_API_BASE_URL = 'https://shs-1099-job-board.replit.app'`

### 2. Updated .env
Added:
```bash
PROS_API_BASE_URL=https://shs-1099-job-board.replit.app
```

### 3. Fixed merge conflict
Resolved conflict in `src/routes/assignments.ts` line 1275

## Deployment Steps for EC2

### Step 1: SSH into EC2
```bash
ssh sjena@10.11.142.117
cd ~/1099Backend
```

### Step 2: Pull latest code
```bash
git stash  # Save any local changes
git pull origin aws_main  # Or your deployment branch
```

### Step 3: Update .env file on EC2
```bash
nano .env
```

Add this line at the end:
```bash
PROS_API_BASE_URL=https://shs-1099-job-board.replit.app
```

Save and exit (Ctrl+X, Y, Enter)

### Step 4: Rebuild the application
```bash
npm run build
```

### Step 5: Restart the service
```bash
# If using PM2:
pm2 restart 1099-api

# Or if using systemd:
sudo systemctl restart 1099-api

# Or if running directly:
# Kill the old process and start new one
pkill -f "node.*server.js"
npm start &
```

### Step 6: Verify deployment
```bash
# Check if service is running
pm2 status
# or
ps aux | grep node

# Test the API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://app1099-api.searskairos.ai/api/assignments/13091/models/search?q=test
```

## Verification Checklist
- [ ] Code pulled from git
- [ ] `.env` file updated with `PROS_API_BASE_URL`
- [ ] `npm run build` completed successfully
- [ ] Service restarted
- [ ] API endpoints return 200 instead of 401
- [ ] Test with actual Android app

## Rollback Plan
If issues occur:
```bash
git log --oneline -5  # Find previous commit
git checkout <previous-commit-hash>
npm run build
pm2 restart 1099-api
```

## Notes
- The wrapper API on EC2 proxies requests to the Replit server
- All endpoints use `authenticateJWT({ skipValidation: true })` which means they accept tokens without full validation
- The token is passed through to the external API for actual validation
