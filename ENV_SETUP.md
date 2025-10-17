# Environment Variables Setup

Add these variables to your `.env` file:

```bash
# Existing variables...
PORT=5010
MONGO_URI=mongodb://localhost:27017/job-board
EXTERNAL_API_URL=https://shs-1099-job-board.replit.app
JWT_SECRET=your-jwt-secret

# OpenAI Configuration (NEW - Required for Textract API)
OPENAI_API_KEY=sk-your-openai-api-key-here

# AWS S3 Configuration (Optional - for image storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-2
AWS_S3_BUCKET=your-bucket-name
```

## Getting Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Add it to your `.env` file

**Important**: Never commit your `.env` file to version control!
