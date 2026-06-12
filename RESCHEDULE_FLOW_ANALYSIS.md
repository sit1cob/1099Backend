# 1099 Job Reschedule Flow - Impact Analysis & Implementation Plan

## Executive Summary

This document analyzes how changes to the external adapter affect the 1099 Job Reschedule Flow and outlines the required changes to support the new three-scenario reschedule system (Customer-Initiated, Provider Earlier, Provider Later).

---

## Current State Analysis

### Existing Reschedule Implementation

**Current Endpoint:** `/api/assignments/:id/schedule` (PUT/POST)

**Current Flow:**
1. Provider sends reschedule request with `newScheduledDate`, `newTimeWindow`, `rescheduleReason`, `vendorNotes`
2. Request is proxied to external API at `/api/assignments/:id/schedule`
3. External API handles the reschedule
4. Local MongoDB job status is updated to "rescheduled"
5. Assignment notes are updated

**Limitations:**
- ❌ No distinction between earlier vs later reschedules
- ❌ No approval workflow for later reschedules
- ❌ No integration with SHS Communications Hub
- ❌ No audit logging for reschedule source/direction
- ❌ No customer confirmation flow for earlier reschedules
- ❌ No reason code categorization

---

## Impact of External Adapter Changes

### Current External Adapter Role

The `ExternalApiAdapter` currently:
- Proxies all reschedule requests to external API (`/api/assignments/:id/schedule`)
- Transforms request body format (Android → External API format)
- Returns external API response as-is
- No business logic or validation

### Required Changes to External Adapter

The external adapter needs to support:

1. **New Endpoints:**
   - `/api/assignments/:id/reschedule/earlier` - Provider earlier reschedule
   - `/api/assignments/:id/reschedule/later` - Provider later reschedule (requires approval)
   - `/api/assignments/:id/reschedule/approve` - SHS approval endpoint
   - `/api/assignments/:id/reschedule/deny` - SHS denial endpoint
   - `/api/assignments/:id/reschedule/customer-confirm` - Customer confirmation for earlier reschedule

2. **Enhanced Request/Response Format:**
   - Include `rescheduleSource` (customer | provider)
   - Include `rescheduleDirection` (earlier | later | same)
   - Include `reasonCode` (parts_delay | vehicle_issue | emergency | customer_request | other)
   - Include `customerConfirmed` (for earlier reschedules)
   - Include `approvalStatus` (pending | approved | denied)

3. **SHS Communications Hub Integration:**
   - New method: `notifySHSCommsHub()` to send customer notifications
   - Support for customer confirmation callbacks (KEEP/DECLINE)

---

## Required Model Changes

### 1. Job Model Enhancements

**File:** `src/models/job.ts`

**New Fields:**
```typescript
rescheduleHistory: [{
  rescheduleId: String,
  rescheduleSource: String, // 'customer' | 'provider'
  rescheduleDirection: String, // 'earlier' | 'later' | 'same'
  reasonCode: String, // 'parts_delay' | 'vehicle_issue' | 'emergency' | 'customer_request' | 'other'
  oldScheduledDate: Date,
  newScheduledDate: Date,
  oldTimeWindow: String,
  newTimeWindow: String,
  requestedBy: String, // userId or 'customer' or 'shs'
  requestedAt: Date,
  approvalStatus: String, // 'pending' | 'approved' | 'denied' | 'auto_approved'
  approvedBy: String, // userId or 'shs_auto'
  approvedAt: Date,
  customerConfirmed: Boolean, // For earlier reschedules
  customerResponse: String, // 'KEEP' | 'DECLINE' | null
  notes: String,
  createdAt: Date
}],
rescheduleStatus: String, // 'none' | 'pending_approval' | 'approved' | 'denied' | 'customer_confirmation_pending'
```

### 2. JobAssignment Model Enhancements

**File:** `src/models/jobAssignment.ts`

**New Fields:**
```typescript
rescheduleRequest: {
  rescheduleId: String,
  direction: String, // 'earlier' | 'later'
  reasonCode: String,
  proposedDate: Date,
  proposedTimeWindow: String,
  notes: String,
  status: String, // 'pending' | 'approved' | 'denied' | 'customer_confirmed' | 'customer_declined'
  requestedAt: Date,
  customerConfirmed: Boolean,
  customerResponse: String
}
```

### 3. New RescheduleLog Model (for audit trail)

**File:** `src/models/rescheduleLog.ts` (NEW)

```typescript
{
  rescheduleId: String, // Unique ID for this reschedule request
  jobId: ObjectId,
  assignmentId: ObjectId,
  vendorId: ObjectId,
  rescheduleSource: String, // 'customer' | 'provider'
  rescheduleDirection: String, // 'earlier' | 'later' | 'same'
  reasonCode: String,
  oldScheduledDate: Date,
  newScheduledDate: Date,
  oldTimeWindow: String,
  newTimeWindow: String,
  approvalStatus: String, // 'pending' | 'approved' | 'denied' | 'auto_approved'
  customerConfirmed: Boolean,
  customerResponse: String, // 'KEEP' | 'DECLINE' | null
  penaltyTriggered: Boolean,
  requestedBy: String, // userId
  approvedBy: String, // userId or 'shs_auto'
  approvedAt: Date,
  notes: String,
  shsCommsHubNotificationSent: Boolean,
  shsCommsHubNotificationId: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Required Route/Endpoint Changes

### 1. Enhanced Reschedule Endpoints

**File:** `src/routes/assignments.ts`

#### A. Customer-Initiated Reschedule
**Endpoint:** `PUT /api/assignments/:id/reschedule/customer`

**Flow:**
- SHS updates appointment in WOM
- External API receives update
- Job board syncs automatically
- Provider receives inform-only notification

**Implementation:**
- Proxy to external API: `/api/assignments/:id/reschedule/customer`
- Update local MongoDB with `rescheduleSource: 'customer'`
- Send notification to provider (inform-only)

#### B. Provider Earlier Reschedule (Empowered)
**Endpoint:** `PUT /api/assignments/:id/reschedule/earlier`

**Flow:**
1. Provider selects "Move Earlier"
2. System validates: new time must be earlier than original
3. Provider confirms customer availability
4. System immediately updates job time
5. Sends notification to SHS Comms Hub
6. Customer receives auto-message with KEEP/DECLINE option
7. If customer DECLINES → auto-revert to original time

**Request Body:**
```json
{
  "newScheduledDate": "2025-01-15",
  "newTimeWindow": "9AM-12PM",
  "customerAvailabilityConfirmed": true,
  "notes": "Optional note"
}
```

**Implementation:**
- Validate new time is earlier
- Update job immediately
- Call SHS Comms Hub API to send customer notification
- Log reschedule with `direction: 'earlier'`, `customerConfirmed: false`
- Set status to `customer_confirmation_pending`
- Return response with customer confirmation required flag

#### C. Provider Later Reschedule (Controlled)
**Endpoint:** `PUT /api/assignments/:id/reschedule/later`

**Flow:**
1. Provider selects "Request Reschedule (Later)"
2. Provider provides reason code and proposed time
3. Status updates to "Reschedule Pending – Provider Request"
4. Request routes to SHS Scheduling Queue
5. SHS agent reviews and approves/denies
6. Provider and customer notified of decision

**Request Body:**
```json
{
  "newScheduledDate": "2025-01-20",
  "newTimeWindow": "1PM-5PM",
  "reasonCode": "parts_delay", // parts_delay | vehicle_issue | emergency | customer_request | other
  "notes": "Parts need to be ordered"
}
```

**Implementation:**
- Validate reason code
- Create reschedule request with `status: 'pending'`
- Call SHS Comms Hub API to route to scheduling queue
- Log reschedule with `direction: 'later'`, `approvalStatus: 'pending'`
- Return response with pending approval status

### 2. SHS Approval Endpoints

**Endpoint:** `POST /api/assignments/:id/reschedule/approve`
**Endpoint:** `POST /api/assignments/:id/reschedule/deny`

**Flow:**
- SHS agent reviews request
- Approves or denies
- System updates reschedule status
- Notifies provider
- If approved, SHS contacts customer and confirms new time
- Updates job with new schedule

### 3. Customer Confirmation Endpoint

**Endpoint:** `POST /api/assignments/:id/reschedule/customer-confirm`

**Flow:**
- Customer responds KEEP or DECLINE via SHS Comms Hub
- Comms Hub calls this endpoint
- If KEEP → confirm reschedule
- If DECLINE → revert to original time and notify provider

**Request Body:**
```json
{
  "response": "KEEP", // or "DECLINE"
  "rescheduleId": "reschedule_123"
}
```

---

## Required Service Changes

### 1. External Adapter Service Enhancements

**File:** `src/services/externalApiAdapter.ts`

**New Methods:**

```typescript
// Notify SHS Communications Hub
static async notifySHSCommsHub(
  jobId: string,
  notificationType: 'earlier_reschedule' | 'later_reschedule' | 'customer_reschedule',
  data: {
    customerPhone: string,
    customerEmail: string,
    oldTime: string,
    newTime: string,
    rescheduleId: string,
    actionRequired?: 'KEEP' | 'DECLINE' // For earlier reschedules
  }
): Promise<any>

// Get reschedule status from external API
static async getRescheduleStatus(rescheduleId: string, token: string): Promise<any>

// Approve/deny reschedule (SHS agent action)
static async approveReschedule(
  rescheduleId: string,
  token: string,
  approved: boolean,
  notes?: string
): Promise<any>
```

### 2. New Reschedule Service

**File:** `src/services/rescheduleService.ts` (NEW)

**Responsibilities:**
- Validate reschedule requests
- Determine if approval required
- Handle customer confirmation logic
- Manage reschedule state transitions
- Trigger notifications
- Log audit trail

**Key Methods:**
```typescript
async requestReschedule(
  assignmentId: string,
  direction: 'earlier' | 'later',
  newDate: Date,
  newTimeWindow: string,
  reasonCode: string,
  requestedBy: string
): Promise<RescheduleResult>

async handleCustomerConfirmation(
  rescheduleId: string,
  response: 'KEEP' | 'DECLINE'
): Promise<void>

async approveRescheduleRequest(
  rescheduleId: string,
  approvedBy: string,
  notes?: string
): Promise<void>

async logRescheduleActivity(
  rescheduleLog: RescheduleLogData
): Promise<void>
```

---

## Notification System Changes

### 1. Provider Notifications

**Scenario A (Customer-Initiated):**
```
Title: "Customer Rescheduled Appointment"
Body: "Customer rescheduled your service appointment from [Old Time] to [New Time]. No action needed."
Type: "reschedule_customer_initiated"
```

**Scenario B (Earlier - Approved):**
```
Title: "Reschedule Confirmed"
Body: "Your earlier arrival time has been confirmed. New appointment: [New Time]"
Type: "reschedule_earlier_confirmed"
```

**Scenario B (Earlier - Declined):**
```
Title: "Reschedule Declined"
Body: "Customer declined earlier arrival. Original appointment time remains: [Original Time]"
Type: "reschedule_earlier_declined"
```

**Scenario C (Later - Approved):**
```
Title: "Reschedule Approved"
Body: "Your reschedule request has been approved. New appointment: [New Date/Time]"
Type: "reschedule_later_approved"
```

**Scenario C (Later - Denied):**
```
Title: "Reschedule Not Approved"
Body: "Your reschedule request was not approved. Please complete as scheduled: [Original Time]"
Type: "reschedule_later_denied"
```

### 2. Customer Notifications (via SHS Comms Hub)

**Scenario B (Earlier):**
```
Message: "Your Sears technician is able to arrive earlier today at [New Time]. Reply 'KEEP' to confirm or 'DECLINE' to stay with your original time."
```

**Scenario C (Later - Approved):**
```
Message: "Your Sears service appointment for [Appliance] has been rescheduled to [New Date/Time]."
```

---

## Integration Points

### 1. SHS Communications Hub Integration

**Required API Endpoints (to be implemented by SHS):**

1. **Send Customer Notification**
   - `POST /api/comms-hub/notify-customer`
   - Sends SMS/email to customer
   - Returns notification ID for tracking

2. **Customer Response Callback**
   - `POST /api/comms-hub/customer-response`
   - Receives customer KEEP/DECLINE response
   - Triggers reschedule confirmation/reversion

3. **Route to Scheduling Queue**
   - `POST /api/comms-hub/schedule-queue`
   - Routes later reschedule requests to SHS agent queue

### 2. External API Integration

**Required External API Endpoints:**

1. `/api/assignments/:id/reschedule/earlier` - Earlier reschedule
2. `/api/assignments/:id/reschedule/later` - Later reschedule request
3. `/api/assignments/:id/reschedule/approve` - Approve reschedule
4. `/api/assignments/:id/reschedule/deny` - Deny reschedule
5. `/api/assignments/:id/reschedule/customer-confirm` - Customer confirmation
6. `/api/reschedules/:rescheduleId` - Get reschedule status

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. ✅ Create RescheduleLog model
2. ✅ Enhance Job model with reschedule fields
3. ✅ Enhance JobAssignment model
4. ✅ Create rescheduleService.ts

### Phase 2: Basic Flows (Week 2)
1. ✅ Implement Customer-Initiated reschedule endpoint
2. ✅ Implement Provider Earlier reschedule endpoint
3. ✅ Implement Provider Later reschedule endpoint
4. ✅ Add validation logic

### Phase 3: Approval & Confirmation (Week 3)
1. ✅ Implement SHS approval endpoints
2. ✅ Implement customer confirmation endpoint
3. ✅ Add customer response handling (KEEP/DECLINE)
4. ✅ Implement auto-revert logic for declined earlier reschedules

### Phase 4: Notifications & Integration (Week 4)
1. ✅ Integrate with SHS Comms Hub
2. ✅ Implement all notification types
3. ✅ Add audit logging
4. ✅ Test end-to-end flows

### Phase 5: Testing & Documentation (Week 5)
1. ✅ Unit tests
2. ✅ Integration tests
3. ✅ Update API documentation
4. ✅ User acceptance testing

---

## Testing Scenarios

### Scenario A: Customer-Initiated Reschedule
1. Customer contacts SHS to reschedule
2. SHS updates appointment in WOM
3. External API receives update
4. Job board syncs automatically
5. Provider receives inform-only notification
6. ✅ Verify job status = "Rescheduled by Customer (via SHS)"
7. ✅ Verify reschedule log created with source = "customer"

### Scenario B: Provider Earlier Reschedule
1. Provider requests earlier time
2. System validates time is earlier
3. Job time updated immediately
4. SHS Comms Hub sends customer notification
5. Customer responds KEEP
6. ✅ Verify reschedule confirmed
7. ✅ Verify customerConfirmed = true
8. ✅ Verify job time = new time

**Alternative:** Customer responds DECLINE
1. System auto-reverts to original time
2. Provider notified of decline
3. ✅ Verify job time = original time
4. ✅ Verify customerResponse = "DECLINE"

### Scenario C: Provider Later Reschedule
1. Provider requests later time with reason code
2. Status = "Reschedule Pending – Provider Request"
3. Request routed to SHS Scheduling Queue
4. SHS agent approves
5. SHS contacts customer and confirms
6. Job updated with new time
7. Provider notified of approval
8. ✅ Verify approvalStatus = "approved"
9. ✅ Verify job time = new time

**Alternative:** SHS agent denies
1. Provider notified of denial
2. Job remains at original time
3. ✅ Verify approvalStatus = "denied"
4. ✅ Verify job time = original time

---

## Migration Considerations

### Database Migration
- Add new fields to existing Job and JobAssignment documents
- Create RescheduleLog collection
- Index reschedule fields for performance

### Backward Compatibility
- Keep existing `/api/assignments/:id/schedule` endpoint
- Route to appropriate new endpoint based on request body
- Support gradual migration

### Data Validation
- Validate reason codes
- Validate time comparisons (earlier vs later)
- Validate customer confirmation responses

---

## Security Considerations

1. **Authorization:**
   - Only assigned vendor can request reschedule
   - Only SHS agents can approve/deny
   - Customer confirmation must come from SHS Comms Hub

2. **Audit Trail:**
   - All reschedule actions logged
   - Track who approved/denied
   - Track customer responses

3. **Data Integrity:**
   - Prevent concurrent reschedule requests
   - Validate time windows don't conflict
   - Ensure job status consistency

---

## Monitoring & Metrics

### Key Metrics to Track:
1. Reschedule request volume by type (customer/provider)
2. Approval rate for later reschedules
3. Customer confirmation rate for earlier reschedules
4. Average time to approval
5. Reschedule reason code distribution
6. Penalty triggers (for later reschedules)

### Alerts:
1. High volume of denied reschedules
2. Low customer confirmation rate
3. Long approval times
4. Failed SHS Comms Hub notifications

---

## Next Steps

1. **Review this document** with stakeholders
2. **Confirm SHS Comms Hub API** specifications
3. **Confirm External API** endpoint specifications
4. **Create detailed technical specifications** for each endpoint
5. **Begin Phase 1 implementation**

---

## Questions & Open Items

1. What is the exact SHS Comms Hub API specification?
2. How should penalty logic be triggered for later reschedules?
3. What is the SLA for SHS agent approval?
4. Should there be limits on number of reschedules per job?
5. How should we handle reschedule requests for jobs that are already in progress?


