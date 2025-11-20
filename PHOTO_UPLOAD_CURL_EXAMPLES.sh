#!/bin/bash

# Photo Upload Wrapper API - cURL Examples
# ==========================================
# This script contains example cURL commands for testing the photo upload wrapper API

# Configuration
BASE_URL="https://shs-1099-job-board.replit.app"
ASSIGNMENT_ID="1102"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Photo Upload Wrapper API - cURL Examples${NC}"
echo "=========================================="
echo ""

# ==========================================
# Step 1: Login to get JWT token
# ==========================================
echo -e "${YELLOW}Step 1: Login to get JWT token${NC}"
echo "Command:"
echo "curl -X POST \"${BASE_URL}/api/auth/login\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"username\":\"vendor@example.com\",\"password\":\"password123\",\"role\":\"registered_user\"}'"
echo ""
echo "Run this command and save the accessToken from the response:"
echo ""

# Uncomment to run:
# LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
#   -H "Content-Type: application/json" \
#   -d '{"username":"vendor@example.com","password":"password123","role":"registered_user"}')
# TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
# echo "Token: $TOKEN"

echo -e "${RED}⚠️  Set your token here:${NC}"
echo "export TOKEN=\"your_token_here\""
echo ""
echo "---"
echo ""

# ==========================================
# Step 2: Get Photo Upload Tokens (Single File)
# ==========================================
echo -e "${YELLOW}Step 2: Get Photo Upload Tokens (Single File)${NC}"
echo "Command:"
echo "curl -X POST \"${BASE_URL}/api/assignments/${ASSIGNMENT_ID}/photo-upload-tokens\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -d '{"
echo "    \"files\": ["
echo "      {"
echo "        \"fileName\": \"part-photo.png\","
echo "        \"mimeType\": \"image/png\""
echo "      }"
echo "    ]"
echo "  }'"
echo ""
echo "Expected Response:"
echo "{"
echo "  \"success\": true,"
echo "  \"data\": {"
echo "    \"tokens\": [{"
echo "      \"token\": \"uuid-here\","
echo "      \"uploadUrl\": \"https://s3-url\","
echo "      \"uploadFields\": { ... },"
echo "      \"url\": \"https://s3-url/path/to/image\","
echo "      \"imageUrl\": \"https://s3-url/path/to/image\","
echo "      \"photoToken\": \"uuid-here\""
echo "    }]"
echo "  }"
echo "}"
echo ""
echo "---"
echo ""

# ==========================================
# Step 3: Get Photo Upload Tokens (Multiple Files)
# ==========================================
echo -e "${YELLOW}Step 3: Get Photo Upload Tokens (Multiple Files)${NC}"
echo "Command:"
echo "curl -X POST \"${BASE_URL}/api/assignments/${ASSIGNMENT_ID}/photo-upload-tokens\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -d '{"
echo "    \"files\": ["
echo "      {\"fileName\": \"photo-1.png\", \"mimeType\": \"image/png\"},"
echo "      {\"fileName\": \"photo-2.jpg\", \"mimeType\": \"image/jpeg\"},"
echo "      {\"fileName\": \"photo-3.heic\", \"mimeType\": \"image/heic\"}"
echo "    ]"
echo "  }'"
echo ""
echo "---"
echo ""

# ==========================================
# Step 4: Upload to S3 (Example - requires actual file)
# ==========================================
echo -e "${YELLOW}Step 4: Upload to S3 (Direct Upload)${NC}"
echo "Note: This step requires copying the uploadFields from Step 2 response"
echo ""
echo "Example command structure:"
echo "curl -X POST \"<uploadUrl from response>\" \\"
echo "  -F \"Content-Type=<from uploadFields>\" \\"
echo "  -F \"bucket=<from uploadFields>\" \\"
echo "  -F \"X-Amz-Algorithm=<from uploadFields>\" \\"
echo "  -F \"X-Amz-Credential=<from uploadFields>\" \\"
echo "  -F \"X-Amz-Date=<from uploadFields>\" \\"
echo "  -F \"key=<from uploadFields>\" \\"
echo "  -F \"Policy=<from uploadFields>\" \\"
echo "  -F \"X-Amz-Signature=<from uploadFields>\" \\"
echo "  -F \"file=@/path/to/your/image.png\""
echo ""
echo "---"
echo ""

# ==========================================
# Step 5: Create Part with Photo Tokens
# ==========================================
echo -e "${YELLOW}Step 5: Create Part with Photo Tokens${NC}"
echo "Command:"
echo "curl -X POST \"${BASE_URL}/api/assignments/${ASSIGNMENT_ID}/parts\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -d '{"
echo "    \"brand\": \"Samsung\","
echo "    \"applianceType\": \"Cooktop\","
echo "    \"partNumber\": \"12345\","
echo "    \"serialNumber\": \"SN-12345\","
echo "    \"quantity\": 1,"
echo "    \"partType\": \"local\","
echo "    \"notes\": \"Test part with photo\","
echo "    \"photoTokens\": [\"<photoToken from Step 2>\"]"
echo "  }'"
echo ""
echo "---"
echo ""

# ==========================================
# Error Examples
# ==========================================
echo -e "${RED}Error Examples${NC}"
echo ""

echo -e "${YELLOW}Error 1: Missing Files Array${NC}"
echo "curl -X POST \"${BASE_URL}/api/assignments/${ASSIGNMENT_ID}/photo-upload-tokens\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -d '{}'"
echo ""
echo "Expected: 400 Bad Request"
echo "Message: \"Files array is required with at least one file...\""
echo ""

echo -e "${YELLOW}Error 2: Empty Files Array${NC}"
echo "curl -X POST \"${BASE_URL}/api/assignments/${ASSIGNMENT_ID}/photo-upload-tokens\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -d '{\"files\":[]}'"
echo ""
echo "Expected: 400 Bad Request"
echo ""

echo -e "${YELLOW}Error 3: Missing Authorization${NC}"
echo "curl -X POST \"${BASE_URL}/api/assignments/${ASSIGNMENT_ID}/photo-upload-tokens\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"files\":[{\"fileName\":\"test.png\",\"mimeType\":\"image/png\"}]}'"
echo ""
echo "Expected: 401 Unauthorized"
echo "Message: \"No authorization token provided...\""
echo ""

echo -e "${YELLOW}Error 4: Invalid File Object (Missing mimeType)${NC}"
echo "curl -X POST \"${BASE_URL}/api/assignments/${ASSIGNMENT_ID}/photo-upload-tokens\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -d '{\"files\":[{\"fileName\":\"test.png\"}]}'"
echo ""
echo "Expected: 400 Bad Request"
echo "Message: \"File at index 0 is missing required field 'mimeType' (string)\""
echo ""

echo "=========================================="
echo -e "${GREEN}End of Examples${NC}"
echo ""
echo "To use these examples:"
echo "1. Run Step 1 to get a token"
echo "2. Export the token: export TOKEN=\"your_token_here\""
echo "3. Run the other steps in order"
echo ""
