# Driving Mode Fixes

## Issues Fixed

### 1. **Parking Markers Not Showing Up** ✅
**Problem:** Parking markers were not appearing on the map in driving mode.

**Root Cause:** The `accessibleParkingService.enrichRoute()` method only enriched routes with `mode === 'driving'`, but the app also uses `'driving-traffic'` mode. This caused parking data to not be added to driving-traffic routes.

**Fix Applied:**
- Updated `client/src/services/accessibleParkingService.js` line 120
- Changed condition from `if (mode !== 'driving')` to `if (mode !== 'driving' && mode !== 'driving-traffic')`
- Now both driving modes get enriched with parking data

**Files Modified:**
- `client/src/services/accessibleParkingService.js`

---

### 2. **Accessibility Markers Not Disappearing in Driving Mode** ✅
**Problem:** When switching to driving mode, accessibility markers (wheelmap POIs, accessibility.cloud markers) persisted on the map instead of being removed.

**Root Cause:** The `WheelmapLayer` component didn't have a proper cleanup effect when it unmounted. While it had logic to clear markers when `isVisible` changed to false, when the component was completely unmounted (by conditional rendering in `BasicMapComponent.js`), the markers weren't being removed.

**Fix Applied:**
- Added unmount cleanup effect to `client/src/components/WheelmapLayer.js`
- New `useEffect` hook at lines 101-113 that removes all markers when component unmounts
- Uses try-catch to handle cases where markers may already be removed

**Files Modified:**
- `client/src/components/WheelmapLayer.js`

---

### 3. **Accessibility Score Displayed for Driving Routes** ✅
**Problem:** The accessibility score was being shown for driving routes, even though sidewalk accessibility is irrelevant for driving.

**Rationale:** Accessibility scores are based on sidewalk conditions, curb cuts, steps, and pedestrian infrastructure. These metrics don't apply to driving routes where the vehicle travels on roads.

**Fix Applied:**
- **RouteDetailsPanel**: Wrapped accessibility score section (lines 117-133) with conditional rendering
  - Only shows when `routeMode !== 'driving' && routeMode !== 'driving-traffic'`
  
- **NavigationIntegration**: Wrapped comprehensive accessibility section (lines 291-361) with conditional rendering
  - Only shows for walking and transit modes
  - Driving mode now shows route info without accessibility scores

**Files Modified:**
- `client/src/components/RouteDetailsPanel.js`
- `client/src/navigation/NavigationIntegration.js`

---

## Technical Details

### Driving Mode Flow

1. **Route Generation:**
   - User selects driving mode and requests a route
   - `AppShell.js` calls routing service with `routeMode: 'driving'` or `'driving-traffic'`

2. **Parking Enrichment:**
   - After route is generated, `accessibleParkingService.enrichRoute()` is called
   - Service finds accessible parking spots within 500m of destination
   - Parking data is added to `route.features[0].properties.accessibleParking`

3. **Marker Management:**
   - `AppShell.js` (lines 764-843) handles driving mode logic:
     - Removes accessibility layer IDs from `activeLayers` state
     - Manually removes existing accessibility markers from DOM
     - Calls `parkingMarkersService.addParkingMarkers()` with parking data
   
4. **Component Rendering:**
   - `BasicMapComponent.js` conditionally renders `AccessibilityLayerManager` and `WheelmapLayer`
   - When `routeMode` is driving and route exists, these components don't render
   - Unmounting triggers cleanup effects that remove all markers

5. **UI Display:**
   - Route panels check `routeMode` before showing accessibility scores
   - Parking information is shown in `DirectionsPanel` for driving routes
   - Navigation panel hides accessibility sections for driving mode

### Parking Marker Display

**Visual Design:**
- Blue teardrop-shaped markers with 🅿️ emoji
- Top 3 closest spots get numbered badges (1, 2, 3)
- Hover effect scales marker to 1.15x
- White border with drop shadow for visibility

**Popup Information:**
- Parking spot name and distance from destination
- Address (if available)
- Time limit and cost
- Capacity and availability (if known)
- Features (e.g., "Van Accessible", "EV Charging")
- Notes (e.g., "24/7 access", "Pay and Display")

**Implementation:**
- Uses `mapboxgl.Marker` for each parking spot
- Created via `parkingMarkersService.js`
- Markers are only added when `mode === 'driving'` or `mode === 'driving-traffic'`
- Automatically cleared when switching to walking/transit modes

## Testing

### Manual Testing Steps

1. **Test Parking Markers:**
   ```
   a. Set route mode to "Driving"
   b. Enter origin and destination
   c. Generate route
   d. Verify 🅿️ markers appear near destination
   e. Click marker to see parking details popup
   f. Switch to "Walking" mode
   g. Verify parking markers disappear
   ```

2. **Test Accessibility Marker Cleanup:**
   ```
   a. Set route mode to "Walking"
   b. Enable accessibility layers (wheelmap markers, etc.)
   c. Verify accessibility markers appear on map
   d. Generate a walking route
   e. Switch to "Driving" mode
   f. Regenerate route
   g. Verify ALL accessibility markers are removed
   h. Only parking markers and route markers should remain
   ```

3. **Test Accessibility Score Hiding:**
   ```
   a. Generate a walking route
   b. Open route details panel
   c. Verify "Accessibility Score" section is visible
   d. Switch to "Driving" mode
   e. Regenerate route
   f. Open route details panel
   g. Verify "Accessibility Score" section is NOT shown
   h. Start navigation
   i. Verify navigation panel doesn't show accessibility score
   ```

### Expected Behavior

**In Walking/Transit Mode:**
- ✅ Accessibility markers visible (wheelchair accessible places, etc.)
- ✅ Accessibility score displayed in route panels
- ✅ No parking markers
- ✅ Comprehensive accessibility information shown

**In Driving Mode:**
- ✅ NO accessibility markers visible
- ✅ NO accessibility score displayed
- ✅ Parking markers (🅿️) shown near destination
- ✅ Parking information in directions panel
- ✅ Standard route info (distance, duration, directions)

## Files Changed Summary

| File | Changes | Lines |
|------|---------|-------|
| `client/src/services/accessibleParkingService.js` | Fixed mode check to include 'driving-traffic' | 120 |
| `client/src/components/WheelmapLayer.js` | Added unmount cleanup effect | 101-113 |
| `client/src/components/RouteDetailsPanel.js` | Conditionally hide accessibility score | 117-133 |
| `client/src/navigation/NavigationIntegration.js` | Conditionally hide accessibility section | 291-361 |

## Related Files (Context)

- `client/src/components/AppShell.js` - Main driving mode logic and marker management
- `client/src/components/BasicMapComponent.js` - Conditional component rendering
- `client/src/services/parkingMarkersService.js` - Parking marker creation and management
- `client/src/components/AccessibilityLayerManager.js` - Accessibility marker management

## Status

✅ **ALL ISSUES FIXED**

- Parking markers now show correctly in driving mode
- Accessibility markers properly disappear in driving mode  
- Accessibility score hidden for driving routes

## Notes

- Driving mode is specifically optimized for finding accessible parking
- Accessibility infrastructure markers are pedestrian-focused and don't apply to vehicles
- The app now clearly differentiates between pedestrian accessibility and driving accessibility
- Parking data comes from Halifax Open Data and includes real accessible parking spot locations

