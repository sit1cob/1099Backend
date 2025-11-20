# Pagination Implementation for Analytics Dashboard

## Summary

Added full pagination support to the analytics dashboard with page controls, page size selector, and proper API filtering.

## Features Added

### 1. ✅ Backend Pagination Support

**File:** `src/routes/analytics.ts`

**Changes:**
- Added `page` parameter to `QueryParams` type
- Implemented `skip` and `limit` logic for database queries
- Returns pagination metadata: `page`, `limit`, `totalPages`, `total`

**API Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 1234,
  "page": 2,
  "limit": 50,
  "totalPages": 25
}
```

**Example API Call:**
```
GET /api/analytics?page=2&limit=50&route=/api/auth/login
```

### 2. ✅ Frontend Pagination Component

**File:** `analytics-dashboard/src/components/Pagination.tsx`

**Features:**
- **Page navigation:** Previous, Next, and numbered page buttons
- **Smart page display:** Shows first, last, current, and nearby pages with ellipsis
- **Page size selector:** 10, 25, 50, 100 records per page
- **Record counter:** "Showing X to Y of Z results"
- **Responsive design:** Works on mobile and desktop

**UI Elements:**
```
[Showing 1 to 50 of 1234 results] [Per page: 50 ▼]

[Previous] [1] [2] [3] ... [24] [25] [Next]
```

### 3. ✅ Filter Integration

**Files Modified:**
- `analytics-dashboard/src/types.ts` - Added `page` to `AnalyticsFilter`
- `analytics-dashboard/src/services/api.ts` - Added page parameter to API calls
- `analytics-dashboard/src/App.tsx` - Integrated pagination with filters

**How Filters Work:**
- All filters (route, method, status, dates, search) work with pagination
- Changing filters resets to page 1
- Changing page size resets to page 1
- Export CSV respects current filters (but exports all matching records, not just current page)

### 4. ✅ Export with Filters

**Enhancement:**
The "Export CSV" button now includes all active filters in the URL, so you export exactly what you're viewing (filtered data).

**Example:**
If you filter by:
- Route: `/api/auth/login`
- Status: Failed
- Date: Last 7 days

The export will only include failed login attempts from the last 7 days.

## Usage

### Basic Pagination

1. **Navigate pages:** Click page numbers or Previous/Next buttons
2. **Change page size:** Select from dropdown (10, 25, 50, 100)
3. **View count:** See "Showing X to Y of Z results" at bottom

### Filter + Pagination

1. **Apply filters:** Use filter panel at top
2. **View results:** Table shows filtered results
3. **Navigate pages:** Pagination shows only filtered results
4. **Export:** Click "Export CSV" to download all filtered results

### Example Workflows

**View all login attempts:**
1. Select Route: `/api/auth/login`
2. Navigate through pages to see all login attempts
3. Click "Export CSV" to download complete list

**Find slow requests:**
1. Sort by latency (if implemented)
2. Filter by date range
3. Navigate pages to review
4. Export for analysis

**Debug failed requests:**
1. Select Status: Failed
2. Select specific route
3. Review error patterns across pages
4. Export for detailed analysis

## API Endpoints

### Get Analytics with Pagination
```
GET /api/analytics?page=2&limit=50&route=/api/auth/login&success=failed
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 50, max: 500)
- `route` - Filter by route
- `method` - Filter by HTTP method
- `success` - Filter by success/failed
- `userId` - Filter by user ID
- `search` - Search across multiple fields
- `from` - Start date (YYYY-MM-DD)
- `to` - End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "method": "POST",
      "url": "/api/auth/login",
      "statusCode": 401,
      "success": false,
      "elapsedMs": 45,
      "createdAt": "2025-11-20T14:30:00Z",
      ...
    }
  ],
  "total": 1234,
  "page": 2,
  "limit": 50,
  "totalPages": 25
}
```

### Export with Filters
```
GET /api/analytics/export?route=/api/auth/login&success=failed&from=2025-11-13&to=2025-11-20
```

Returns CSV file with all matching records (up to 500).

## Testing

### Test Pagination

1. **Start backend:**
   ```bash
   cd /Users/sjena/Documents/DeepDive/TechHub/1099-Job-Board-orignal/new-mongo-app
   npm run dev
   ```

2. **Start dashboard:**
   ```bash
   cd analytics-dashboard
   npm run dev
   ```

3. **Open browser:**
   ```
   http://localhost:5177
   ```

4. **Test scenarios:**
   - Click page 2, verify URL updates and data changes
   - Change page size to 25, verify page resets to 1
   - Apply filter, verify pagination resets
   - Navigate pages with filter active
   - Export CSV with filters, verify correct data

### API Testing

```bash
# Get page 1
curl "http://localhost:5010/api/analytics?page=1&limit=10" | jq

# Get page 2
curl "http://localhost:5010/api/analytics?page=2&limit=10" | jq

# Filter + pagination
curl "http://localhost:5010/api/analytics?page=1&limit=10&route=/api/auth/login" | jq

# Export filtered data
curl "http://localhost:5010/api/analytics/export?route=/api/auth/login" -o login_attempts.csv
```

## Files Modified

### Backend
- `src/routes/analytics.ts`
  - Added `page` parameter support
  - Implemented `skip` logic for pagination
  - Return pagination metadata

### Frontend
- `analytics-dashboard/src/types.ts`
  - Added `page` to `AnalyticsFilter`
  - Added pagination fields to `AnalyticsResponse`

- `analytics-dashboard/src/services/api.ts`
  - Added `page` parameter to API calls

- `analytics-dashboard/src/components/Pagination.tsx` (NEW)
  - Created pagination component

- `analytics-dashboard/src/App.tsx`
  - Integrated pagination component
  - Added page change handlers
  - Added export URL with filters

## Performance Considerations

- **Database:** Uses MongoDB `skip()` and `limit()` for efficient pagination
- **Default page size:** 50 records (good balance between performance and usability)
- **Max limit:** 500 records per page (prevents excessive memory usage)
- **Export limit:** 500 records max (can be increased if needed)

## Future Enhancements

Potential improvements:
- Add "Jump to page" input field
- Add keyboard shortcuts (arrow keys for navigation)
- Remember page size preference in localStorage
- Add "Show all" option (with warning for large datasets)
- Implement cursor-based pagination for very large datasets
- Add loading skeleton during page transitions
- Add URL query params to persist pagination state on refresh

## Summary

✅ **Backend pagination** - Efficient database queries with skip/limit  
✅ **Frontend pagination UI** - Clean, responsive pagination controls  
✅ **Filter integration** - All filters work seamlessly with pagination  
✅ **Export with filters** - CSV export respects active filters  
✅ **Page size selector** - Choose 10, 25, 50, or 100 records per page  
✅ **Record counter** - Always know what you're viewing  
✅ **Smart page display** - Shows relevant pages with ellipsis  

The analytics dashboard now provides a professional, scalable way to browse through thousands of API logs!
