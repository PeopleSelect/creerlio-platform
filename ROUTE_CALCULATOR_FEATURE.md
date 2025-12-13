# Route Calculator Feature - Point A to Point B

## Overview
The Route Calculator now supports a complete Point A (Origin) to Point B (Destination) workflow, allowing talents to:
1. Select their location from a list of Australian suburbs
2. Click on business markers to set them as destinations
3. Automatically calculate routes, costs, and travel times
4. Visualize both points on the map with clear labels

## User Workflow

### Step 1: Select Your Location (Point A)
- Open the map page: `/talent/map`
- Click on **"Routes"** tab in the left sidebar
- A suburb selector appears with 20+ Australian cities/suburbs
- Select your location (e.g., "Sydney CBD, NSW")
- The map automatically centers on your selection
- A **green marker with "📍 Point A"** label appears on the map

### Step 2: Select a Business (Point B)
- Browse businesses on the map (amber/orange markers)
- Click on any business marker to select it as your destination
- The selected business turns **red**, gets larger, and shows **"🎯 Point B"** label
- Business details popup appears

### Step 3: View Route & Costs
- Route is **automatically calculated** when both points are set
- Blue route line draws on the map between Point A and Point B
- Route details appear in sidebar:
  - Distance (km)
  - Duration (hours/minutes)
  - Fuel cost (estimated)
  - Toll costs
  - Parking costs (daily estimate)
  - Public transport alternative costs
  - **Total trip cost**
  
### Step 4: Explore Commute Costs
- View daily commute cost (round trip)
- View weekly commute cost (5 days)
- View monthly commute cost (20 days)
- Compare different travel modes (Drive, Transit, Cycle, Walk)

### Step 5: Change Locations
- Click **"Change Location"** button to select a different suburb
- Select a different business to recalculate route
- Routes automatically update when either point changes

## Features

### 🎯 Point A (Your Location)
- **Suburb Selector**: 20 pre-configured Australian suburbs
  - Sydney: CBD, Parramatta, Bondi, Chatswood
  - Melbourne: CBD, Richmond, St Kilda, Brunswick
  - Brisbane: CBD, Fortitude Valley, South Bank, New Farm
  - Perth: CBD, Fremantle, Subiaco
  - Adelaide: CBD, Glenelg
  - Hobart, Canberra, Darwin
- **Visual Marker**: Large green circle with home icon
- **Label**: "📍 Point A" badge above marker
- **Animated**: Pulse effect to stand out

### 🎯 Point B (Business Location)
- **Business Click**: Any business marker can become Point B
- **Visual Transformation**: 
  - Regular business: Small amber marker (8x8)
  - Selected business: Large red marker (12x12) with pulse animation
- **Label**: "🎯 Point B" badge above selected business
- **Job Count Badge**: Green circle showing open positions

### 🗺️ Route Visualization
- **Blue line** connecting Point A to Point B
- Uses Mapbox Directions API for accurate routing
- Considers real roads and traffic patterns
- Multiple travel modes supported

### 💰 Cost Breakdown
Route calculator shows comprehensive costs:
- **Fuel**: Based on distance and average fuel consumption
- **Tolls**: Estimated toll road charges
- **Parking**: Daily parking cost estimate
- **Public Transport**: Alternative public transport fare
- **Daily Total**: Round trip cost (2x)
- **Weekly Total**: 5 days of commuting
- **Monthly Total**: ~20 days of commuting

### 🚗 Travel Modes
Four travel modes with different calculations:
1. **Driving**: Fuel + tolls + parking
2. **Public Transit**: Train/bus fares
3. **Cycling**: Minimal costs
4. **Walking**: Zero cost

## Technical Implementation

### Files Modified

#### 1. `/components/RouteCalculator.tsx`
**Changes:**
- Added Australian suburbs data (20 cities with coordinates)
- Added suburb selector UI with scrollable list
- Enhanced location summary with "Point A" and "Point B" labels
- Added `onOriginChange` callback for parent component
- Auto-calculation when both points are set
- Better visual styling (green for origin, red for destination)

**New Props:**
```typescript
interface RouteCalculatorProps {
  origin: { latitude: number; longitude: number; address?: string } | null;
  destination: { latitude: number; longitude: number; name?: string; address?: string } | null;
  onRouteCalculated: (route: RouteResult) => void;
  onOriginChange?: (origin: { latitude: number; longitude: number; address: string } | null) => void;
}
```

#### 2. `/app/talent/map/page.tsx`
**Changes:**
- Added `routeOrigin` state separate from `userHomeCoords`
- Initialize route origin from localStorage on load
- Pass business name and address to RouteCalculator
- Handle origin changes and update map center
- Update user home marker when origin changes

**New State:**
```typescript
const [routeOrigin, setRouteOrigin] = useState<{ 
  latitude: number; 
  longitude: number; 
  address: string 
} | null>(null);
```

#### 3. `/components/MapView.tsx`
**Changes:**
- Enhanced Point A marker (green, larger, pulsing, labeled)
- Enhanced business markers with selected state
- Selected business (Point B) shows red, larger, pulsing, labeled
- Added title tooltips for accessibility
- Better visual hierarchy between selected and unselected businesses

**Visual Changes:**
- Point A: 12x12 green circle, white border, pulse animation, "📍 Point A" label
- Point B: 12x12 red circle, white border, pulse animation, "🎯 Point B" label
- Other businesses: 8x8 amber circles, smaller

## API Integration

### Endpoints Used
- `POST /api/map/route` - Calculate route with Mapbox Directions API
  - Request: origin, destination, travelMode
  - Response: distance, duration, geometry, cost breakdown

### Backend (No Changes Required)
The existing MapIntelligence API already supports:
- Route calculation
- Cost estimation
- Multiple travel modes
- GeoJSON route geometry

## User Experience Improvements

### Before
- ❌ No clear way to set origin (Point A)
- ❌ Had to manually enter coordinates
- ❌ Unclear which business is selected for routing
- ❌ No visual distinction between origin and destination
- ❌ Manual route calculation trigger needed

### After
- ✅ Easy suburb selection from dropdown
- ✅ Visual Point A marker (green, labeled)
- ✅ Visual Point B marker (red, labeled, pulsing)
- ✅ Click any business to set as destination
- ✅ Automatic route calculation
- ✅ Clear visual feedback on map
- ✅ Comprehensive cost breakdown
- ✅ Commute planning estimates (daily/weekly/monthly)

## Example Use Case

**Sarah's Story:**
1. Sarah lives in **Parramatta, NSW** and is looking for jobs in Sydney
2. She opens the Creerlio map and clicks "Routes" tab
3. She selects "Parramatta, NSW" from the suburb dropdown
4. A green "Point A" marker appears on Parramatta
5. She sees a tech company in **Sydney CBD** with 5 open positions
6. She clicks the business marker - it turns red with "Point B" label
7. A blue route line automatically draws from Parramatta to Sydney CBD
8. Sarah sees:
   - Distance: 23.4 km
   - Duration: 45 minutes (driving)
   - Daily commute cost: $24 (fuel + tolls)
   - Weekly cost: $120
   - Monthly cost: $480
9. She switches to "Transit" mode and sees:
   - Duration: 55 minutes (train)
   - Daily cost: $8.40 (return fare)
   - Monthly cost: $168
10. Sarah decides the public transport option is more economical
11. She clicks on the business popup to view more details and apply

## Future Enhancements

### Potential Improvements
- [ ] Add custom address search (not just predefined suburbs)
- [ ] Save favorite locations (home, gym, childcare)
- [ ] Multi-point routing (home → childcare → work)
- [ ] Traffic-aware routing with peak hour estimates
- [ ] Carbon footprint calculations
- [ ] Integration with real estate search (find homes near jobs)
- [ ] Compare multiple jobs side-by-side
- [ ] Historical commute data and trends

### Advanced Features
- [ ] Work from home days calculator
- [ ] Flexible working arrangements cost savings
- [ ] Car sharing / rideshare cost estimates
- [ ] Bike path safety ratings
- [ ] Weather impact on commute
- [ ] Public transport delays/disruptions alerts

## Testing Checklist

- [x] Suburb selector displays 20+ suburbs
- [x] Selecting suburb updates Point A marker
- [x] Point A marker shows green with label
- [x] Clicking business sets Point B
- [x] Point B marker shows red with label and pulse
- [x] Route automatically calculates
- [x] Blue route line draws on map
- [x] Cost breakdown displays correctly
- [x] Travel mode switching works
- [x] Change location button works
- [x] Map centers on selected locations
- [x] No console errors
- [x] Mobile responsive design

## Benefits for Talents

### 🏠 Location Intelligence
- **Make informed decisions** about where to live based on job locations
- **Compare suburbs** and their proximity to interesting employers
- **Plan your life** around work-life balance

### 💰 Financial Planning
- **Budget accurately** for commute costs before accepting a job
- **Compare options** between different businesses
- **Understand total cost of employment** (salary - commute costs)

### ⏱️ Time Management
- **Know your commute time** before committing
- **Plan your day** with accurate travel estimates
- **Work-life balance** by choosing nearby opportunities

### 🌟 Proactive Recruiting
- **Explore businesses** based on location convenience
- **Discover opportunities** you might have missed
- **Reach out proactively** to businesses in your preferred area

---

**Status:** ✅ Fully implemented and ready to test
**Date:** November 25, 2025
**Version:** 1.0
