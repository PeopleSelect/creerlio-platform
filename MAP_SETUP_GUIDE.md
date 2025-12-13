# Map Feature Setup Guide

## 🗺️ Overview

The Creerlio platform now includes a complete **interactive mapping ecosystem** for talent to visualize job locations, calculate commutes, and explore neighborhoods. Built with **Mapbox GL** for cost-effectiveness (~$50-100/month vs Google Maps $200-500/month).

## ✅ What's Been Implemented

### 1. Core Infrastructure
- ✅ Mapbox GL JS, React Map GL libraries installed
- ✅ Complete mapping utilities library (`/lib/mapboxUtils.ts`)
- ✅ Reusable MapView component (`/components/MapView.tsx`)
- ✅ Main map page (`/app/talent/map/page.tsx`)
- ✅ Commute calculator component (`/app/talent/map/components/CommuteCalculator.tsx`)

### 2. Mapping Features
- ✅ **Interactive Map Display**
  - Business location markers with job counts
  - User home location marker
  - Distance-based filtering (5km, 10km, 20km, 50km)
  - Industry filtering
  - Address search with geocoding
  
- ✅ **Geocoding & Location Services**
  - Address to coordinates conversion
  - Reverse geocoding (coordinates to address)
  - Australian city defaults (Sydney, Melbourne, Brisbane, Perth, Adelaide, Canberra, Hobart, Darwin)
  - Location autocomplete ready for integration

- ✅ **Route Calculation**
  - Multi-modal routing (drive, transit, walk, bike)
  - Turn-by-turn directions
  - Distance and duration calculations
  - Route visualization on map
  
- ✅ **Sydney Toll Cost Estimation**
  - Automatic toll detection based on route
  - Distance-based estimation ($4-12)
  - Major toll road coverage (M1, M2, M4, M5, M7, M8, Cross City Tunnel, etc.)

- ✅ **Commute Calculator UI**
  - Home and work address inputs
  - Mode comparison (drive, transit, walk, bike)
  - Commute score (Excellent/Good/Fair/Long)
  - Turn-by-turn direction display
  - Save and share functionality

### 3. Bug Fixes
- ✅ **Critical: File Upload User Isolation**
  - Fixed hard-coded `'talent-demo'` userId in file uploads
  - Now uses actual user ID from AuthContext
  - Files properly isolated per user in localStorage
  - Fixed in: profile photo, portfolio, resume, certificates

## 📋 Setup Instructions

### Step 1: Get Mapbox Access Token

1. **Create Mapbox Account** (if you don't have one):
   - Go to https://www.mapbox.com/
   - Click "Sign up" (free tier includes 50,000 map loads/month)
   
2. **Get Your Access Token**:
   - Log in to https://account.mapbox.com/
   - Navigate to "Access tokens"
   - Copy your default public token (starts with `pk.`)
   - **OR** Create a new token:
     - Click "Create a token"
     - Name it "Creerlio Platform"
     - Scopes needed: ✅ All Public Scopes
     - URL restrictions: Optional (add your domain for security)
     - Click "Create token"

3. **Add Token to Environment Variables**:
   ```bash
   # Edit .env.local file
   cd /workspaces/creerlio-platform/frontend/frontend-app
   nano .env.local
   ```
   
   Replace `your_mapbox_token_here` with your actual token:
   ```env
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6IjEyMzQ1Njc4OTAifQ.abcdefghijklmnopqrstuv
   ```

### Step 2: Update Mapbox Utilities

The token is currently hard-coded in `/lib/mapboxUtils.ts`. It will automatically read from the environment variable, but you can verify:

```typescript
// /lib/mapboxUtils.ts (line 3)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'your_fallback_token_here';
```

### Step 3: Test the Map Feature

1. **Start the development server**:
   ```bash
   cd /workspaces/creerlio-platform/frontend/frontend-app
   npm run dev
   ```

2. **Navigate to the map page**:
   - Log in as a Talent user
   - Go to: http://localhost:3000/talent/map
   
3. **Test features**:
   - ✅ Map loads with business markers
   - ✅ Search for your home address (e.g., "Sydney Opera House")
   - ✅ Click a business marker to see details
   - ✅ Filter by distance and industry
   - ✅ Calculate a route to see commute time

### Step 4: Verify File Upload Fix

1. **Test as User 1**:
   - Log in as Simon Rorke
   - Go to Profile → Edit
   - Upload a profile photo
   - Upload portfolio images
   - Check localStorage (DevTools → Application → Local Storage)
   - Should see keys like: `profilePhoto_[simon's-user-id]`, `creerlio_uploads_[simon's-user-id]_portfolio`

2. **Test as User 2**:
   - Log out
   - Log in as different user
   - Upload different files
   - Verify localStorage has separate keys with different user IDs
   - Files should NOT overlap

## 🔧 Configuration Files

### Environment Variables (.env.local)
```env
# Mapbox Configuration
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiY3JlZXJsaW8iLCJhIjoiZGVtby10b2tlbiJ9.demo

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5007

# Environment
NODE_ENV=development
```

### Key Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| `/lib/mapboxUtils.ts` | ✅ Created | Geocoding, routing, toll estimation utilities |
| `/components/MapView.tsx` | ✅ Created | Reusable map component with markers and popups |
| `/app/talent/map/page.tsx` | ✅ Created | Main map page with filters and search |
| `/app/talent/map/components/CommuteCalculator.tsx` | ✅ Created | Commute calculation UI |
| `/app/talent/profile/edit/page.tsx` | ✅ Modified | Fixed file upload user isolation |
| `/.env.local` | ✅ Created | Environment configuration |

## 🎯 Usage Examples

### Geocoding an Address
```typescript
import { geocodeAddress } from '@/lib/mapboxUtils';

const location = await geocodeAddress('123 George Street, Sydney NSW 2000');
// Returns: { address, city, state, postcode, coordinates: { latitude, longitude } }
```

### Calculating a Route
```typescript
import { calculateRoute } from '@/lib/mapboxUtils';

const route = await calculateRoute(
  { latitude: -33.8688, longitude: 151.2093 }, // Sydney CBD
  { latitude: -33.8908, longitude: 151.2743 }, // Bondi Beach
  'driving'
);
// Returns: { duration (minutes), distance (km), tollCost, steps[] }
```

### Using the Map Component
```tsx
import MapView from '@/components/MapView';

<MapView
  businesses={businessList}
  center={[151.2093, -33.8688]}
  zoom={12}
  onBusinessClick={handleClick}
  showUserLocation={true}
  userHome={userHomeCoords}
  routeGeoJSON={routeData}
/>
```

## 🚀 Next Steps (Pending Implementation)

### Phase 1: Backend Integration (1-2 weeks)
- [ ] Connect map to real business data from API
- [ ] Save user home location to database
- [ ] Store saved commutes in user preferences
- [ ] Add business profile pages with map integration

### Phase 2: Enhanced Features (2-3 weeks)
- [ ] **Neighborhood Information Panel**
  - School ratings (MySchool API)
  - Real estate listings (Domain.com.au API)
  - Public transport stations
  - Amenities (parks, cafes, shopping)
  - Cost of living estimates

- [ ] **Multi-Location Comparison Tool**
  - Side-by-side comparison of 2-3 locations
  - Scoring system for commute, schools, amenities
  - Export comparison as PDF
  - Share comparison link

- [ ] **Public Transport Integration**
  - NSW Transport API for Sydney
  - PTV API for Melbourne
  - TransLink API for Brisbane
  - Real-time transit schedules
  - Station proximity markers

### Phase 3: Advanced Features (3-4 weeks)
- [ ] **Map on Job Search Page**
  - Toggle between list and map view
  - Job location markers
  - Quick commute calculation
  - Save favorite locations

- [ ] **Drag-to-Draw Search Area**
  - Custom polygon search areas
  - Multiple area selection
  - Save search areas

- [ ] **Traffic Overlay**
  - Peak vs off-peak commute times
  - Historical traffic data
  - Recommended travel times

- [ ] **Real Estate Integration**
  - Domain.com.au API
  - realestate.com.au API
  - Rent/buy price indicators
  - Property details on click

## 💰 Cost Estimates

### Mapbox (Current Solution)
- **Free Tier**: 50,000 map loads/month
- **Expected Usage**: 3,000-5,000/month initially
- **Cost**: $0/month (well within free tier)
- **Paid Tier**: $5/month for up to 100,000 loads (if needed)

### Additional API Costs (Future)
- **NSW Transport API**: Free (requires registration)
- **Domain.com.au API**: ~$200-500/month (basic tier)
- **MySchool API**: Free (public data)
- **TripGo API**: ~$50-100/month (multi-modal transit)

**Total Estimated Monthly Cost**: $50-100 (current), $300-700 (all features)

## 🧪 Testing Checklist

### Map Display
- [ ] Map loads without errors
- [ ] Business markers appear correctly
- [ ] Clicking marker shows popup with business info
- [ ] Zoom and pan controls work
- [ ] User location permission works (if granted)

### Address Search
- [ ] Search box accepts Australian addresses
- [ ] Geocoding returns accurate coordinates
- [ ] Map centers on searched location
- [ ] Invalid addresses show error message

### Distance Filtering
- [ ] 5km filter shows correct businesses
- [ ] 10km filter expands results
- [ ] 20km and 50km work correctly
- [ ] Requires home location to be set

### Industry Filtering
- [ ] "All" shows all businesses
- [ ] Specific industry filters correctly
- [ ] Combines with distance filter

### Commute Calculator
- [ ] Home address autocomplete works
- [ ] Work address accepts input
- [ ] "Calculate Commute" fetches routes
- [ ] All modes (drive/transit/walk/bike) calculate
- [ ] Duration and distance display correctly
- [ ] Toll costs show for Sydney routes
- [ ] Turn-by-turn directions appear
- [ ] Route displays on map

### File Upload
- [ ] Profile photo uploads to correct user
- [ ] Portfolio images isolated per user
- [ ] Resume saved with user ID
- [ ] Certificates uploaded correctly
- [ ] Switching users shows different files

## 🐛 Troubleshooting

### Map Not Loading
1. Check Mapbox token in `.env.local`
2. Verify token is valid at https://account.mapbox.com/
3. Check browser console for errors
4. Ensure `NEXT_PUBLIC_` prefix is used (required for client-side)

### Geocoding Not Working
1. Check internet connection
2. Verify Mapbox token has geocoding scope
3. Check address format (should include suburb, state)
4. Look for rate limiting errors (50,000/month limit)

### Route Calculation Fails
1. Ensure both start and end coordinates are valid
2. Check if locations are in Australia (AU-focused)
3. Transit mode may not work for all locations
4. Verify Mapbox token has directions scope

### File Uploads Still Mixing
1. Verify `useAuth()` is imported
2. Check `user.id` is not null/undefined
3. Clear localStorage and test with fresh uploads
4. Ensure user is logged in before uploading

## 📞 Support

For issues or questions:
1. Check browser console for error messages
2. Verify environment variables are set correctly
3. Check Mapbox dashboard for API usage/errors
4. Review this guide's troubleshooting section

## 🎉 Success Criteria

When setup is complete, you should be able to:
- ✅ View interactive map with business markers
- ✅ Search for any Australian address
- ✅ Filter businesses by distance and industry
- ✅ Calculate commute times with toll estimates
- ✅ See turn-by-turn directions
- ✅ Upload files that stay isolated per user
- ✅ Switch between map and list views

---

**Status**: ✅ Core features complete, ready for testing
**Last Updated**: Now
**Next Milestone**: Get Mapbox token and test map functionality
