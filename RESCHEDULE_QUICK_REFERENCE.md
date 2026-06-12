# Reschedule Flow - Quick Reference Guide

## How External Adapter Changes Affect Reschedule Flow

### Current State
- **Single endpoint:** `/api/assignments/:id/schedule` (proxies to external API)
- **No differentiation:** All reschedules treated the same
- **No approval workflow:** Direct updates
- **No customer interaction:** Provider-only flow

### Required Changes

## 1. External Adapter Service (`src/services/externalApiAdapter.ts`)

### New Methods Needed:

```typescript
// For earlier reschedules (no approval needed)
static async rescheduleEarlier(
  assignmentId: string,
  token: string,
  data: {
    newScheduledDate: string,
    newTimeWindow: string,
    customerAvailabilityConfirmed: boolean,
    notes?: string
  }
): Promise<any>

// For later reschedules (requires approval)
static async rescheduleLater(
  assignmentId: string,
  token: string,
  data: {
    newScheduledDate: string,
    newTimeWindow: string,
    reasonCode: 'parts_delay' | 'vehicle_issue' | 'emergency' | 'customer_request' | 'other',
    notes?: string
  }
): Promise<any>

// Customer-initiated (from SHS)
static async rescheduleCustomer(
  assignmentId: string,
  token: string,
  data: {
    newScheduledDate: string,
    newTimeWindow?: string,
    cancelled?: boolean
  }
): Promise<any>

// SHS approval/denial
static async approveReschedule(
  rescheduleId: string,
  token: string,
  approved: boolean,
  notes?: string
): Promise<any>

// Customer confirmation (KEEP/DECLINE)
static async confirmCustomerResponse(
  rescheduleId: string,
  token: string,
  response: 'KEEP' | 'DECLINE'
): Promise<any>

// Notify SHS Communications Hub
static async notifySHSCommsHub(
  jobId: string,
  notificationType: string,
  data: any
): Promise<any>
```

## 2. Route Changes (`src/routes/assignments.ts`)

### Replace Current Endpoint:
**OLD:** `PUT /api/assignments/:id/schedule` (single endpoint for all)

### With New Endpoints:

#### A. Customer-Initiated
```
PUT /api/assignments/:id/reschedule/customer
```
- Proxies to external API
- Updates local MongoDB
- Sends inform-only notification to provider
- Logs: `rescheduleSource: 'customer'`

#### B. Provider Earlier (Empowered)
```
PUT /api/assignments/:id/reschedule/earlier
```
- Validates new time is earlier
- Updates job immediately
- Calls SHS Comms Hub for customer notification
- Logs: `direction: 'earlier'`, `status: 'customer_confirmation_pending'`
- Returns response requiring customer confirmation

#### C. Provider Later (Controlled)
```
PUT /api/assignments/:id/reschedule/later
```
- Validates reason code
- Creates pending request
- Routes to SHS Scheduling Queue via Comms Hub
- Logs: `direction: 'later'`, `approvalStatus: 'pending'`
- Returns pending status

#### D. SHS Approval
```
POST /api/assignments/:id/reschedule/approve
POST /api/assignments/:id/reschedule/deny
```
- SHS agent action
- Updates reschedule status
- Notifies provider
- If approved: SHS contacts customer, updates job

#### E. Customer Confirmation
```
POST /api/assignments/:id/reschedule/customer-confirm
```
- Receives KEEP/DECLINE from SHS Comms Hub
- If KEEP: confirms reschedule
- If DECLINE: reverts to original time, notifies provider

## 3. Model Changes

### Job Model (`src/models/job.ts`)
**Add:**
- `rescheduleHistory[]` - Array of reschedule records
- `rescheduleStatus` - Current reschedule state

### JobAssignment Model (`src/models/jobAssignment.ts`)
**Add:**
- `rescheduleRequest{}` - Current pending request details

### New Model: RescheduleLog (`src/models/rescheduleLog.ts`)
**Purpose:** Audit trail for all reschedule activity
**Key Fields:**
- `rescheduleSource`, `rescheduleDirection`, `reasonCode`
- `approvalStatus`, `customerConfirmed`, `customerResponse`
- `penaltyTriggered`

## 4. Request/Response Format Changes

### Request Body Examples:

**Earlier Reschedule:**
```json
{
  "newScheduledDate": "2025-01-15T09:00:00Z",
  "newTimeWindow": "9AM-12PM",
  "customerAvailabilityConfirmed": true,
  "notes": "Can arrive earlier"
}
```

**Later Reschedule:**
```json
{
  "newScheduledDate": "2025-01-20T13:00:00Z",
  "newTimeWindow": "1PM-5PM",
  "reasonCode": "parts_delay",
  "notes": "Parts need to be ordered"
}
```

**Customer Confirmation:**
```json
{
  "rescheduleId": "reschedule_123",
  "response": "KEEP"
}
```

### Response Format:

**Earlier Reschedule Response:**
```json
{
  "success": true,
  "data": {
    "rescheduleId": "reschedule_123",
    "status": "customer_confirmation_pending",
    "newScheduledDate": "2025-01-15T09:00:00Z",
    "customerNotificationSent": true,
    "message": "Customer will be notified. Awaiting confirmation."
  }
}
```

**Later Reschedule Response:**
```json
{
  "success": true,
  "data": {
    "rescheduleId": "reschedule_456",
    "status": "pending_approval",
    "message": "Reschedule request submitted. Awaiting SHS approval."
  }
}
```

## 5. Flow Diagrams

### Scenario A: Customer-Initiated
```
Customer → SHS → External API → Job Board Sync → Provider Notification (Inform)
```

### Scenario B: Provider Earlier
```
Provider → API → Job Update → SHS Comms Hub → Customer SMS
                                                      ↓
                                              Customer Response (KEEP/DECLINE)
                                                      ↓
                                              API → Confirm/Revert → Provider Notification
```

### Scenario C: Provider Later
```
Provider → API → Pending Request → SHS Scheduling Queue
                                              ↓
                                    SHS Agent Review
                                              ↓
                                    Approve/Deny → API
                                              ↓
                                    If Approved: SHS Contacts Customer
                                              ↓
                                    Job Update → Provider Notification
```

## 6. Key Integration Points

### SHS Communications Hub
**Required Endpoints:**
- `POST /api/comms-hub/notify-customer` - Send customer notification
- `POST /api/comms-hub/customer-response` - Receive customer response
- `POST /api/comms-hub/schedule-queue` - Route to SHS agent queue

### External API
**Required Endpoints:**
- `/api/assignments/:id/reschedule/earlier`
- `/api/assignments/:id/reschedule/later`
- `/api/assignments/:id/reschedule/approve`
- `/api/assignments/:id/reschedule/deny`
- `/api/assignments/:id/reschedule/customer-confirm`
- `/api/reschedules/:rescheduleId` - Get status

## 7. Status Values

### Job Status:
- `available` → `assigned` → `rescheduled` (customer-initiated)
- `assigned` → `reschedule_pending` (provider later request)
- `assigned` → `customer_confirmation_pending` (provider earlier request)

### Reschedule Status:
- `pending_approval` - Waiting for SHS agent
- `customer_confirmation_pending` - Waiting for customer KEEP/DECLINE
- `approved` - Approved by SHS
- `denied` - Denied by SHS
- `confirmed` - Customer confirmed (earlier reschedule)
- `declined` - Customer declined (earlier reschedule)

## 8. Notification Types

### Provider Notifications:
- `reschedule_customer_initiated` - Inform-only
- `reschedule_earlier_confirmed` - Customer confirmed
- `reschedule_earlier_declined` - Customer declined
- `reschedule_later_approved` - SHS approved
- `reschedule_later_denied` - SHS denied

### Customer Notifications (via SHS Comms Hub):
- Earlier: "Your technician can arrive earlier at [Time]. Reply KEEP or DECLINE"
- Later (Approved): "Your appointment has been rescheduled to [New Time]"

## 9. Validation Rules

### Earlier Reschedule:
- ✅ New time must be earlier than original
- ✅ Must confirm customer availability
- ✅ Cannot reschedule to past date/time

### Later Reschedule:
- ✅ Must provide valid reason code
- ✅ Cannot reschedule to past date/time
- ✅ Requires approval (no auto-approval)

### Customer Confirmation:
- ✅ Only valid for earlier reschedules
- ✅ Response must be KEEP or DECLINE
- ✅ Must come from SHS Comms Hub (authorized source)

## 10. Audit Logging Requirements

**Every reschedule action must log:**
- `rescheduleSource` - Who initiated (customer/provider)
- `rescheduleDirection` - Earlier/later/same
- `reasonCode` - Why (if provider-initiated)
- `approvalStatus` - Approval state
- `customerConfirmed` - Customer response (if applicable)
- `penaltyTriggered` - Whether penalty applies (later reschedules)
- `timestamp` - When action occurred
- `userId` - Who performed action

## Summary

**Main Impact:** The external adapter must now:
1. **Route to different endpoints** based on reschedule type
2. **Handle approval workflows** for later reschedules
3. **Integrate with SHS Comms Hub** for customer notifications
4. **Support customer confirmation** flow for earlier reschedules
5. **Maintain audit trail** for compliance

**Breaking Changes:**
- Current single endpoint will be deprecated
- New endpoints required for each scenario
- Response format includes additional status fields

**Migration Path:**
- Keep existing endpoint for backward compatibility
- Route to new endpoints based on request body analysis
- Gradual migration as clients update


