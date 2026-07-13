#!/bin/bash

# Comprehensive API Test Script
# Tests all the APIs that were previously failing

BASE_URL="https://app1099-api.searskairos.ai"

echo "=========================================="
echo "Testing All Previously Failing APIs"
echo "=========================================="
echo ""

# Step 1: Login to get fresh token
echo "Step 1: Getting fresh access token..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_vendor",
    "password": "Demo2025@",
    "role": "registered_user"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Login failed - cannot proceed with tests"
    exit 1
fi

echo "✓ Login successful"
echo "✓ Token: ${ACCESS_TOKEN:0:30}..."
echo ""

# Test 1: Models Search API
echo "=========================================="
echo "Test 1: Models Search API"
echo "GET /api/assignments/13092/models/search?q=VA6013"
echo "=========================================="
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "${BASE_URL}/api/assignments/13092/models/search?q=VA6013" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq '.'

if [ "$HTTP_STATUS" == "200" ]; then
    echo "✓ Test 1 PASSED"
else
    echo "❌ Test 1 FAILED"
fi
echo ""

# Test 2: Assignment Details API (v3)
echo "=========================================="
echo "Test 2: Assignment Details API (v3)"
echo "GET /api/v3/assignments/13092"
echo "=========================================="
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "${BASE_URL}/api/v3/assignments/13092" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq '.'

if [ "$HTTP_STATUS" == "200" ]; then
    echo "✓ Test 2 PASSED"
else
    echo "❌ Test 2 FAILED"
fi
echo ""

# Test 3: Model Parts API
echo "=========================================="
echo "Test 3: Model Parts API"
echo "GET /api/assignments/13092/models/VA6013/parts"
echo "=========================================="
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "${BASE_URL}/api/assignments/13092/models/VA6013/parts" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response (first 500 chars):"
echo "$BODY" | jq '.' | head -c 500
echo "..."

if [ "$HTTP_STATUS" == "200" ]; then
    echo "✓ Test 3 PASSED"
else
    echo "❌ Test 3 FAILED"
fi
echo ""

# Test 4: Feedback API (POST)
echo "=========================================="
echo "Test 4: Feedback API"
echo "POST /api/feedback"
echo "=========================================="
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "${BASE_URL}/api/feedback" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bug",
    "message": "Test feedback from API test script",
    "page": "/test"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq '.'

if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "201" ]; then
    echo "✓ Test 4 PASSED"
else
    echo "❌ Test 4 FAILED"
fi
echo ""

# Test 5: Another Models Search (different query)
echo "=========================================="
echo "Test 5: Models Search - Different Query"
echo "GET /api/assignments/13092/models/search?q=LFXS26973S"
echo "=========================================="
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "${BASE_URL}/api/assignments/13092/models/search?q=LFXS26973S" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq '.'

if [ "$HTTP_STATUS" == "200" ]; then
    echo "✓ Test 5 PASSED"
else
    echo "❌ Test 5 FAILED"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "All tests completed!"
echo ""
echo "If all tests show status 200, the issue is RESOLVED ✓"
echo "If any test shows 401, there's still an issue with that endpoint"
echo "=========================================="
