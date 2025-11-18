# Android Quick Migration Reference

## TL;DR - Minimal Changes Needed

### Current Code (1 endpoint)
```kotlin
PUT /api/assignments/{id}/schedule
{
  "newScheduledDate": "...",
  "newTimeWindow": "...",
  "rescheduleReason": "...",
  "vendorNotes": "..."
}
```

### New Code (2 endpoints)
```kotlin
// For earlier reschedules
PUT /api/assignments/{id}/reschedule/earlier
{
  "newScheduledDate": "...",
  "newTimeWindow": "...",
  "customerAvailabilityConfirmed": true,
  "notes": "..."
}

// For later reschedules
PUT /api/assignments/{id}/reschedule/later
{
  "newScheduledDate": "...",
  "newTimeWindow": "...",
  "reasonCode": "parts_delay",  // NEW: Required
  "notes": "..."
}
```

---

## Side-by-Side Comparison

| Aspect | Old API | New API (Earlier) | New API (Later) |
|--------|---------|-------------------|-----------------|
| **Endpoint** | `/schedule` | `/reschedule/earlier` | `/reschedule/later` |
| **Method** | PUT/POST | PUT | PUT |
| **Auth** | Bearer token | Bearer token | Bearer token |
| **newScheduledDate** | ✅ Required | ✅ Required | ✅ Required |
| **newTimeWindow** | ✅ Required | ✅ Required | ✅ Required |
| **rescheduleReason** | ✅ Required | ❌ Removed | ❌ Removed |
| **vendorNotes** | ✅ Required | ❌ Removed | ❌ Removed |
| **reasonCode** | ❌ Not used | ❌ Not used | ✅ **NEW: Required** |
| **customerAvailabilityConfirmed** | ❌ Not used | ✅ **NEW: Required** | ❌ Not used |
| **notes** | ❌ Not used | ✅ Optional | ✅ Optional |
| **Response Status** | `success` | `success` + `status` | `success` + `status` |
| **Approval Needed** | ❌ No | ❌ No | ✅ Yes |
| **Customer Confirmation** | ❌ No | ✅ Yes | ❌ No |

---

## Minimal Migration (Quick & Dirty)

If you want to migrate quickly with minimal changes:

### Step 1: Update Endpoint URLs
```kotlin
// OLD
@PUT("api/assignments/{assignmentId}/schedule")

// NEW - For later reschedules (most common)
@PUT("api/assignments/{assignmentId}/reschedule/later")
```

### Step 2: Update Request Model
```kotlin
// OLD
data class RescheduleRequest(
    val newScheduledDate: String,
    val newTimeWindow: String,
    val rescheduleReason: String,
    val vendorNotes: String
)

// NEW - Minimal change
data class RescheduleRequest(
    val newScheduledDate: String,
    val newTimeWindow: String,
    val reasonCode: String = "other",  // Map rescheduleReason to this
    val notes: String = ""  // Use vendorNotes
)
```

### Step 3: Map Old Fields to New
```kotlin
fun convertOldToNew(oldRequest: OldRescheduleRequest): NewRescheduleRequest {
    return NewRescheduleRequest(
        newScheduledDate = oldRequest.newScheduledDate,
        newTimeWindow = oldRequest.newTimeWindow,
        reasonCode = mapReasonCode(oldRequest.rescheduleReason),  // Convert to enum
        notes = oldRequest.vendorNotes
    )
}

fun mapReasonCode(oldReason: String): String {
    return when {
        oldReason.contains("part", ignoreCase = true) -> "parts_delay"
        oldReason.contains("vehicle", ignoreCase = true) -> "vehicle_issue"
        oldReason.contains("emergency", ignoreCase = true) -> "emergency"
        else -> "other"
    }
}
```

### Step 4: Update API Call
```kotlin
// OLD
apiService.rescheduleAssignment(assignmentId, request)

// NEW
apiService.rescheduleLater(assignmentId, convertOldToNew(request))
```

**That's it!** Your app will work with the new API. You can add the earlier reschedule feature later.

---

## Field Mapping Guide

### Old → New Field Mapping

| Old Field | New Field (Later) | New Field (Earlier) | Notes |
|-----------|------------------|---------------------|-------|
| `newScheduledDate` | `newScheduledDate` | `newScheduledDate` | Same |
| `newTimeWindow` | `newTimeWindow` | `newTimeWindow` | Same |
| `rescheduleReason` | `reasonCode` | ❌ Not used | Convert to enum |
| `vendorNotes` | `notes` | `notes` | Same (optional now) |
| ❌ | ❌ | `customerAvailabilityConfirmed` | **NEW: Required for earlier** |

### Reason Code Mapping

| Old rescheduleReason Contains | New reasonCode |
|------------------------------|----------------|
| "part", "order", "unavailable" | `"parts_delay"` |
| "vehicle", "truck", "breakdown" | `"vehicle_issue"` |
| "emergency", "urgent" | `"emergency"` |
| "customer", "requested" | `"customer_request"` |
| Everything else | `"other"` |

---

## Response Changes

### Old Response
```json
{
  "success": true,
  "message": "Assignment rescheduled successfully",
  "data": {
    "assignmentId": "...",
    "newScheduledDate": "...",
    "newTimeWindow": "..."
  }
}
```

### New Response (Later Reschedule)
```json
{
  "success": true,
  "data": {
    "rescheduleId": "reschedule_123",  // NEW
    "status": "pending_approval",      // NEW
    "message": "Reschedule request submitted. Awaiting SHS approval."
  }
}
```

### New Response (Earlier Reschedule)
```json
{
  "success": true,
  "data": {
    "rescheduleId": "reschedule_456",           // NEW
    "status": "customer_confirmation_pending", // NEW
    "newScheduledDate": "...",
    "newTimeWindow": "...",
    "customerNotificationSent": true,          // NEW
    "message": "Customer will be notified. Awaiting confirmation."
  }
}
```

**Key Changes:**
- ✅ `success` field still exists
- ✅ `data` object still exists
- ⚠️ New `rescheduleId` field (save this for status checks)
- ⚠️ New `status` field (check this for pending states)
- ⚠️ `message` moved inside `data` object

---

## Code Changes Summary

### Minimum Changes Required: **3 files**

1. **API Interface** (1 method change)
   ```kotlin
   // Change endpoint URL
   @PUT("api/assignments/{assignmentId}/reschedule/later")
   ```

2. **Request Model** (2 fields change)
   ```kotlin
   // Change: rescheduleReason → reasonCode
   // Change: vendorNotes → notes
   ```

3. **API Call** (1 line change)
   ```kotlin
   // Change method name
   apiService.rescheduleLater(...)
   ```

**Total estimated time: 30 minutes - 1 hour**

---

## Backward Compatibility Option

If you want to keep using the old endpoint temporarily:

The old endpoint will still work for **3 months**, but:
- ⚠️ Will route to "later reschedule" flow
- ⚠️ Uses default reason code: `"other"`
- ⚠️ May not support all new features

**Recommendation:** Migrate now to avoid issues later.

---

## Testing Checklist (Minimal)

- [ ] Update endpoint URL
- [ ] Update request model
- [ ] Test later reschedule (most common case)
- [ ] Verify response parsing works
- [ ] Test error handling

**Optional (for full migration):**
- [ ] Add earlier reschedule endpoint
- [ ] Add reason code dropdown
- [ ] Add status polling
- [ ] Handle push notifications

---

## Quick Start Code

### Complete Minimal Migration Example

```kotlin
// 1. Update API Interface
interface ApiService {
    @PUT("api/assignments/{assignmentId}/reschedule/later")
    fun rescheduleLater(
        @Path("assignmentId") assignmentId: String,
        @Body request: RescheduleRequest
    ): Call<RescheduleResponse>
}

// 2. Update Request Model
data class RescheduleRequest(
    val newScheduledDate: String,
    val newTimeWindow: String,
    val reasonCode: String,  // Changed from rescheduleReason
    val notes: String? = null  // Changed from vendorNotes (now optional)
)

// 3. Update API Call
fun rescheduleAssignment(assignmentId: String, newDate: String, newTime: String, reason: String) {
    val request = RescheduleRequest(
        newScheduledDate = newDate,
        newTimeWindow = newTime,
        reasonCode = mapReasonToCode(reason),  // Convert old reason to new code
        notes = ""  // Optional
    )
    
    apiService.rescheduleLater(assignmentId, request)
        .enqueue(object : Callback<RescheduleResponse> {
            override fun onResponse(call: Call<RescheduleResponse>, response: Response<RescheduleResponse>) {
                if (response.isSuccessful && response.body()?.success == true) {
                    val status = response.body()?.data?.status
                    if (status == "pending_approval") {
                        showInfo("Reschedule request submitted. Awaiting approval.")
                    } else {
                        showSuccess("Reschedule successful")
                    }
                }
            }
            
            override fun onFailure(call: Call<RescheduleResponse>, t: Throwable) {
                showError("Network error")
            }
        })
}

// 4. Helper function to map old reason to new code
fun mapReasonToCode(oldReason: String): String {
    return when {
        oldReason.contains("part", ignoreCase = true) -> "parts_delay"
        oldReason.contains("vehicle", ignoreCase = true) -> "vehicle_issue"
        oldReason.contains("emergency", ignoreCase = true) -> "emergency"
        oldReason.contains("customer", ignoreCase = true) -> "customer_request"
        else -> "other"
    }
}
```

**That's the complete minimal migration!** 🎉

---

## FAQ

**Q: Do I need to change everything at once?**  
A: No! Start with later reschedule endpoint. Add earlier reschedule later.

**Q: What if I don't add status polling?**  
A: App will still work. Users just won't see real-time updates. They'll get push notifications instead.

**Q: Can I keep using the old endpoint?**  
A: Yes, for 3 months. But we recommend migrating now.

**Q: How long will migration take?**  
A: Minimal migration: 30 min - 1 hour. Full migration: 1-2 weeks.

**Q: Will my app break if I don't migrate?**  
A: Not immediately, but old endpoint will be removed in 3 months.

---

## Need Help?

- **Quick questions:** Check the full migration guide
- **Technical issues:** Contact API support
- **Migration help:** Contact development team

---

**Last Updated:** [Date]  
**Version:** 1.0  
**Status:** Ready for Quick Migration


