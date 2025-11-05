# Feedback API Documentation

## Overview
The Feedback API allows authenticated users to submit feedback surveys with device metadata. User IDs are automatically extracted from JWT authentication tokens and stored with each feedback submission.

## Base URL
```
http://localhost:5001
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

Get your token by logging in via `POST /api/auth/login`

## Endpoints

### 1. GET /api/feedback/config
Retrieves the feedback survey configuration.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "User Feedback Survey",
    "questions": [
      {
        "id": "q1",
        "question": "How satisfied are you with the app performance?",
        "type": "rating"
      },
      {
        "id": "q2",
        "question": "Any suggestions to improve your experience?",
        "type": "text"
      }
    ]
  }
}
```

### 2. POST /api/feedback/submit
Submits user feedback. The userId is automatically extracted from the authentication token.

**Authentication:** Required

**Request Body:**
```json
{
  "metadata": {
    "appVersion": "1.2.3",
    "deviceModel": "Pixel 6",
    "osVersion": "Android 13",
    "timestamp": "2025-11-05T04:37:30Z"
  },
  "answers": [
    {
      "questionId": "q1",
      "answer": 4
    },
    {
      "questionId": "q2",
      "answer": "Add dark mode support"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "673a1234567890abcdef1234",
    "userId": "673a9876543210fedcba4321",
    "submittedAt": "2025-11-05T10:37:30.123Z"
  },
  "message": "Feedback submitted successfully"
}
```

### 3. GET /api/feedback
Retrieves feedback submissions.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Maximum number of entries to retrieve (default: 100)
- `userId` (optional, admin only): Filter by specific user ID

**Authorization Rules:**
- **Admin users**: Can view all feedback or filter by userId
- **Regular users**: Can only view their own feedback

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "673a1234567890abcdef1234",
      "userId": {
        "_id": "673a9876543210fedcba4321",
        "username": "testuser",
        "email": "test@example.com"
      },
      "metadata": {
        "appVersion": "1.2.3",
        "deviceModel": "Pixel 6",
        "osVersion": "Android 13",
        "timestamp": "2025-11-05T04:37:30Z"
      },
      "answers": [
        {
          "questionId": "q1",
          "answer": 4
        },
        {
          "questionId": "q2",
          "answer": "Add dark mode support"
        }
      ],
      "submittedAt": "2025-11-05T10:37:30.123Z",
      "createdAt": "2025-11-05T10:37:30.123Z",
      "updatedAt": "2025-11-05T10:37:30.123Z"
    }
  ],
  "count": 1
}
```

## Data Storage

### MongoDB Schema
Feedback is stored in MongoDB with the following schema:

```typescript
{
  userId: ObjectId (required, indexed, ref: 'User'),
  metadata: {
    appVersion: String (required),
    deviceModel: String (required),
    osVersion: String (required),
    timestamp: String (required)
  },
  answers: [
    {
      questionId: String (required),
      answer: Mixed (required) // Can be number or string
    }
  ],
  submittedAt: Date (auto-generated),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

### Indexes
- `userId`: For efficient user-specific queries
- `submittedAt`: For chronological sorting
- `metadata.appVersion`: For version-based analytics

## Security Features

1. **JWT Authentication**: All endpoints require valid authentication
2. **User Isolation**: Regular users can only access their own feedback
3. **Admin Access Control**: Only admins can view all feedback or filter by userId
4. **Automatic User Association**: userId is extracted from token, preventing spoofing
5. **Input Validation**: All inputs are validated before storage

## Testing with Postman

1. Import the Postman collection: `postman/Feedback_API.postman_collection.json`
2. Set environment variables:
   - `base_url`: Your API base URL (default: http://localhost:5001)
   - `auth_token`: Your JWT token (get from login endpoint)
3. First, use the "Login (Get Auth Token)" request to authenticate
4. Copy the token from the response and set it in the `auth_token` variable
5. Test the feedback endpoints

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "metadata and answers are required"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to submit feedback"
}
```

## Files Structure

```
new-mongo-app/
├── src/
│   ├── models/
│   │   └── feedback.ts          # MongoDB schema definition
│   ├── routes/
│   │   └── feedback.ts          # Route handlers
│   └── server.ts                # Server setup (includes feedback routes)
├── postman/
│   └── Feedback_API.postman_collection.json
└── FEEDBACK_API.md              # This file
```

## Example Usage

### 1. Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}'
```

### 2. Get Feedback Config
```bash
curl -X GET http://localhost:5001/api/feedback/config \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Submit Feedback
```bash
curl -X POST http://localhost:5001/api/feedback/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "metadata": {
      "appVersion": "1.2.3",
      "deviceModel": "Pixel 6",
      "osVersion": "Android 13",
      "timestamp": "2025-11-05T04:37:30Z"
    },
    "answers": [
      {"questionId": "q1", "answer": 4},
      {"questionId": "q2", "answer": "Great app!"}
    ]
  }'
```

### 4. Get Feedback
```bash
curl -X GET "http://localhost:5001/api/feedback?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Notes

- The feedback configuration is currently static but can be made dynamic by storing it in the database
- All feedback submissions are timestamped automatically
- The API supports both rating (numeric) and text answers
- Device metadata helps track feedback across different platforms and versions
- User information is populated in the response when fetching feedback (includes username and email)
