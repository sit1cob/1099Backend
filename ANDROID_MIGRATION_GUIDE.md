# Android App Migration Guide - Reschedule API Changes

## Overview

This guide helps Android developers migrate from the **old reschedule API** to the **new reschedule APIs** that support three different scenarios: Customer-Initiated, Provider Earlier, and Provider Later reschedules.

---

## Current API (What You're Using Now)

### Endpoint
```
PUT /api/assignments/{assignmentId}/schedule
POST /api/assignments/{assignmentId}/schedule  (also supported)
```

### Current Request Format
```json
{
  "newScheduledDate": "2025-01-15",
  "newTimeWindow": "9AM-12PM",
  "rescheduleReason": "Parts not available",
  "vendorNotes": "Need to order specific part"
}
```

### Current Response Format
```json
{
  "success": true,
  "message": "Assignment rescheduled successfully",
  "data": {
    "assignmentId": "assignment_123",
    "jobId": "job_456",
    "newScheduledDate": "2025-01-15T09:00:00Z",
    "newTimeWindow": "9AM-12PM",
    "rescheduleReason": "Parts not available",
    "notes": "...",
    "vendorNotes": "..."
  }
}
```

### Current Android Code Example (Kotlin)
```kotlin
data class RescheduleRequest(
    val newScheduledDate: String,
    val newTimeWindow: String,
    val rescheduleReason: String,
    val vendorNotes: String
)

data class RescheduleResponse(
    val success: Boolean,
    val message: String,
    val data: RescheduleData?
)

fun rescheduleAssignment(
    assignmentId: String,
    request: RescheduleRequest
): Call<RescheduleResponse> {
    return apiService.rescheduleAssignment(assignmentId, request)
}
```

---

## New APIs (What You Need to Migrate To)

The new system has **three separate endpoints** depending on the reschedule scenario:

### 1. Provider Earlier Reschedule (Empowered)
**Use when:** Provider can arrive earlier than scheduled

### 2. Provider Later Reschedule (Controlled)
**Use when:** Provider needs to reschedule to a later time (requires approval)

### 3. Customer-Initiated Reschedule
**Note:** This is typically handled by SHS, not the Android app. You'll only receive notifications about these.

---

## Migration Options

### Option 1: Full Migration (Recommended)
Migrate to new endpoints immediately. This gives you:
- ✅ Better user experience (different flows for earlier vs later)
- ✅ Real-time status updates
- ✅ Customer confirmation handling for earlier reschedules

### Option 2: Gradual Migration
Keep using old endpoint initially, then migrate feature by feature.

### Option 3: Backward Compatibility (Temporary)
Old endpoint will continue to work but will be deprecated. We recommend migrating within 3 months.

---

## New API Specifications

### API 1: Provider Earlier Reschedule

**Endpoint:**
```
PUT /api/assignments/{assignmentId}/reschedule/earlier
```

**Request Body:**
```json
{
  "newScheduledDate": "2025-01-15T09:00:00Z",
  "newTimeWindow": "9AM-12PM",
  "customerAvailabilityConfirmed": true,
  "notes": "Optional note"
}
```

**Response:**
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

**Important Notes:**
- ⚠️ New time **must be earlier** than original appointment
- ⚠️ `customerAvailabilityConfirmed` must be `true`
- ⚠️ Job is updated immediately, but customer must confirm
- ⚠️ If customer declines, job reverts to original time (you'll get a notification)

**Error Responses:**
```json
{
  "success": false,
  "message": "New time must be earlier than original appointment time",
  "code": "INVALID_TIME"
}
```

---

### API 2: Provider Later Reschedule

**Endpoint:**
```
PUT /api/assignments/{assignmentId}/reschedule/later
```

**Request Body:**
```json
{
  "newScheduledDate": "2025-01-20T13:00:00Z",
  "newTimeWindow": "1PM-5PM",
  "reasonCode": "parts_delay",
  "notes": "Parts need to be ordered"
}
```

**Valid Reason Codes:**
- `"parts_delay"` - Parts not available, need to order
- `"vehicle_issue"` - Vehicle breakdown or issue
- `"emergency"` - Emergency situation
- `"customer_request"` - Customer requested via SHS
- `"other"` - Other reason (must provide notes)

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

**Important Notes:**
- ⚠️ Requires **SHS approval** before job is updated
- ⚠️ `reasonCode` is **required** and must be one of the valid codes
- ⚠️ Job status changes to "Reschedule Pending – Provider Request"
- ⚠️ You'll receive a notification when approved/denied

**Error Responses:**
```json
{
  "success": false,
  "message": "Invalid reason code. Must be one of: parts_delay, vehicle_issue, emergency, customer_request, other",
  "code": "INVALID_REASON_CODE"
}
```

---

### API 3: Check Reschedule Status

**Endpoint:**
```
GET /api/assignments/{assignmentId}/reschedule/status
```

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

## Android Code Migration Examples

### Step 1: Update Data Models

#### Old Model (Remove)
```kotlin
data class RescheduleRequest(
    val newScheduledDate: String,
    val newTimeWindow: String,
    val rescheduleReason: String,
    val vendorNotes: String
)
```

#### New Models (Add)
```kotlin
// Earlier reschedule request
data class EarlierRescheduleRequest(
    val newScheduledDate: String,
    val newTimeWindow: String,
    val customerAvailabilityConfirmed: Boolean,
    val notes: String? = null
)

// Later reschedule request
data class LaterRescheduleRequest(
    val newScheduledDate: String,
    val newTimeWindow: String,
    val reasonCode: RescheduleReasonCode,
    val notes: String? = null
)

enum class RescheduleReasonCode {
    PARTS_DELAY,
    VEHICLE_ISSUE,
    EMERGENCY,
    CUSTOMER_REQUEST,
    OTHER
}

// Reschedule response
data class RescheduleResponse(
    val success: Boolean,
    val data: RescheduleData?,
    val message: String?
)

data class RescheduleData(
    val rescheduleId: String,
    val status: RescheduleStatus,
    val newScheduledDate: String?,
    val newTimeWindow: String?,
    val customerNotificationSent: Boolean?,
    val message: String?
)

enum class RescheduleStatus {
    PENDING_APPROVAL,
    CUSTOMER_CONFIRMATION_PENDING,
    APPROVED,
    DENIED,
    CONFIRMED,
    DECLINED
}
```

### Step 2: Update API Interface

#### Old Interface (Remove)
```kotlin
@PUT("api/assignments/{assignmentId}/schedule")
fun rescheduleAssignment(
    @Path("assignmentId") assignmentId: String,
    @Body request: RescheduleRequest
): Call<RescheduleResponse>
```

#### New Interface (Add)
```kotlin
// Earlier reschedule
@PUT("api/assignments/{assignmentId}/reschedule/earlier")
fun rescheduleEarlier(
    @Path("assignmentId") assignmentId: String,
    @Body request: EarlierRescheduleRequest
): Call<RescheduleResponse>

// Later reschedule
@PUT("api/assignments/{assignmentId}/reschedule/later")
fun rescheduleLater(
    @Path("assignmentId") assignmentId: String,
    @Body request: LaterRescheduleRequest
): Call<RescheduleResponse>

// Check status
@GET("api/assignments/{assignmentId}/reschedule/status")
fun getRescheduleStatus(
    @Path("assignmentId") assignmentId: String
): Call<RescheduleStatusResponse>
```

### Step 3: Update UI/UX Flow

#### Old Flow (Single Button)
```kotlin
// Old: One "Reschedule" button
buttonReschedule.setOnClickListener {
    showRescheduleDialog()
}
```

#### New Flow (Two Buttons)
```kotlin
// New: Two separate buttons
buttonRescheduleEarlier.setOnClickListener {
    showEarlierRescheduleDialog()
}

buttonRescheduleLater.setOnClickListener {
    showLaterRescheduleDialog()
}
```

### Step 4: Update Reschedule Logic

#### Old Implementation
```kotlin
fun handleReschedule(assignmentId: String, newDate: String, newTime: String) {
    val request = RescheduleRequest(
        newScheduledDate = newDate,
        newTimeWindow = newTime,
        rescheduleReason = reasonText.text.toString(),
        vendorNotes = notesText.text.toString()
    )
    
    apiService.rescheduleAssignment(assignmentId, request)
        .enqueue(object : Callback<RescheduleResponse> {
            override fun onResponse(call: Call<RescheduleResponse>, response: Response<RescheduleResponse>) {
                if (response.isSuccessful && response.body()?.success == true) {
                    showSuccess("Reschedule successful")
                    refreshJobDetails()
                } else {
                    showError("Reschedule failed")
                }
            }
            
            override fun onFailure(call: Call<RescheduleResponse>, t: Throwable) {
                showError("Network error")
            }
        })
}
```

#### New Implementation - Earlier Reschedule
```kotlin
fun handleEarlierReschedule(
    assignmentId: String,
    newDate: String,
    newTime: String,
    customerConfirmed: Boolean
) {
    // Validate new time is earlier
    if (!isEarlierThanOriginal(newDate, newTime)) {
        showError("New time must be earlier than original appointment")
        return
    }
    
    // Validate customer availability confirmation
    if (!customerConfirmed) {
        showError("You must confirm customer availability")
        return
    }
    
    val request = EarlierRescheduleRequest(
        newScheduledDate = newDate,
        newTimeWindow = newTime,
        customerAvailabilityConfirmed = customerConfirmed,
        notes = notesText.text.toString()
    )
    
    apiService.rescheduleEarlier(assignmentId, request)
        .enqueue(object : Callback<RescheduleResponse> {
            override fun onResponse(call: Call<RescheduleResponse>, response: Response<RescheduleResponse>) {
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    when (data?.status) {
                        RescheduleStatus.CUSTOMER_CONFIRMATION_PENDING -> {
                            showInfo("Customer will be notified. Awaiting confirmation.")
                            // Start polling for status updates
                            startStatusPolling(assignmentId, data.rescheduleId)
                        }
                        else -> {
                            showSuccess("Reschedule successful")
                            refreshJobDetails()
                        }
                    }
                } else {
                    val errorMessage = response.body()?.message ?: "Reschedule failed"
                    showError(errorMessage)
                }
            }
            
            override fun onFailure(call: Call<RescheduleResponse>, t: Throwable) {
                showError("Network error: ${t.message}")
            }
        })
}
```

#### New Implementation - Later Reschedule
```kotlin
fun handleLaterReschedule(
    assignmentId: String,
    newDate: String,
    newTime: String,
    reasonCode: RescheduleReasonCode
) {
    val request = LaterRescheduleRequest(
        newScheduledDate = newDate,
        newTimeWindow = newTime,
        reasonCode = reasonCode,
        notes = notesText.text.toString()
    )
    
    apiService.rescheduleLater(assignmentId, request)
        .enqueue(object : Callback<RescheduleResponse> {
            override fun onResponse(call: Call<RescheduleResponse>, response: Response<RescheduleResponse>) {
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    when (data?.status) {
                        RescheduleStatus.PENDING_APPROVAL -> {
                            showInfo("Reschedule request submitted. Awaiting SHS approval.")
                            // Start polling for approval status
                            startStatusPolling(assignmentId, data.rescheduleId)
                        }
                        else -> {
                            showSuccess("Reschedule successful")
                            refreshJobDetails()
                        }
                    }
                } else {
                    val errorMessage = response.body()?.message ?: "Reschedule failed"
                    showError(errorMessage)
                }
            }
            
            override fun onFailure(call: Call<RescheduleResponse>, t: Throwable) {
                showError("Network error: ${t.message}")
            }
        })
}
```

### Step 5: Add Status Polling (For Pending Requests)

```kotlin
private fun startStatusPolling(assignmentId: String, rescheduleId: String) {
    val handler = Handler(Looper.getMainLooper())
    var pollCount = 0
    val maxPolls = 60 // Poll for 5 minutes (every 5 seconds)
    
    val pollRunnable = object : Runnable {
        override fun run() {
            if (pollCount >= maxPolls) {
                showInfo("Status check timeout. Please check manually.")
                return
            }
            
            apiService.getRescheduleStatus(assignmentId)
                .enqueue(object : Callback<RescheduleStatusResponse> {
                    override fun onResponse(
                        call: Call<RescheduleStatusResponse>,
                        response: Response<RescheduleStatusResponse>
                    ) {
                        val status = response.body()?.data?.status
                        when (status) {
                            RescheduleStatus.APPROVED, RescheduleStatus.CONFIRMED -> {
                                showSuccess("Reschedule approved/confirmed!")
                                refreshJobDetails()
                                // Stop polling
                                return
                            }
                            RescheduleStatus.DENIED, RescheduleStatus.DECLINED -> {
                                showError("Reschedule denied/declined")
                                refreshJobDetails()
                                // Stop polling
                                return
                            }
                            else -> {
                                // Still pending, poll again in 5 seconds
                                pollCount++
                                handler.postDelayed(this@pollRunnable, 5000)
                            }
                        }
                    }
                    
                    override fun onFailure(call: Call<RescheduleStatusResponse>, t: Throwable) {
                        // Retry polling
                        pollCount++
                        handler.postDelayed(this@pollRunnable, 5000)
                    }
                })
        }
    }
    
    handler.postDelayed(pollRunnable, 5000) // Start after 5 seconds
}
```

### Step 6: Handle Push Notifications

You'll receive push notifications for reschedule status updates. Update your notification handler:

```kotlin
fun handleRescheduleNotification(notificationData: Map<String, String>) {
    val type = notificationData["type"]
    val assignmentId = notificationData["assignmentId"]
    val rescheduleId = notificationData["rescheduleId"]
    val status = notificationData["status"]
    
    when (type) {
        "reschedule_earlier_confirmed" -> {
            showSuccess("Customer confirmed earlier arrival time")
            refreshJobDetails()
        }
        "reschedule_earlier_declined" -> {
            showInfo("Customer declined earlier arrival. Original time maintained.")
            refreshJobDetails()
        }
        "reschedule_later_approved" -> {
            showSuccess("Reschedule approved! New time: ${notificationData["newTime"]}")
            refreshJobDetails()
        }
        "reschedule_later_denied" -> {
            showError("Reschedule denied. Please complete as scheduled.")
            refreshJobDetails()
        }
        "reschedule_customer_initiated" -> {
            showInfo("Customer rescheduled appointment. New time: ${notificationData["newTime"]}")
            refreshJobDetails()
        }
    }
}
```

---

## UI/UX Changes Required

### 1. Reschedule Button Changes

**Before:**
- Single "Reschedule" button

**After:**
- "Move Earlier" button (if job is scheduled for today/future)
- "Request Reschedule (Later)" button (always available)

### 2. Reschedule Dialog Changes

#### Earlier Reschedule Dialog
```
┌─────────────────────────────────┐
│ Move Earlier                    │
├─────────────────────────────────┤
│ New Date: [Date Picker]         │
│ New Time: [Time Picker]         │
│                                 │
│ ☑ I have confirmed the customer│
│   is available earlier today    │
│                                 │
│ Notes: [Text Input]             │
│                                 │
│ [Cancel]  [Confirm]              │
└─────────────────────────────────┘
```

#### Later Reschedule Dialog
```
┌─────────────────────────────────┐
│ Request Reschedule (Later)      │
├─────────────────────────────────┤
│ New Date: [Date Picker]         │
│ New Time: [Time Picker]         │
│                                 │
│ Reason: [Dropdown]              │
│   - Parts Delay                 │
│   - Vehicle Issue               │
│   - Emergency                   │
│   - Customer Request            │
│   - Other                      │
│                                 │
│ Notes: [Text Input]             │
│                                 │
│ [Cancel]  [Submit Request]       │
└─────────────────────────────────┘
```

### 3. Status Display

Add a status indicator for pending reschedules:

```kotlin
// In job details screen
if (job.rescheduleStatus == "pending_approval") {
    showStatusBanner(
        message = "Reschedule request pending approval",
        color = Color.ORANGE
    )
} else if (job.rescheduleStatus == "customer_confirmation_pending") {
    showStatusBanner(
        message = "Awaiting customer confirmation",
        color = Color.BLUE
    )
}
```

---

## Migration Checklist

### Phase 1: Preparation
- [ ] Review this migration guide
- [ ] Update API base URL if needed
- [ ] Create new data models
- [ ] Update API interface

### Phase 2: Implementation
- [ ] Implement earlier reschedule endpoint
- [ ] Implement later reschedule endpoint
- [ ] Add reason code dropdown
- [ ] Add customer availability checkbox
- [ ] Update UI with two separate buttons
- [ ] Add status polling logic
- [ ] Update notification handlers

### Phase 3: Testing
- [ ] Test earlier reschedule flow
- [ ] Test later reschedule flow
- [ ] Test status polling
- [ ] Test error handling
- [ ] Test push notifications
- [ ] Test customer confirmation scenarios

### Phase 4: Deployment
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Remove old endpoint usage (after 3 months)

---

## Breaking Changes Summary

| Change | Impact | Migration Required |
|--------|--------|-------------------|
| Endpoint changed | ⚠️ High | Yes - Update endpoint URLs |
| Request format changed | ⚠️ High | Yes - Update request models |
| Response format changed | ⚠️ Medium | Yes - Update response models |
| New required fields | ⚠️ Medium | Yes - Add reasonCode, customerAvailabilityConfirmed |
| Status polling needed | ⚠️ Low | Recommended - For better UX |
| Push notifications | ⚠️ Low | Recommended - For real-time updates |

---

## Backward Compatibility

### Old Endpoint Support
The old endpoint (`PUT /api/assignments/:id/schedule`) will continue to work for **3 months** after the new APIs are released.

**Old endpoint behavior:**
- Will automatically route to "later reschedule" flow
- Uses default reason code: `"other"`
- May not support all new features

**Recommendation:** Migrate to new endpoints as soon as possible.

---

## Error Handling

### Common Error Codes

| Code | Message | Action |
|------|---------|--------|
| `INVALID_TIME` | New time must be earlier than original | Show error, allow user to select earlier time |
| `INVALID_REASON_CODE` | Invalid reason code | Show error, ensure dropdown value is valid |
| `CUSTOMER_NOT_CONFIRMED` | Customer availability not confirmed | Show error, require checkbox |
| `RESCHEDULE_PENDING` | Another reschedule request is pending | Show info, disable reschedule button |
| `UNAUTHORIZED` | Not authorized to reschedule | Show error, check assignment ownership |

### Error Handling Example
```kotlin
override fun onResponse(call: Call<RescheduleResponse>, response: Response<RescheduleResponse>) {
    if (!response.isSuccessful) {
        val errorBody = response.errorBody()?.string()
        val errorCode = parseErrorCode(errorBody)
        
        when (errorCode) {
            "INVALID_TIME" -> {
                showError("New time must be earlier than original appointment")
                highlightTimePicker()
            }
            "INVALID_REASON_CODE" -> {
                showError("Please select a valid reason")
                highlightReasonDropdown()
            }
            "CUSTOMER_NOT_CONFIRMED" -> {
                showError("Please confirm customer availability")
                highlightCheckbox()
            }
            else -> {
                showError("Reschedule failed. Please try again.")
            }
        }
        return
    }
    
    // Handle success...
}
```

---

## Testing Guide

### Test Cases

#### Earlier Reschedule
1. ✅ Select time earlier than original → Should succeed
2. ✅ Select time later than original → Should fail with INVALID_TIME
3. ✅ Don't check customer availability → Should fail with CUSTOMER_NOT_CONFIRMED
4. ✅ Customer confirms (KEEP) → Should show success, job updated
5. ✅ Customer declines (DECLINE) → Should show info, job reverted

#### Later Reschedule
1. ✅ Select valid reason code → Should succeed, status = pending_approval
2. ✅ Don't select reason code → Should fail with INVALID_REASON_CODE
3. ✅ SHS approves → Should show success, job updated
4. ✅ SHS denies → Should show error, job unchanged

#### Status Polling
1. ✅ Poll while pending → Should update status
2. ✅ Poll after approval → Should stop polling, show success
3. ✅ Poll timeout → Should show info message

---

## Support & Questions

### API Documentation
- Base URL: `https://your-api-url.com`
- API Version: `v1`
- Authentication: Bearer token (same as before)

### Contact
- Technical Questions: [Your contact email]
- API Issues: [Support email]
- Migration Help: [Migration support channel]

---

## Timeline

### Recommended Migration Timeline

**Week 1-2:** Preparation & Development
- Review guide
- Update models and interfaces
- Implement new endpoints

**Week 3:** Testing
- Unit tests
- Integration tests
- User acceptance testing

**Week 4:** Deployment
- Deploy to staging
- Deploy to production (gradual rollout)
- Monitor and fix issues

**Month 2-3:** Old Endpoint Deprecation
- Old endpoint still works
- Monitor usage
- Encourage migration

**Month 4:** Old Endpoint Removal
- Old endpoint removed
- All clients must use new endpoints

---

## Summary

### What Changed?
- ✅ Single endpoint → Three endpoints (earlier, later, customer)
- ✅ Simple request → Enhanced request with reason codes and confirmations
- ✅ Immediate response → Status-based response with polling
- ✅ No approval → Approval workflow for later reschedules
- ✅ No customer interaction → Customer confirmation for earlier reschedules

### What Stayed the Same?
- ✅ Authentication (Bearer token)
- ✅ Base URL structure
- ✅ Error response format
- ✅ Success response format (mostly)

### Estimated Development Time
- **Small changes:** 2-3 days (if just updating endpoints)
- **Full implementation:** 1-2 weeks (with UI changes, polling, notifications)

### Risk Level
- **Low Risk:** If you follow this guide step-by-step
- **Medium Risk:** If you skip testing
- **High Risk:** If you don't handle error cases

---

**Last Updated:** [Date]
**Version:** 1.0
**Status:** Ready for Migration


