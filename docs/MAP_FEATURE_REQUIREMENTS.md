# Creerlio Map Feature Requirements

## Overview
The Creerlio platform needs a comprehensive mapping system that allows talent users to visually search for and discover businesses on the platform using an interactive map interface.

## Current Status
- ✅ Basic map component exists (`/app/talent/map/page.tsx`)
- ✅ MapView component with Mapbox integration
- ✅ CommuteCalculator component
- ❌ Backend API endpoints not implemented
- ❌ Business markers not loading on map
- ❌ Real estate data integration missing
- ❌ Commute cost calculations missing

## Core Requirements

### 1. Map Explorer Dashboard Section
**Location**: `/talent/map` (already exists)

**Features Needed**:
- Full-screen map view
- All businesses displayed as markers
- Visual search by panning/zooming
- Click marker → view business portfolio
- Search radius controls
- Industry/size filters

### 2. Business Markers on Map

**Data Requirements**:
```typescript
interface BusinessMarker {
  id: string;
  name: string;
  industry: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    postcode: string;
  };
  activelyHiring: boolean;
  openPositions: number;
  logo?: string;
}
```

**Backend Endpoint Needed**:
```
GET /api/business/map/markers
Query Params:
  - bounds: lat1,lng1,lat2,lng2 (map viewport)
  - industry: string[] (optional)
  - hiringOnly: boolean (optional)
  - radius: number (km from center)
  
Response: BusinessMarker[]
```

### 3. Visual Search Flow

**User Journey**:
1. Talent opens "Map Explorer" from dashboard
2. Map loads with ALL businesses as markers (or within Australia)
3. User pans to area of interest (e.g., Port Macquarie, NSW)
4. Map updates showing only businesses in visible area
5. User clicks a marker
6. Popup shows business name, industry, open positions
7. "View Portfolio" button opens business detail page

**Technical Implementation**:
- Use Mapbox GL JS clustering for dense areas
- Load markers dynamically based on viewport
- Cache markers for performance
- Smooth transitions when panning

### 4. Business Portfolio Integration

**When User Clicks Marker**:
- Open modal/popup with business preview
- Show key information:
  - Business name and logo
  - Industry and specializations
  - Open positions count
  - Distance from search location
  - "View Full Portfolio" button

**Navigation**:
```typescript
router.push(`/talent/business/${businessId}`)
```

### 5. Contextual Area Data (NEW FEATURES)

#### A. Real Estate / Rental Information
**What to Display**:
- Average rental prices in the area
- Nearby commercial lease costs
- Rental market trends
- Suburb/postcode statistics

**Data Sources**:
- Domain.com.au API (requires partnership)
- realestate.com.au API (requires partnership)
- ABS (Australian Bureau of Statistics) data
- Internal scraped database (check legal compliance)

**API Endpoint Needed**:
```
GET /api/location/real-estate/{postcode}
Response: {
  averageRent: { weekly: number, monthly: number },
  medianPrice: number,
  suburbs: Array<{
    name: string,
    averageRent: number,
    properties: number
  }>,
  trend: 'rising' | 'falling' | 'stable'
}
```

#### B. Commute Routes & Costs
**What to Display**:
- Travel time (car, public transit, walking, cycling)
- Distance
- Estimated costs:
  - Fuel costs (car)
  - Public transit fares
  - Toll road costs
  - Parking fees

**Data Sources**:
- Google Maps Directions API
- Mapbox Directions API
- Transport NSW API (for Sydney/NSW)
- PTV API (for Melbourne/VIC)

**API Endpoint Needed**:
```
GET /api/location/commute
Query Params:
  - from: lat,lng (user location)
  - to: lat,lng (business location)
  - modes: car,transit,walking,cycling
  
Response: {
  routes: Array<{
    mode: string,
    distance: number,
    duration: number,
    cost: {
      daily: number,
      weekly: number,
      monthly: number
    },
    steps: RouteStep[]
  }>
}
```

**Implementation**:
- CommuteCalculator component already exists
- Needs backend integration
- Show multiple route options
- Calculate costs based on:
  - Current fuel prices (API integration)
  - Transit fares (fixed or API)
  - Parking costs (database or estimates)

#### C. Local Area Insights
**What to Display**:
- Population density
- Median income
- Schools and education facilities
- Healthcare facilities
- Safety ratings
- Amenities (shops, restaurants, parks)
- Economic indicators

**Data Sources**:
- ABS (Australian Bureau of Statistics)
- Government open data portals
- Google Places API
- Overpass API (OpenStreetMap data)

**API Endpoint Needed**:
```
GET /api/location/insights/{postcode}
Response: {
  population: number,
  medianIncome: number,
  schools: number,
  crimeRate: string,
  amenities: {
    restaurants: number,
    shops: number,
    parks: number,
    gyms: number
  },
  demographics: {
    medianAge: number,
    familyHouseholds: number
  }
}
```

### 6. Search & Filter Enhancements

**Current Filters** (from BusinessSearch component):
- ✅ Location (city, state, radius)
- ✅ Industry
- ✅ Business size
- ✅ Employment types
- ✅ Actively hiring
- ✅ Has positions

**Additional Filters Needed**:
- Salary range
- Job level (entry, mid, senior)
- Work arrangement (on-site, hybrid, remote)
- Company culture tags
- Benefits offered

**Live Map Updates**:
- Filters should update markers in real-time
- No need to click "Search" button
- Smooth animations when markers appear/disappear

### 7. Mobile Optimization

**Requirements**:
- Responsive map layout
- Touch-friendly controls
- Bottom sheet for business details
- Simplified filters for mobile
- Location services integration ("Use My Location")

## Backend Implementation Checklist

### Database Schema Updates
```sql
-- Ensure businesses table has geocoded locations
ALTER TABLE Businesses ADD COLUMN Latitude DECIMAL(10, 8);
ALTER TABLE Businesses ADD COLUMN Longitude DECIMAL(11, 8);
ALTER TABLE Businesses ADD COLUMN GeocodeSource VARCHAR(50);
ALTER TABLE Businesses ADD COLUMN GeocodeTimestamp DATETIME;

-- Create spatial index for efficient geographic queries
CREATE SPATIAL INDEX idx_business_location ON Businesses(Latitude, Longitude);
```

### API Endpoints to Create

1. **GET /api/business/map/markers** - Get businesses as map markers
2. **GET /api/business/{id}/portfolio** - Get business full profile
3. **GET /api/location/real-estate/{postcode}** - Get rental/lease data
4. **GET /api/location/commute** - Calculate commute routes & costs
5. **GET /api/location/insights/{postcode}** - Get area insights
6. **POST /api/business/search** - Advanced business search (already partially implemented)

### Third-Party Integrations Required

1. **Mapbox** (already integrated)
   - Directions API
   - Geocoding API
   - Static Maps API (for thumbnails)

2. **Real Estate Data** (choose one):
   - Domain.com.au API
   - realestate.com.au API
   - Zillow Australia (if available)

3. **Transport Data**:
   - Google Maps Directions API
   - Transport for NSW API
   - PTV (Public Transport Victoria) API

4. **Government Data**:
   - ABS API (Australian Bureau of Statistics)
   - data.gov.au open datasets
   - State government APIs (NSW, VIC, QLD, etc.)

5. **Places Data**:
   - Google Places API
   - Overpass API (OpenStreetMap)

## Frontend Implementation Checklist

### Components to Update

1. **`/app/talent/map/page.tsx`**
   - Load all business markers
   - Implement viewport-based loading
   - Add marker clustering
   - Connect to backend API
   - Add filter sidebar
   - Implement marker click → business popup

2. **`/components/MapView.tsx`**
   - Add business markers
   - Implement marker clustering
   - Add popup component
   - Handle marker clicks
   - Add map controls (zoom, fullscreen)

3. **`/components/CommuteCalculator.tsx`**
   - Connect to backend API
   - Display multiple route options
   - Show cost breakdowns
   - Add visualizations (charts)

4. **`/components/BusinessSearch.tsx`** (✅ already updated with mock data)
   - Connect to real backend API when ready
   - Add real-time filter updates
   - Improve mobile layout

5. **`/app/talent/business/[id]/page.tsx`**
   - Display real estate data
   - Show commute calculator
   - Display area insights
   - Add map with business location

### New Components to Create

1. **`BusinessMarkerPopup.tsx`**
   - Shows business preview on marker click
   - "View Portfolio" button
   - Quick stats (positions, industry)

2. **`RealEstatePanel.tsx`**
   - Display rental prices
   - Show market trends
   - List nearby properties

3. **`AreaInsightsPanel.tsx`**
   - Population statistics
   - Amenities list
   - Safety ratings
   - Demographics

4. **`RouteComparison.tsx`**
   - Compare multiple commute options
   - Show cost breakdowns
   - Visualize routes on map

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 16.0.3
- **Map Library**: Mapbox GL JS
- **State Management**: React hooks
- **API Client**: Fetch API with error handling (`/lib/api.ts`)

### Backend Stack
- **Framework**: ASP.NET Core 8.0
- **ORM**: Entity Framework Core
- **Database**: SQL Server (Azure SQL)
- **Caching**: IMemoryCache

### API Design
```
/api/business/
  ├── map/markers          # Get businesses for map
  ├── search               # Advanced search
  └── {id}/portfolio       # Full business profile

/api/location/
  ├── real-estate/{postcode}  # Rental/lease data
  ├── commute                 # Route calculations
  └── insights/{postcode}     # Area statistics

/api/masterdata/            # Already implemented
  ├── countries
  ├── states
  ├── cities
  └── ...
```

## Implementation Phases

### Phase 1: Core Map Functionality (Week 1-2)
- ✅ Map component (done)
- ✅ MapView integration (done)
- ❌ Backend: Business markers API
- ❌ Frontend: Load and display markers
- ❌ Marker clustering
- ❌ Marker click → business popup

### Phase 2: Business Integration (Week 3)
- ❌ Backend: Business portfolio API
- ❌ Navigation to business pages
- ❌ Business detail page enhancements
- ❌ Filter integration with map

### Phase 3: Real Estate Data (Week 4)
- ❌ Third-party API integration
- ❌ Backend: Real estate API endpoints
- ❌ Frontend: Real estate panel
- ❌ Display rental prices and trends

### Phase 4: Commute & Routes (Week 5)
- ❌ Google/Mapbox Directions integration
- ❌ Backend: Commute calculation API
- ❌ Frontend: Route visualization
- ❌ Cost calculations (fuel, transit, tolls)

### Phase 5: Area Insights (Week 6)
- ❌ ABS data integration
- ❌ Backend: Area insights API
- ❌ Frontend: Insights panel
- ❌ Demographics and amenities display

### Phase 6: Polish & Optimization (Week 7)
- ❌ Mobile optimization
- ❌ Performance tuning
- ❌ Error handling
- ❌ User testing and feedback

## Success Criteria

✅ **User Can**:
- Open map and see all businesses
- Pan to any area in Australia
- Click marker to view business details
- Navigate to full business portfolio
- See rental prices for area
- Calculate commute costs and routes
- View area insights and demographics
- Filter businesses by multiple criteria
- Use on mobile devices

✅ **Technical**:
- Map loads in < 2 seconds
- Markers cluster efficiently (1000+ businesses)
- API responses < 500ms
- Mobile responsive
- No JSON parse errors
- Proper error handling everywhere

## Notes & Considerations

### Legal & Compliance
- Ensure real estate data usage complies with terms of service
- ABS data is open and free to use
- Google Maps API has usage limits and costs
- Mapbox has free tier but paid at scale

### Performance
- Implement marker clustering for dense areas
- Cache API responses (60 minutes for static data)
- Lazy load business details on demand
- Use CDN for marker icons

### UX
- Provide clear loading states
- Handle "no businesses found" gracefully
- Allow saving favorite locations/businesses
- Add search history
- Implement notifications for new businesses in saved areas

### Future Enhancements
- Job recommendations based on location preferences
- Commute time alerts
- Real estate price alerts
- Business comparison tool
- Heatmap view (job density, salary ranges)
- 3D building visualization
- Street view integration

---

## Current Issues to Fix

1. **JSON Parse Errors**: ✅ FIXED
   - Created `/lib/api.ts` utility with safe fetch
   - Updated master-data-demo to use client-side API detection
   - Fixed BusinessSearch to use mock data until backend ready

2. **Missing Backend Endpoints**:
   - `/api/business/search` - Needed for BusinessSearch
   - `/api/business/map/markers` - Needed for map markers
   - `/api/talent/dashboard` - Needed for dashboard data

3. **Map Not Loading Businesses**:
   - No API to fetch business locations
   - No geocoding for existing businesses
   - No marker rendering logic

## Immediate Next Steps

1. **Backend Developer**:
   - Create BusinessController with search endpoint
   - Add geocoding for all businesses in database
   - Implement map markers API
   - Add portfolio endpoint

2. **Frontend Developer**:
   - Update BusinessSearch to use real API (when ready)
   - Implement marker loading in MapView
   - Add marker clustering
   - Create BusinessMarkerPopup component

3. **Product Manager**:
   - Prioritize third-party API integrations
   - Define budget for paid APIs
   - Create detailed UX wireframes
   - User testing plan

---

**Document Version**: 1.0  
**Last Updated**: November 24, 2025  
**Author**: GitHub Copilot  
**Status**: Requirements Defined, Implementation Pending
