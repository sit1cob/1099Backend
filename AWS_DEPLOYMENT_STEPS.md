# AWS Deployment Steps - Add OpenAI API Key

## Step 1: Add OpenAI API Key to .env

```bash
# You're already in the directory: ~/1099Backend/
cd ~/1099Backend

# Add the OpenAI API key to .env file
echo 'OPENAI_API_KEY=your-openai-api-key-here' >> .env

# Verify it was added
tail -1 .env
```

## Step 2: Restart PM2

```bash
# Restart the application
pm2 restart job-board-api

# Or restart all PM2 processes
pm2 restart all

# Check status
pm2 status

# View logs
pm2 logs job-board-api --lines 50
```

## Step 3: Test the Textract API

```bash
# Test from AWS server (replace with actual image path)
curl -X POST http://localhost:5010/api/textract/extract-appliance-info \
  -F "image=@/path/to/test-image.jpg" \
  -F "email=test@example.com"

# Or test from external (using your load balancer URL)
curl -X POST http://1099-app-536394119.us-east-2.elb.amazonaws.com/api/textract/extract-appliance-info \
  -F "image=@/path/to/test-image.jpg" \
  -F "email=test@example.com"
```

## Step 4: Verify Environment Variable

```bash
# Check if the key is loaded (without showing the full key)
pm2 env 0 | grep OPENAI

# Or check in the app logs
pm2 logs job-board-api | grep -i openai
```

## Expected Response

```json
{
  "success": true,
  "data": {
    "modelNumber": "GTS18GTHWW",
    "serialNumber": "SN123456789",
    "brand": "GE",
    "yearOfManufacturing": "2020"
  }
}
```

## Troubleshooting

### If API returns "OPENAI_API_KEY is not configured"

1. Check .env file:
```bash
cat .env | grep OPENAI_API_KEY
```

2. Restart PM2:
```bash
pm2 restart all
```

3. Check PM2 environment:
```bash
pm2 show job-board-api
```

### If you get OpenAI API errors

1. Check logs:
```bash
pm2 logs job-board-api --lines 100
```

2. Verify API key is valid:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Security Notes

- ✅ `.env` file should be in `.gitignore`
- ✅ Never commit API keys to Git
- ✅ Use environment variables for sensitive data
- ✅ Rotate API keys regularly

---

## Quick Command Summary

```bash
# Add API key
echo 'OPENAI_API_KEY=your-key-here' >> .env

# Restart app
pm2 restart job-board-api

# Test API
curl -X POST http://localhost:5010/api/textract/extract-appliance-info \
  -F "image=@test.jpg" -F "email=test@example.com"
```

Your textract API is now live on AWS! 🚀
