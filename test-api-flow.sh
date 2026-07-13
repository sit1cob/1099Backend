#!/bin/bash

# API Test Flow Script
# This script tests the complete authentication and API flow

BASE_URL="https://app1099-api.searskairos.ai"

echo "=========================================="
echo "1099 API Test Flow"
echo "=========================================="
echo ""

# Step 1: Login
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_vendor",
    "password": "Demo2025@",
    "role": "registered_user"
  }')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Login failed - no access token received"
    exit 1
fi

echo "✓ Login successful"
echo "✓ Access Token: ${ACCESS_TOKEN:0:30}..."
echo ""

# Decode and check token expiry
echo "Step 2: Checking token validity..."
TOKEN_PAYLOAD=$(echo "$ACCESS_TOKEN" | cut -d'.' -f2)
# Add padding if needed
while [ $((${#TOKEN_PAYLOAD} % 4)) -ne 0 ]; do
    TOKEN_PAYLOAD="${TOKEN_PAYLOAD}="
done

DECODED=$(echo "$TOKEN_PAYLOAD" | base64 -d 2>/dev/null | jq '.')
echo "Token Payload:"
echo "$DECODED"

EXP=$(echo "$DECODED" | jq -r '.exp')
NOW=$(date +%s)
EXPIRES_IN=$(( $EXP - $NOW ))
EXPIRES_IN_MINUTES=$(( $EXPIRES_IN / 60 ))

echo ""
echo "✓ Token expires in: $EXPIRES_IN_MINUTES minutes"
echo ""

# Step 3: Test Search Models API
echo "Step 3: Testing Search Models API..."
SEARCH_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/assignments/13092/models/search?q=VA6013" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Search Response:"
echo "$SEARCH_RESPONSE" | jq '.'
echo ""

# Check if search was successful
SUCCESS=$(echo "$SEARCH_RESPONSE" | jq -r '.success')

if [ "$SUCCESS" == "true" ]; then
    MODEL_COUNT=$(echo "$SEARCH_RESPONSE" | jq -r '.data.count')
    echo "✓ Search successful - Found $MODEL_COUNT models"
    
    if [ "$MODEL_COUNT" -gt 0 ]; then
        echo ""
        echo "First Model Details:"
        echo "$SEARCH_RESPONSE" | jq '.data.models[0]'
    fi
else
    ERROR_MSG=$(echo "$SEARCH_RESPONSE" | jq -r '.message')
    echo "❌ Search failed: $ERROR_MSG"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ All tests passed successfully!"
echo "=========================================="
