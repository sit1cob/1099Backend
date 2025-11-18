# Reschedule API - JSON Changes Reference

## Endpoint Changes

### Old Endpoint
```
PUT /api/assignments/{assignmentId}/schedule
POST /api/assignments/{assignmentId}/schedule
```

### New Endpoints
```
PUT /api/assignments/{assignmentId}/reschedule/earlier
PUT /api/assignments/{assignmentId}/reschedule/later
PUT /api/assignments/{assignmentId}/reschedule/customer
```

---

## Request JSON Changes

### OLD Request (Current)

**Endpoint:** `PUT /api/assignments/{assignmentId}/schedule`

```json
{
  "newScheduledDate": "2024-03-22",
  "newTimeWindow": "1PM-5PM",
  "rescheduleReason": "Parts not available",
  "vendorNotes": "Need to order specific part"
}
```

---

### NEW Request - Earlier Reschedule

**Endpoint:** `PUT /api/assignments/{assignmentId}/reschedule/earlier`

```json
{
  "newScheduledDate": "2025-01-15T09:00:00Z",
  "newTimeWindow": "9AM-12PM",
  "customerAvailabilityConfirmed": true,
  "notes": "Optional note"
}
```

**Changes:**
- ❌ Removed: `rescheduleReason`
- ❌ Removed: `vendorNotes`
- ✅ Added: `customerAvailabilityConfirmed` (required, must be `true`)
- ✅ Changed: `vendorNotes` → `notes` (optional)
- ✅ Changed: Date format to ISO 8601 (recommended)

---

### NEW Request - Later Reschedule

**Endpoint:** `PUT /api/assignments/{assignmentId}/reschedule/later`

```json
{
  "newScheduledDate": "2025-01-20T13:00:00Z",
  "newTimeWindow": "1PM-5PM",
  "reasonCode": "parts_delay",
  "notes": "Parts need to be ordered"
}
```

**Changes:**
- ❌ Removed: `rescheduleReason`
- ❌ Removed: `vendorNotes`
- ✅ Added: `reasonCode` (required, must be one of: `"parts_delay"`, `"vehicle_issue"`, `"emergency"`, `"customer_request"`, `"other"`)
- ✅ Changed: `vendorNotes` → `notes` (optional)
- ✅ Changed: Date format to ISO 8601 (recommended)

**Valid reasonCode Values:**
- `"parts_delay"` - Parts not available, need to order
- `"vehicle_issue"` - Vehicle breakdown or issue
- `"emergency"` - Emergency situation
- `"customer_request"` - Customer requested via SHS
- `"other"` - Other reason (must provide notes)

---

### NEW Request - Customer-Initiated Reschedule

**Endpoint:** `PUT /api/assignments/{assignmentId}/reschedule/customer`

```json
{
  "newScheduledDate": "2025-01-18T10:00:00Z",
  "newTimeWindow": "10AM-2PM",
  "cancelled": false,
  "notes": "Rescheduled by customer via SHS"
}
```

**Note:** This endpoint is typically used by SHS, not Android app.

---

## Response JSON Changes

### OLD Response (Current)

**Endpoint:** `PUT /api/assignments/{assignmentId}/schedule`

```json
{
  "success": true,
  "message": "Assignment rescheduled successfully",
  "data": {
    "assignmentId": "assignment_123",
    "jobId": "job_456",
    "newScheduledDate": "2024-03-22T00:00:00Z",
    "newTimeWindow": "1PM-5PM",
    "rescheduleReason": "Parts not available",
    "notes": "Rescheduled to 2024-03-22 (1PM-5PM). Reason: Parts not available",
    "vendorNotes": "Need to order specific part"
  }
}
```

---

### NEW Response - Earlier Reschedule

**Endpoint:** `PUT /api/assignments/{assignmentId}/reschedule/earlier`

**Success Response:**
```json
{
  "success": true,
  "data": {
    "rescheduleId": "reschedule_123",
    "status": "customer_confirmation_pending",
    "newScheduledDate": "2025-01-15T09:00:00Z",
    "newTimeWindow": "9AM-12PM",
    "customerNotificationSent": true,
    "message": "Customer will be notified. Awaiting confirmation."
  }
}
```

**Changes:**
- ✅ Added: `rescheduleId` (save this for status checks)
- ✅ Added: `status` field (values: `"customer_confirmation_pending"`, `"confirmed"`, `"declined"`)
- ✅ Added: `customerNotificationSent` (boolean)
- ❌ Removed: `assignmentId`, `jobId` from response
- ❌ Removed: `rescheduleReason`, `vendorNotes` from response
- ✅ Changed: `message` moved inside `data` object

**Error Response:**
```json
{
  "success": false,
  "message": "New time must be earlier than original appointment time",
  "code": "INVALID_TIME"
}
```

---

### NEW Response - Later Reschedule

**Endpoint:** `PUT /api/assignments/{assignmentId}/reschedule/later`

**Success Response:**
```json
{
  "success": true,
  "data": {
    "rescheduleId": "reschedule_456",
    "status": "pending_approval",
    "message": "Reschedule request submitted. Awaiting SHS approval.",
    "estimatedReviewTime": "2-4 hours"
  }
}
```

**Changes:**
- ✅ Added: `rescheduleId` (save this for status checks)
- ✅ Added: `status` field (values: `"pending_approval"`, `"approved"`, `"denied"`)
- ✅ Added: `estimatedReviewTime` (optional)
- ❌ Removed: `assignmentId`, `jobId` from response
- ❌ Removed: `newScheduledDate`, `newTimeWindow` from response (until approved)
- ❌ Removed: `rescheduleReason`, `vendorNotes` from response
- ✅ Changed: `message` moved inside `data` object

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid reason code. Must be one of: parts_delay, vehicle_issue, emergency, customer_request, other",
  "code": "INVALID_REASON_CODE"
}
```

---

## Status Check Response

### NEW Endpoint: Get Reschedule Status

**Endpoint:** `GET /api/assignments/{assignmentId}/reschedule/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "rescheduleId": "reschedule_123",
    "status": "pending_approval",
    "direction": "later",
    "reasonCode": "parts_delay",
    "proposedDate": "2025-01-20T13:00:00Z",
    "proposedTimeWindow": "1PM-5PM",
    "requestedAt": "2025-01-15T10:00:00Z",
    "approvalStatus": "pending",
    "customerConfirmed": false,
    "message": "Awaiting SHS approval"
  }
}
```

**Status Values:**
- `"pending_approval"` - Waiting for SHS agent approval (later reschedules)
- `"customer_confirmation_pending"` - Waiting for customer KEEP/DECLINE (earlier reschedules)
- `"approved"` - Approved by SHS
- `"denied"` - Denied by SHS
- `"confirmed"` - Customer confirmed (earlier reschedule)
- `"declined"` - Customer declined (earlier reschedule)

---

## Field Mapping Reference

### Request Fields

| Old Field | New Field (Earlier) | New Field (Later) | Required? |
|-----------|---------------------|-------------------|-----------|
| `newScheduledDate` | `newScheduledDate` | `newScheduledDate` | ✅ Yes |
| `newTimeWindow` | `newTimeWindow` | `newTimeWindow` | ✅ Yes |
| `rescheduleReason` | ❌ Removed | → `reasonCode` | ✅ Yes (for later) |
| `vendorNotes` | → `notes` | → `notes` | ❌ Optional |
| ❌ | `customerAvailabilityConfirmed` | ❌ | ✅ Yes (for earlier) |

### Response Fields

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `success` | `success` | Same |
| `message` | `data.message` | Moved inside data |
| `data.assignmentId` | ❌ Removed | Not in response |
| `data.jobId` | ❌ Removed | Not in response |
| `data.newScheduledDate` | `data.newScheduledDate` | Only in earlier reschedule response |
| `data.newTimeWindow` | `data.newTimeWindow` | Only in earlier reschedule response |
| `data.rescheduleReason` | ❌ Removed | Not in response |
| `data.vendorNotes` | ❌ Removed | Not in response |
| ❌ | `data.rescheduleId` | **NEW** - Save for status checks |
| ❌ | `data.status` | **NEW** - Check for pending states |
| ❌ | `data.customerNotificationSent` | **NEW** - Only in earlier response |
| ❌ | `data.estimatedReviewTime` | **NEW** - Only in later response |

---

## Error Response Format

### Old Error Response
```json
{
  "success": false,
  "message": "Failed to reschedule assignment"
}
```

### New Error Response
```json
{
  "success": false,
  "message": "New time must be earlier than original appointment time",
  "code": "INVALID_TIME"
}
```

**Changes:**
- ✅ Added: `code` field for error categorization

**Common Error Codes:**
- `"INVALID_TIME"` - New time must be earlier (for earlier reschedule)
- `"INVALID_REASON_CODE"` - Invalid reason code (for later reschedule)
- `"CUSTOMER_NOT_CONFIRMED"` - Customer availability not confirmed (for earlier reschedule)
- `"RESCHEDULE_PENDING"` - Another reschedule request is pending
- `"UNAUTHORIZED"` - Not authorized to reschedule

---

## Complete JSON Examples

### Example 1: Earlier Reschedule Flow

**Request:**
```json
PUT /api/assignments/assignment_123/reschedule/earlier

{
  "newScheduledDate": "2025-01-15T09:00:00Z",
  "newTimeWindow": "9AM-12PM",
  "customerAvailabilityConfirmed": true,
  "notes": "Can arrive earlier today"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rescheduleId": "reschedule_789",
    "status": "customer_confirmation_pending",
    "newScheduledDate": "2025-01-15T09:00:00Z",
    "newTimeWindow": "9AM-12PM",
    "customerNotificationSent": true,
    "message": "Customer will be notified. Awaiting confirmation."
  }
}
```

---

### Example 2: Later Reschedule Flow

**Request:**
```json
PUT /api/assignments/assignment_123/reschedule/later

{
  "newScheduledDate": "2025-01-20T13:00:00Z",
  "newTimeWindow": "1PM-5PM",
  "reasonCode": "parts_delay",
  "notes": "Parts need to be ordered"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rescheduleId": "reschedule_456",
    "status": "pending_approval",
    "message": "Reschedule request submitted. Awaiting SHS approval.",
    "estimatedReviewTime": "2-4 hours"
  }
}
```

**Status Check (after approval):**
```json
GET /api/assignments/assignment_123/reschedule/status

{
  "success": true,
  "data": {
    "rescheduleId": "reschedule_456",
    "status": "approved",
    "direction": "later",
    "reasonCode": "parts_delay",
    "proposedDate": "2025-01-20T13:00:00Z",
    "proposedTimeWindow": "1PM-5PM",
    "requestedAt": "2025-01-15T10:00:00Z",
    "approvedAt": "2025-01-15T14:30:00Z",
    "approvalStatus": "approved",
    "customerConfirmed": false,
    "message": "Reschedule approved"
  }
}
```

---

## Summary of Changes

### Request Changes
1. **Endpoint:** `/schedule` → `/reschedule/earlier` or `/reschedule/later`
2. **Fields Removed:** `rescheduleReason`, `vendorNotes`
3. **Fields Added:** 
   - `reasonCode` (for later reschedule)
   - `customerAvailabilityConfirmed` (for earlier reschedule)
4. **Fields Renamed:** `vendorNotes` → `notes` (optional)

### Response Changes
1. **Fields Removed:** `assignmentId`, `jobId`, `rescheduleReason`, `vendorNotes`
2. **Fields Added:** 
   - `rescheduleId` (required for status checks)
   - `status` (pending_approval, customer_confirmation_pending, etc.)
   - `customerNotificationSent` (earlier reschedule)
   - `estimatedReviewTime` (later reschedule)
3. **Structure Changed:** `message` moved inside `data` object
4. **Error Format:** Added `code` field

---

**Last Updated:** [Date]  
**Version:** 1.0


