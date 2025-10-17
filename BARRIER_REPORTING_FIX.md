# Barrier Reporting Fix

## Problem
The "Report a Barrier" feature was not working. Users could fill out the form, but when clicking submit, the barrier was not saved and did not appear on the map.

## Root Cause
There was a **critical mismatch** between the barrier types sent from the frontend and the types expected by the backend validation schema:

### Frontend Types (ReportBarrierModal.js)
- `steps_stairs`
- `steep_slope`
- `obstructed_path`
- `inaccessible_entrance`
- `no_curb_cut`
- `poor_lighting`
- `construction`
- `snow_ice`
- `other`

### Backend Expected Types (barriers.js - OLD)
- `steps`
- `construction`
- `curb`
- `icy`
- `other`

When a user submitted a barrier report, the backend's Zod validation schema rejected the request with a 400 error because the `type` field didn't match any of the expected enum values.

## Fixes Applied

### 1. Backend Validation Schema (server/routes/barriers.js)
Updated the `barrierReportSchema` to accept all frontend barrier types:

```javascript
type: z.enum([
  'steps_stairs',
  'steep_slope',
  'obstructed_path',
  'inaccessible_entrance',
  'no_curb_cut',
  'poor_lighting',
  'construction',
  'snow_ice',
  'other'
])
```

### 2. Barrier Icon Mappings
Updated icon mappings in two files to match the new types:

**client/src/services/barrierReportingService.js:**
```javascript
const icons = {
  'steps_stairs': '🪜',
  'steep_slope': '📈',
  'obstructed_path': '🚧',
  'inaccessible_entrance': '🚪',
  'no_curb_cut': '♿',
  'poor_lighting': '💡',
  'construction': '🏗️',
  'snow_ice': '❄️',
  'other': '❓'
};
```

**client/src/components/BasicMapComponent.js:**
- Updated `getBarrierIcon()` function with the same icon mappings

### 3. Error Handling (client/src/components/ReportBarrierModal.js)
Improved error handling to show actual server error messages to users:

```javascript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  console.error("Server error:", errorData);
  throw new Error(errorData.error || errorData.message || "Failed to submit barrier report");
}
```

Also updated the catch block to display the actual error message:

```javascript
toast.error(error.message || "Failed to submit report. Please try again.");
```

## Testing Instructions

### Manual Testing
1. Start the server: `npm start` or `node server/index.js`
2. Open the app in a browser
3. Click on "Report Barrier" button
4. Fill out the form with:
   - Select a barrier type (e.g., "Steps / Stairs")
   - Select severity (Low, Medium, or High)
   - Add a description
   - Provide location (use current location or click on map)
5. Click "Submit"
6. Verify:
   - Success toast message appears: "Thank you for reporting this barrier!"
   - Modal closes
   - Barrier appears on the map with the correct icon
   - No console errors

### API Testing
Test the endpoint directly:

```bash
curl -X POST http://localhost:3001/api/barriers/report \
  -F "type=steps_stairs" \
  -F "severity=high" \
  -F "description=Test barrier" \
  -F "lat=44.6488" \
  -F "lng=-63.5752" \
  -F "locationDetails=Test location"
```

Expected response:
```json
{
  "status": "ok",
  "id": "uuid-here",
  "message": "Barrier report submitted successfully"
}
```

### Verification
1. Check database: Verify barrier is saved in the `barriers` table
2. Check map: Barrier should appear with correct icon
3. Check API: GET `/api/barriers` should return the new barrier in GeoJSON format

## Files Modified
- `server/routes/barriers.js` - Updated validation schema
- `client/src/services/barrierReportingService.js` - Updated icon mappings
- `client/src/components/BasicMapComponent.js` - Updated icon mappings
- `client/src/components/ReportBarrierModal.js` - Improved error handling

## Status
✅ **FIXED** - Barrier reporting now works correctly with proper validation and display.

