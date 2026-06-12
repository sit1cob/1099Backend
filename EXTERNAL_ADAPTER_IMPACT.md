# External Adapter Impact on Reschedule Flow

## Current External Adapter Implementation

### Current Code Location
**File:** `src/services/externalApiAdapter.ts`

### Current Reschedule Handling
```typescript
// Current: Single generic endpoint
// In assignments.ts, line 534:
const externalResponse = await ExternalApiAdapter.callExternalApi(
  `/api/assignments/${id}/schedule`,
  token,
  method,
  transformedBody
);
```

**Current Flow:**
```
Provider Request → External Adapter → External API (/api/assignments/:id/schedule)
                                      ↓
                                 External API processes
                                      ↓
                                 Response returned as-is
```

## Required Changes to External Adapter

### 1. New Method Signatures

**Current:** Generic `callExternalApi()` method

**Required:** Specialized methods for each reschedule type

```typescript
// NEW: Earlier reschedule (no approval)
static async rescheduleEarlier(
  assignmentId: string,
  token: string,
  data: EarlierRescheduleData
): Promise<RescheduleResponse>

// NEW: Later reschedule (requires approval)
static async rescheduleLater(
  assignmentId: string,
  token: string,
  data: LaterRescheduleData
): Promise<RescheduleResponse>

// NEW: Customer-initiated reschedule
static async rescheduleCustomer(
  assignmentId: string,
  token: string,
  data: CustomerRescheduleData
): Promise<RescheduleResponse>

// NEW: SHS approval/denial
static async approveReschedule(
  rescheduleId: string,
  token: string,
  approved: boolean,
  notes?: string
): Promise<ApprovalResponse>

// NEW: Customer confirmation handler
static async handleCustomerConfirmation(
  rescheduleId: string,
  token: string,
  response: 'KEEP' | 'DECLINE'
): Promise<ConfirmationResponse>

// NEW: SHS Comms Hub integration
static async notifySHSCommsHub(
  jobId: string,
  notificationType: string,
  notificationData: CommsHubData
): Promise<CommsHubResponse>
```

### 2. Request Transformation Changes

**Current Transformation (line 519-528):**
```typescript
const transformedBody: any = {
  newScheduledDate: req.body.newScheduledDate,
  reason: req.body.rescheduleReason || req.body.reason || 'vendor_requested',
  notes: req.body.vendorNotes || req.body.notes || ''
};
```

**Required: Different transformations per scenario**

#### For Earlier Reschedule:
```typescript
const transformedBody = {
  newScheduledDate: req.body.newScheduledDate,
  newTimeWindow: req.body.newTimeWindow,
  customerAvailabilityConfirmed: req.body.customerAvailabilityConfirmed,
  rescheduleSource: 'provider',
  rescheduleDirection: 'earlier',
  notes: req.body.notes || ''
};
```

#### For Later Reschedule:
```typescript
const transformedBody = {
  newScheduledDate: req.body.newScheduledDate,
  newTimeWindow: req.body.newTimeWindow,
  reasonCode: req.body.reasonCode, // Required: parts_delay | vehicle_issue | emergency | customer_request | other
  rescheduleSource: 'provider',
  rescheduleDirection: 'later',
  notes: req.body.notes || ''
};
```

#### For Customer-Initiated:
```typescript
const transformedBody = {
  newScheduledDate: req.body.newScheduledDate,
  newTimeWindow: req.body.newTimeWindow,
  cancelled: req.body.cancelled || false,
  rescheduleSource: 'customer',
  rescheduleDirection: 'same', // or 'cancelled'
  notes: req.body.notes || 'Rescheduled by customer via SHS'
};
```

### 3. Response Handling Changes

**Current:** Returns external API response as-is

**Required:** Enhanced response processing

```typescript
// Current (line 547):
return res.json(externalResponse);

// Required: Process and enrich response
const enrichedResponse = {
  ...externalResponse,
  data: {
    ...externalResponse.data,
    // Add local tracking
    rescheduleId: externalResponse.data.rescheduleId,
    status: externalResponse.data.status,
    // For earlier reschedules
    customerConfirmationRequired: externalResponse.data.direction === 'earlier',
    // For later reschedules
    approvalRequired: externalResponse.data.direction === 'later',
    approvalStatus: externalResponse.data.approvalStatus || 'pending'
  }
};
```

### 4. New Endpoint Routing

**Current Endpoint Mapping:**
```
PUT /api/assignments/:id/schedule → External API /api/assignments/:id/schedule
```

**Required Endpoint Mapping:**
```
PUT /api/assignments/:id/reschedule/earlier → External API /api/assignments/:id/reschedule/earlier
PUT /api/assignments/:id/reschedule/later → External API /api/assignments/:id/reschedule/later
PUT /api/assignments/:id/reschedule/customer → External API /api/assignments/:id/reschedule/customer
POST /api/assignments/:id/reschedule/approve → External API /api/assignments/:id/reschedule/approve
POST /api/assignments/:id/reschedule/deny → External API /api/assignments/:id/reschedule/deny
POST /api/assignments/:id/reschedule/customer-confirm → External API /api/assignments/:id/reschedule/customer-confirm
```

### 5. SHS Comms Hub Integration

**New Dependency:** SHS Communications Hub API

**Required Implementation:**
```typescript
static async notifySHSCommsHub(
  jobId: string,
  notificationType: 'earlier_reschedule' | 'later_reschedule' | 'customer_reschedule',
  data: {
    customerPhone: string,
    customerEmail: string,
    oldTime: string,
    newTime: string,
    rescheduleId: string,
    actionRequired?: 'KEEP' | 'DECLINE'
  }
): Promise<{
  success: boolean,
  notificationId: string,
  message: string
}> {
  const commsHubUrl = process.env.SHS_COMMS_HUB_URL || 'https://comms-hub.shs.com';
  const url = `${commsHubUrl}/api/notify-customer`;
  
  const payload = {
    jobId,
    notificationType,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail,
    message: this.buildCustomerMessage(notificationType, data),
    actionRequired: data.actionRequired,
    callbackUrl: `${process.env.API_BASE_URL}/api/assignments/${data.rescheduleId}/reschedule/customer-confirm`
  };
  
  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${process.env.SHS_COMMS_HUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    return {
      success: true,
      notificationId: response.data.notificationId,
      message: 'Customer notification sent'
    };
  } catch (error: any) {
    console.error('[ExternalApiAdapter] SHS Comms Hub notification failed:', error);
    throw new Error('Failed to notify customer via SHS Comms Hub');
  }
}
```

### 6. Error Handling Enhancements

**Current:** Basic error forwarding

**Required:** Scenario-specific error handling

```typescript
// For earlier reschedules
if (error.response?.status === 400 && error.response?.data?.message?.includes('earlier')) {
  return {
    success: false,
    message: 'New time must be earlier than original appointment time',
    code: 'INVALID_TIME'
  };
}

// For later reschedules
if (error.response?.status === 400 && error.response?.data?.message?.includes('reason')) {
  return {
    success: false,
    message: 'Valid reason code required for later reschedules',
    code: 'MISSING_REASON_CODE'
  };
}

// For approval requests
if (error.response?.status === 403) {
  return {
    success: false,
    message: 'Only SHS agents can approve/deny reschedule requests',
    code: 'UNAUTHORIZED'
  };
}
```

## Impact on Route Handlers

### File: `src/routes/assignments.ts`

**Current Handler (line 500-561):**
- Single `handleRescheduleAssignment()` function
- Routes all reschedules to same endpoint
- No differentiation

**Required Changes:**

#### Replace with scenario-specific handlers:

```typescript
// Earlier reschedule handler
async function handleEarlierReschedule(req: AuthenticatedRequest, res: any) {
  const { id } = req.params;
  const token = extractToken(req);
  
  // Validate new time is earlier
  const assignment = await getAssignment(id);
  const job = await getJob(assignment.jobId);
  
  if (new Date(req.body.newScheduledDate) >= job.scheduledDate) {
    return res.status(400).json({
      success: false,
      message: 'New time must be earlier than original appointment'
    });
  }
  
  // Call external adapter
  const response = await ExternalApiAdapter.rescheduleEarlier(
    id,
    token,
    req.body
  );
  
  // Notify SHS Comms Hub
  if (response.success) {
    await ExternalApiAdapter.notifySHSCommsHub(
      job.id,
      'earlier_reschedule',
      {
        customerPhone: job.customerPhone,
        customerEmail: job.customerEmail,
        oldTime: job.scheduledDate,
        newTime: req.body.newScheduledDate,
        rescheduleId: response.data.rescheduleId,
        actionRequired: 'KEEP' // or 'DECLINE'
      }
    );
  }
  
  return res.json(response);
}

// Later reschedule handler
async function handleLaterReschedule(req: AuthenticatedRequest, res: any) {
  const { id } = req.params;
  const token = extractToken(req);
  
  // Validate reason code
  const validReasonCodes = ['parts_delay', 'vehicle_issue', 'emergency', 'customer_request', 'other'];
  if (!validReasonCodes.includes(req.body.reasonCode)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid reason code'
    });
  }
  
  // Call external adapter
  const response = await ExternalApiAdapter.rescheduleLater(
    id,
    token,
    req.body
  );
  
  // Route to SHS Scheduling Queue
  if (response.success) {
    await ExternalApiAdapter.notifySHSCommsHub(
      job.id,
      'later_reschedule',
      {
        rescheduleId: response.data.rescheduleId,
        reasonCode: req.body.reasonCode,
        proposedTime: req.body.newScheduledDate
      }
    );
  }
  
  return res.json(response);
}
```

## Data Flow Comparison

### Current Flow:
```
Provider → API → External Adapter → External API
                                    ↓
                              Job Updated
                                    ↓
                              Response Returned
```

### New Flow (Earlier):
```
Provider → API → External Adapter → External API
                                    ↓
                              Job Updated Immediately
                                    ↓
                              SHS Comms Hub → Customer SMS
                                    ↓
                              Customer Response → API
                                    ↓
                              Confirm/Revert → Provider Notification
```

### New Flow (Later):
```
Provider → API → External Adapter → External API
                                    ↓
                              Pending Request Created
                                    ↓
                              SHS Scheduling Queue
                                    ↓
                              SHS Agent Review
                                    ↓
                              Approve/Deny → External API
                                    ↓
                              Job Updated → Provider Notification
```

## Backward Compatibility

### Migration Strategy:

1. **Phase 1:** Keep existing endpoint, add new endpoints
2. **Phase 2:** Detect request type in existing endpoint, route appropriately
3. **Phase 3:** Deprecate old endpoint, require new endpoints

### Detection Logic:
```typescript
// In existing handleRescheduleAssignment()
if (req.body.rescheduleDirection === 'earlier') {
  return handleEarlierReschedule(req, res);
} else if (req.body.rescheduleDirection === 'later') {
  return handleLaterReschedule(req, res);
} else if (req.body.rescheduleSource === 'customer') {
  return handleCustomerReschedule(req, res);
} else {
  // Legacy behavior
  return handleLegacyReschedule(req, res);
}
```

## Testing Requirements

### Unit Tests Needed:
1. ✅ `rescheduleEarlier()` - Validates time, calls correct endpoint
2. ✅ `rescheduleLater()` - Validates reason code, creates pending request
3. ✅ `rescheduleCustomer()` - Updates job, sends provider notification
4. ✅ `approveReschedule()` - Updates status, notifies provider
5. ✅ `handleCustomerConfirmation()` - Confirms or reverts based on response
6. ✅ `notifySHSCommsHub()` - Sends notification, handles callback

### Integration Tests Needed:
1. ✅ End-to-end earlier reschedule with customer confirmation
2. ✅ End-to-end later reschedule with SHS approval
3. ✅ Customer-initiated reschedule flow
4. ✅ Error handling for invalid requests
5. ✅ SHS Comms Hub integration

## Summary of Changes

### External Adapter Service:
- ✅ **6 new methods** (vs 1 generic method)
- ✅ **SHS Comms Hub integration** (new dependency)
- ✅ **Enhanced error handling** (scenario-specific)
- ✅ **Response enrichment** (add local tracking fields)

### Route Handlers:
- ✅ **3 new endpoints** (earlier, later, customer)
- ✅ **2 approval endpoints** (approve, deny)
- ✅ **1 confirmation endpoint** (customer response)
- ✅ **Validation logic** (time checks, reason codes)

### Data Models:
- ✅ **RescheduleLog model** (audit trail)
- ✅ **Enhanced Job model** (reschedule history)
- ✅ **Enhanced JobAssignment model** (pending requests)

### Dependencies:
- ✅ **SHS Comms Hub API** (new external service)
- ✅ **Enhanced External API** (new endpoints required)

## Critical Path Items

1. **External API must implement new endpoints** - Blocking
2. **SHS Comms Hub API specification** - Blocking
3. **Customer confirmation callback mechanism** - Blocking
4. **SHS Scheduling Queue integration** - Blocking

## Risk Mitigation

1. **Backward compatibility** - Keep old endpoint during migration
2. **Feature flags** - Enable new flows gradually
3. **Monitoring** - Track success rates for each scenario
4. **Rollback plan** - Ability to revert to old flow if issues


