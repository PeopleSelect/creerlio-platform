# Business Profile & Location Intelligence Feature

## Overview
Implemented comprehensive business profile pages with integrated location intelligence, enabling talents to make informed decisions about job opportunities by viewing housing costs, transport options, and living expenses for each business location.

## Feature Components

### 1. Business Profile Page (`/talent/business/[id]/page.tsx`)

**Route**: `/talent/business/{businessId}`

**Purpose**: Display detailed information about a business, including open positions and comprehensive location intelligence data.

#### Features:
- **Business Overview Tab**:
  - Company description and about section
  - Company highlights (size, industry, employee count, open positions)
  - Contact information (website, email, phone)
  - Location details with map link

- **Open Positions Tab**:
  - List of all available jobs
  - Job title, type (Full-time, Part-time, Casual, etc.)
  - Salary range
  - Job description
  - Apply button for each position

- **Location & Costs Tab**:
  - Interactive Google Maps embed showing business location
  - **Housing Market Data**:
    - Median house price
    - Median rent (weekly)
    - 1, 2, 3 bedroom rental prices
  - **Transport & Commute**:
    - Nearest train station and distance
    - Weekly transport cost estimate
    - Parking costs
    - Available public transport routes
  - **Lifestyle & Amenities**:
    - Population density
    - Number of schools, hospitals, shopping centers
  - **Cost Calculator**:
    - Estimated monthly living costs (rent + transport + groceries + utilities)
    - Helps talents evaluate if job salary is sufficient for the location

**User Journey**:
1. Talent searches for businesses in BusinessSearch component
2. Clicks "View Profile" on any business card
3. Navigates to `/talent/business/{id}`
4. Reviews company information, open positions
5. Checks "Location & Costs" tab to understand living expenses
6. Makes informed decision about applying or connecting

---

### 2. Enhanced MapView Component (`/components/MapView.tsx`)

**Purpose**: Display businesses on an interactive map with location intelligence overlays.

#### Features:
- **Business Markers**:
  - Green markers for actively hiring businesses
  - Blue markers for other businesses
  - Numbers on markers indicate open positions
  - Hover to see business details in tooltip

- **Click-to-View Intelligence**:
  - Click any business marker to see location panel
  - Instant display of:
    - Housing costs (median rent, house prices)
    - Transport costs (weekly cost, station distance)
    - Estimated monthly living costs
  - "View Full Profile" button links to business profile page

- **Legend**:
  - Color-coded legend explaining marker meanings
  - Numbers indicate open position count

- **User Location** (optional):
  - Show talent's home location
  - Calculate distance to businesses
  - Display commute routes

**Integration**: Used in BusinessSearch component when user switches to "Map View"

---

### 3. Business Search with Map Toggle (`/components/BusinessSearch.tsx`)

**New Features**:
- **View Mode Toggle**:
  - List icon button for traditional list view
  - Map icon button for interactive map view
  - Toggle appears after search results are displayed

- **Click-through to Profiles**:
  - "View Profile" button now links to `/talent/business/{id}`
  - Opens business profile page with all details

- **Map View Integration**:
  - When map view selected, displays MapView component
  - All search results shown as markers on map
  - Full-screen map (600px height)
  - Click markers to see location intelligence
  - Click "View Full Profile" in popup to navigate to business page

---

### 4. Backend API Endpoints

#### Business Profile API (`BusinessProfileController.cs`)

**Endpoint**: `GET /api/business/profile/{id}`

**Returns**:
```json
{
  "id": "business-001",
  "name": "Build Right Construction",
  "industry": "Construction",
  "businessSize": "Medium (21-50 employees)",
  "about": "Company description...",
  "website": "https://buildright.com.au",
  "email": "careers@buildright.com.au",
  "phone": "02 9876 5432",
  "founded": "2008",
  "employeeCount": "35 employees",
  "openPositions": 5,
  "activelyHiring": true,
  "location": {
    "address": "45 Church Street, Parramatta",
    "city": "Parramatta",
    "state": "NSW",
    "postcode": "2150",
    "latitude": -33.8150,
    "longitude": 151.0052
  },
  "positions": [
    {
      "id": "job-001",
      "title": "Qualified Carpenter",
      "type": "Full-time",
      "salary": "$70,000 - $85,000",
      "description": "Job description..."
    }
  ]
}
```

**Mock Data**: Currently returns 4 sample businesses
- Build Right Construction (Parramatta)
- Tech Solutions Australia (North Sydney)
- Westside Healthcare Group (Westmead)
- Golden Harvest Hospitality (Parramatta)

**TODO**: Replace with actual database queries

---

#### Location Intelligence API (`LocationIntelligenceController.cs`)

**Endpoint 1**: `GET /api/location/intelligence/{businessId}`

**Purpose**: Get comprehensive location data for a specific business

**Returns**:
```json
{
  "businessId": "business-001",
  "location": "Parramatta, NSW",
  "housing": {
    "medianHousePrice": "$1,150,000",
    "medianRent": "$650/week",
    "averageRent1Bed": "$450/week",
    "averageRent2Bed": "$650/week",
    "averageRent3Bed": "$800/week",
    "rentalYield": "3.8%",
    "propertyGrowth": "12.3% (12 months)"
  },
  "transport": {
    "nearestStation": "Parramatta Station",
    "distanceToStation": "600m (8 min walk)",
    "weeklyTransportCost": "$55",
    "parkingCost": "$20-$30/day",
    "routes": ["T1 North Shore Line", "T2 Inner West Line", ...],
    "travelTimes": {
      "Sydney CBD": "30 min by train",
      "Macquarie Park": "20 min by train",
      ...
    }
  },
  "lifestyle": {
    "populationDensity": "High (3,200 per km²)",
    "schools": 25,
    "hospitals": 3,
    "shoppingCenters": 5,
    "parks": 15,
    "demographics": {
      "medianAge": 32,
      "medianIncome": "$52,000",
      "unemploymentRate": "4.8%"
    }
  },
  "costOfLiving": {
    "groceriesMonthly": "$800",
    "utilitiesMonthly": "$220",
    "totalEstimatedMonthly": "$4,200"
  },
  "amenities": {
    "nearbyAttractions": [...],
    "universities": [...],
    "majorEmployers": [...]
  }
}
```

**Endpoint 2**: `GET /api/location/suburb-data/{suburb}/{state}`

**Purpose**: Get generic suburb data for any location (not business-specific)

**Use Case**: Future feature - compare multiple suburbs, search by location first

---

## Data Sources (Future Integration)

Currently using mock data. Production implementation should integrate:

### Real Estate Data:
- **Domain.com.au API**: Median house prices, rental data
- **Realestate.com.au API**: Property listings, market trends
- **ABS Housing Data**: Official government statistics

### Transport Data:
- **Transport for NSW API**: Train/bus routes, schedules, real-time data
- **Google Maps Directions API**: Commute time calculations
- **Opal Card API**: Fare calculations, weekly transport costs

### Lifestyle Data:
- **ABS Census Data**: Population, demographics, employment stats
- **Google Places API**: Schools, hospitals, shopping centers, amenities
- **Suburb Profile APIs**: Local area information, crime stats, school zones

---

## User Experience Flow

### Scenario: Talent searches for construction businesses in Parramatta

1. **Search**:
   - Talent enters "Parramatta, NSW" and selects "Construction" industry
   - Clicks "Search Businesses"
   - System returns 1 result: Build Right Construction

2. **List View**:
   - Shows business card with:
     - Company name, industry, location
     - "5 open positions" badge
     - "Actively Hiring" status
     - Company description
   - Talent clicks "View Profile"

3. **Business Profile - Overview Tab**:
   - Reads company description: "15 years experience, specializing in residential and commercial"
   - Sees company size: "35 employees"
   - Notes contact details

4. **Business Profile - Positions Tab**:
   - Browses 5 open positions:
     - Qualified Carpenter ($70-85k)
     - Construction Project Manager ($95-120k)
     - Apprentice Bricklayer
     - Site Supervisor ($80-95k)
     - Labourer ($28-35/hr)
   - Interested in Project Manager role

5. **Business Profile - Location & Costs Tab**:
   - **Critical Decision Point**: "Can I afford to work here?"
   - Views map: 600m to Parramatta Station (8 min walk)
   - Checks housing:
     - 2 bedroom rental: $650/week = $2,815/month
     - Median house price: $1.15M (if considering buying)
   - Checks transport:
     - Weekly cost: $55 = $238/month
     - 30 min train to Sydney CBD
   - Reviews cost calculator:
     - **Total monthly: $4,200** (rent + transport + groceries + utilities)
     - Project Manager salary: $95-120k = $7,900-10,000/month
     - **Conclusion: Financially viable!**

6. **Decision**:
   - Clicks "Connect with Business" to initiate contact
   - Or clicks "Apply Now" on specific job

---

## Map View Scenario

### Scenario: Talent wants to see all businesses on a map

1. **After Search**:
   - Talent searches "Parramatta, NSW" + "Construction, Healthcare, ICT"
   - Gets 4 results in list view

2. **Switch to Map**:
   - Clicks map icon button
   - Map loads showing Sydney region
   - 4 markers appear:
     - Build Right Construction (Parramatta) - Green marker with "5"
     - Tech Solutions (North Sydney) - Green marker with "15"
     - Westside Healthcare (Westmead) - Green marker with "25"
     - Golden Harvest (Parramatta) - Blue marker with "0"

3. **Explore on Map**:
   - Hovers over Build Right marker
   - Popup shows: "Build Right Construction, Construction, Parramatta NSW, 5 open positions"
   - Clicks marker

4. **Location Intelligence Panel**:
   - Bottom panel slides up with:
     - Company name and industry
     - Distance: "2.5km away"
     - Housing: Median Rent $650/week
     - Transport: $55/week
     - **Est. Monthly: $4,200**
   - Clicks "View Full Profile" → navigates to business page

5. **Compare Locations**:
   - Clicks Tech Solutions marker (North Sydney)
   - New panel shows:
     - Median Rent: $850/week (more expensive!)
     - Transport: $65/week
     - **Est. Monthly: $5,500**
   - Realizes North Sydney is $1,300/month more expensive
   - Decides Parramatta offers better value

---

## Key Value Propositions

### For Talents:
1. **Informed Career Decisions**: Know living costs before applying
2. **Avoid Financial Surprises**: No more "I can't afford to live here" after accepting job
3. **Compare Locations**: See all options on map, compare costs instantly
4. **Realistic Salary Expectations**: Understand what salary is needed for each location
5. **Commute Planning**: Know transport options and costs upfront

### For Businesses:
1. **Attract Remote Talent**: Show that your location has affordable housing
2. **Highlight Location Benefits**: Great transport links, amenities
3. **Reduce Offer Rejections**: Talents know costs upfront, no sticker shock
4. **Competitive Advantage**: Businesses in affordable areas can compete with higher-paying CBD jobs

### Platform Differentiator:
- **No other job platform offers this level of location intelligence**
- Competitors show job listings only
- Creerlio helps talents make **holistic career decisions** considering total lifestyle cost

---

## Future Enhancements

### Phase 1: Real Data Integration (Priority 1)
- [ ] Integrate Domain.com.au API for housing data
- [ ] Integrate Transport for NSW API for real transport routes
- [ ] Fetch Google Places data for amenities
- [ ] Implement actual geolocation coordinates for businesses

### Phase 2: Advanced Map Features (Priority 2)
- [ ] Heat maps showing rental price zones
- [ ] Transport route overlays (train lines, bus routes)
- [ ] School zones and hospital catchment areas
- [ ] "Commute Time" mode - calculate travel time from talent's home

### Phase 3: Cost Comparison Tools (Priority 3)
- [ ] Side-by-side location comparison
- [ ] "Can I afford this?" calculator with salary input
- [ ] Lifestyle cost breakdown (dining, entertainment, childcare)
- [ ] Suburb quality-of-life scores

### Phase 4: Personalization (Priority 4)
- [ ] Save talent's preferred locations
- [ ] Alert when jobs open in preferred areas
- [ ] Personalized cost estimates based on talent's lifestyle
- [ ] Family-friendly suburb recommendations (schools, parks, safety)

---

## Testing the Feature

### Test User Journey:

1. **Login**: talent@demo.com / Password123!

2. **Navigate to Dashboard**: Business Search is the primary feature

3. **Search**:
   - City: Parramatta
   - State: NSW
   - Radius: 10 km
   - Industry: Construction
   - Click "Search Businesses"

4. **View Results**: Should see Build Right Construction

5. **Click "View Profile"**: Opens `/talent/business/business-001`

6. **Explore Tabs**:
   - Overview: Read company description
   - Positions: See 5 open jobs
   - Location & Costs: **KEY FEATURE** - view map and cost breakdown

7. **Switch to Map View**:
   - Go back to dashboard
   - Search again
   - Click map icon
   - See all businesses on map
   - Click markers to view location intelligence

---

## API Testing

### Test Business Profile Endpoint:
```bash
curl http://localhost:5007/api/business/profile/business-001
```

**Expected**: Full business profile JSON with positions

### Test Location Intelligence Endpoint:
```bash
curl http://localhost:5007/api/location/intelligence/business-001
```

**Expected**: Comprehensive location data for Parramatta

### Test Suburb Data Endpoint:
```bash
curl http://localhost:5007/api/location/suburb-data/Parramatta/NSW
```

**Expected**: Generic suburb data for Parramatta

---

## Technical Implementation Notes

### Frontend:
- Business profile page uses Next.js 14 dynamic routing `[id]`
- MapView component lazy-loaded with `dynamic()` to avoid SSR issues
- Location intelligence fetched on business marker click (reduces API calls)
- Cost calculator uses live data from API responses

### Backend:
- Controllers return mock data with realistic Australian suburb information
- Uses reflection to handle anonymous type objects in mock data
- Async methods flagged with warnings (expected - no actual async operations yet)
- CORS already configured for Codespaces

### Database (TODO):
- Create `Business` table with lat/long columns
- Create `LocationData` table for cached suburb information
- Create `JobPosition` table linked to businesses
- Create `LocationIntelligenceCache` table (update weekly from APIs)

---

## Success Metrics

### Short-term (3 months):
- 80% of talents view "Location & Costs" tab before applying
- 50% of talents use map view to compare businesses
- Reduce job offer rejection rate by 15% (talents know costs upfront)

### Long-term (12 months):
- Location intelligence cited as #1 feature in user surveys
- Higher talent satisfaction scores (realistic expectations)
- Businesses in "affordable" suburbs get 30% more applications
- Platform average: talents apply to businesses within $500/month budget of their salary

---

## Documentation for Team

### For Developers:
- Business profile page: `/frontend/frontend-app/app/talent/business/[id]/page.tsx`
- Map component: `/frontend/frontend-app/components/MapView.tsx`
- Search component: `/frontend/frontend-app/components/BusinessSearch.tsx`
- Backend APIs: `/backend/Creerlio.Api/Controllers/BusinessProfileController.cs` and `LocationIntelligenceController.cs`

### For Product/UX:
- User journey documented above
- Key value proposition: "Know before you go"
- Target pain point: "I accepted a job, then realized I can't afford to live there"

### For Marketing:
- **Tagline**: "Search smarter. Know the real cost before you apply."
- **Key Message**: "Creerlio shows you not just the job, but the lifestyle you can afford."
- **Comparison**: "Other platforms: Just job listings. Creerlio: Job + Location + Costs = Informed Decisions."

---

## Status: ✅ FEATURE COMPLETE

All components implemented and tested:
- ✅ Business Profile page with 3 tabs
- ✅ MapView with location intelligence popups
- ✅ BusinessSearch with list/map toggle
- ✅ Backend APIs for profiles and location data
- ✅ Mock data for 4 businesses across 3 Sydney suburbs
- ✅ Cost calculator on profile pages
- ✅ Clickable markers with instant intelligence display

**Ready for user testing!**
