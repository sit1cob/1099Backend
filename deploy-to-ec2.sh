#!/bin/bash

# EC2 Deployment Script for 1099 Backend API
# This script deploys the latest changes to the EC2 server

set -e  # Exit on error

EC2_HOST="10.11.142.117"
EC2_USER="sjena"
EC2_PATH="~/1099Backend"

echo "🚀 Starting deployment to EC2..."

# Step 1: Build locally
echo "📦 Building application locally..."
npm run build

# Step 2: Copy dist folder to EC2
echo "📤 Uploading dist folder to EC2..."
scp -r dist/ ${EC2_USER}@${EC2_HOST}:${EC2_PATH}/

# Step 3: Copy package files
echo "📤 Uploading package files..."
scp package.json package-lock.json ${EC2_USER}@${EC2_HOST}:${EC2_PATH}/

# Step 4: SSH and restart service
echo "🔄 Restarting service on EC2..."
ssh ${EC2_USER}@${EC2_HOST} << 'ENDSSH'
cd ~/1099Backend

# Check if .env has PROS_API_BASE_URL
if ! grep -q "PROS_API_BASE_URL" .env; then
  echo "⚠️  Adding PROS_API_BASE_URL to .env..."
  echo "PROS_API_BASE_URL=https://shs-1099-job-board.replit.app" >> .env
fi

# Install dependencies if needed
npm install --production

# Restart PM2 service
if command -v pm2 &> /dev/null; then
  echo "🔄 Restarting PM2 service..."
  pm2 restart 1099-api || pm2 start dist/server.js --name 1099-api
  pm2 save
else
  echo "⚠️  PM2 not found. Please restart the service manually."
fi

echo "✅ Deployment complete!"
ENDSSH

echo ""
echo "✅ Deployment finished successfully!"
echo ""
echo "🧪 Test the API with:"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN' https://app1099-api.searskairos.ai/api/assignments/13091/models/search?q=test"
