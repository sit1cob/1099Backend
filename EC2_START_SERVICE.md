# EC2 Service Start Guide

## Current Status
✅ Build completed successfully (`dist/server.js` created)
✅ `.env` updated with `PROS_API_BASE_URL`
❌ PM2 process `1099-api` not found

## Quick Fix - Start the Service

### Step 1: Check what PM2 processes are running
```bash
pm2 list
```

### Step 2: Start the service (choose one option)

#### Option A: Start with PM2 (Recommended)
```bash
pm2 start dist/server.js --name 1099-api --env production
pm2 save
pm2 startup  # To auto-start on reboot
```

#### Option B: If PM2 process exists with different name
```bash
# List all processes
pm2 list

# Restart the existing process
pm2 restart <process-id-or-name>

# Or delete and recreate
pm2 delete <process-id-or-name>
pm2 start dist/server.js --name 1099-api
pm2 save
```

#### Option C: Start directly (not recommended for production)
```bash
# Start in background
nohup node dist/server.js > logs/app.log 2>&1 &

# Check if running
ps aux | grep "node.*server.js"
```

### Step 3: Verify the service is running
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs 1099-api --lines 50

# Test the API locally on EC2
curl http://localhost:5010/api/health

# Test from outside
curl https://app1099-api.searskairos.ai/api/health
```

### Step 4: Test the fixed endpoints
```bash
# Test models search (replace TOKEN with actual token)
curl -H "Authorization: Bearer TOKEN" \
  "https://app1099-api.searskairos.ai/api/assignments/13091/models/search?q=test"

# Test v3 assignments
curl -X PATCH \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"arrived"}' \
  "https://app1099-api.searskairos.ai/api/v3/assignments/13093"
```

## Common PM2 Commands

```bash
# List all processes
pm2 list

# View logs
pm2 logs 1099-api

# Restart
pm2 restart 1099-api

# Stop
pm2 stop 1099-api

# Delete
pm2 delete 1099-api

# Monitor
pm2 monit

# Save current process list
pm2 save

# View detailed info
pm2 show 1099-api
```

## Troubleshooting

### If port 5010 is already in use
```bash
# Find what's using the port
lsof -i :5010

# Kill the process
kill -9 <PID>

# Then start PM2 again
pm2 start dist/server.js --name 1099-api
```

### If .env is not being loaded
```bash
# Check .env file
cat .env

# Start PM2 with explicit env file
pm2 start dist/server.js --name 1099-api --env production --update-env
```

### Check application logs
```bash
# PM2 logs
pm2 logs 1099-api --lines 100

# Or if you have a logs directory
tail -f logs/app.log
```
