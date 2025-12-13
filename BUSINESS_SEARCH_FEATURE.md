# BUSINESS SEARCH FEATURE - CORE PLATFORM CAPABILITY

## Overview
The Business Search feature is a **PRIMARY FUNCTION** of the Creerlio platform, enabling talents to proactively search for and connect with businesses they want to work for, rather than only responding to job postings.

## Key Concept
**Talents search for businesses, not just jobs.**

Traditional job platforms are reactive - talents wait for jobs to be posted. Creerlio is proactive - talents can discover businesses matching their criteria and reach out directly.

---

## Feature Components

### 1. Business Search Component
**Location**: `/frontend/frontend-app/components/BusinessSearch.tsx`

**Capabilities**:
- **Geospatial Search**: "What businesses are within 10km of Parramatta?"
- **Industry Filtering**: Filter by 33 major industries and sub-categories
- **Business Size**: Filter by employee count (Micro, Small, Medium, Large, Enterprise)
- **Hiring Status**: Show only businesses actively hiring
- **Open Positions**: Show only businesses with current vacancies
- **Distance Calculation**: Shows exact distance from search location

**Search Inputs**:
```typescript
{
  query: string;              // Business name or keywords
  location: {
    city: string;             // e.g., "Parramatta"
    state: string;            // e.g., "NSW"
    radius: number;           // 1-200+ km
  };
  industry: string[];         // Multiple industry selection
  businessSize: string[];     // Employee count ranges
  employmentTypes: string[];  // Full-time, Part-time, etc.
  activelyHiring: boolean;    // Only show hiring businesses
  hasPositions: boolean;      // Only show businesses with open roles
}
```

**Search Results Display**:
- Business name and logo
- Industry and specializations
- Location with distance from search point
- Business size (employee count)
- Actively hiring badge
- Number of open positions
- Business description
- Action buttons: "View Profile", "Connect"

---

### 2. No Results Notification System
**Critical Feature**: When a talent searches but finds no matching businesses, the platform automatically notifies the admin team.

**Purpose**: 
- Identify gaps in business coverage
- Proactively recruit businesses in high-demand areas
- Notify businesses that talents are actively seeking employment with companies like theirs
- Track talent demand patterns to guide business acquisition strategy

**Notification Contents**:
```typescript
{
  searchQuery: string;        // What the talent searched for
  location: string;           // City, State
  radius: number;             // Search radius in km
  industry: string;           // Target industry
  criteria: {
    businessSize: string[];
    employmentTypes: string[];
    activelyHiring: boolean;
    hasPositions: boolean;
  };
  timestamp: string;          // When the search occurred
  talentId: string;           // Who performed the search
}
```

**Notification Display** (Backend Console):
```
===================================================================================
🔔 NO BUSINESS RESULTS NOTIFICATION
===================================================================================
📅 Timestamp: 2025-11-23T12:30:00Z
👤 Talent ID: talent-12345
🔍 Search Query: construction companies
📍 Location: Parramatta, NSW (Radius: 10km)
🏢 Industry: Construction
📊 Criteria:
   - Business Sizes: Medium (21-50 employees), Large (201-500 employees)
   - Employment Types: Full-time, Apprenticeship
   - Actively Hiring: true
   - Has Positions: true
===================================================================================

📧 ACTION REQUIRED:
   1. Review the search criteria above
   2. Identify potential businesses in the area matching these criteria
   3. Reach out to businesses not yet on the platform
   4. Inform them about talent actively seeking employment with businesses like theirs
===================================================================================
```

**Future Enhancements** (TODO when database available):
1. Save notifications to `NotificationLog` table
2. Send email alerts to platform admin
3. Create tasks in CRM system for business outreach
4. Track conversion: when notified business signs up
5. Auto-notify talent when matching business joins platform
6. Analytics dashboard: most-searched industries/locations with no results

---

### 3. Backend API Endpoints

#### Business Search API
**Endpoint**: `POST /api/business/search`
**Controller**: `BusinessSearchController.cs`
**Location**: `/backend/Creerlio.Api/Controllers/BusinessSearchController.cs`

**Request Example**:
```json
{
  "query": "construction",
  "location": {
    "city": "Parramatta",
    "state": "NSW",
    "radius": 10
  },
  "industry": ["Construction", "Engineering"],
  "businessSize": ["Medium (21-50 employees)", "Large (201-500 employees)"],
  "employmentTypes": ["Full-time", "Apprenticeship"],
  "activelyHiring": true,
  "hasPositions": true
}
```

**Response Example**:
```json
{
  "businesses": [
    {
      "id": "biz-001",
      "name": "Build Right Construction",
      "industry": "Construction",
      "location": {
        "city": "Parramatta",
        "state": "NSW",
        "suburb": "Parramatta",
        "postcode": "2150"
      },
      "distance": 2.5,
      "size": "Medium (21-50 employees)",
      "activelyHiring": true,
      "openPositions": 5,
      "description": "Leading construction company...",
      "specializations": ["Commercial Construction", "Project Management"],
      "established": 2005
    }
  ],
  "count": 1,
  "searchCriteria": { /* original search params */ }
}
```

**Current Implementation**: Mock data (returns sample businesses)
**Production TODO**: 
- Integrate with database (Business table)
- Implement geospatial queries (PostGIS or similar)
- Calculate real-time distances using lat/long coordinates
- Add full-text search on business names and descriptions
- Index industries, locations for fast filtering
- Implement pagination for large result sets

#### No Results Notification API
**Endpoint**: `POST /api/notifications/no-business-results`
**Controller**: `NotificationsController.cs`
**Location**: `/backend/Creerlio.Api/Controllers/NotificationsController.cs`

**Current Implementation**: Logs to console with formatted output
**Production TODO** (see Notification Display section above)

---

## User Experience Flow

### Talent Searches for Businesses

1. **Talent logs into dashboard**
   - Primary feature: Business Search prominently displayed
   - Updated welcome message: "Search for businesses you want to work for"

2. **Talent enters search criteria**
   - Example: "10km radius of Parramatta, Construction industry, Medium-sized businesses, Actively hiring"

3. **Results displayed**
   - **Scenario A: Businesses found**
     - Shows list of matching businesses
     - Displays distance, size, hiring status, open positions
     - Talent can view profiles and connect directly

   - **Scenario B: No businesses found**
     - Displays friendly message: "No businesses found matching your criteria"
     - Shows blue notification banner: "We've notified our team!"
     - Explains: Platform team will reach out to matching businesses in the area
     - Sets expectation: "We'll update you when new businesses join"

4. **Platform team receives notification**
   - Review search criteria
   - Identify 5-10 potential businesses in area
   - Reach out with value proposition:
     - "Talented workers in your area are actively seeking employment with businesses like yours"
     - "Join Creerlio to connect with pre-qualified talent"
   - Track outreach in CRM
   - When business signs up, notify original talent

5. **Business cycle**
   - Business joins platform → Profile created → Appears in future searches
   - More businesses = More talent attracted = Network effect

---

## Integration with Master Data

The Business Search uses comprehensive master data for filtering:

### From MASTER_DATA_SPECIFICATION.md:
- **33 Major Industries** (Section 9)
- **400+ Job Sub-Categories** (Section 10)
- **Australian Cities & Towns** (Section 3)
  - NSW: Sydney, Parramatta, Newcastle, Wollongong, etc.
  - VIC: Melbourne, Geelong, Ballarat, etc.
  - QLD: Brisbane, Gold Coast, Cairns, etc.
  - All states covered
- **Radius Search Options** (Section 5)
  - 1km, 2km, 5km, 10km, 15km, 20km, 25km, 50km, 75km, 100km, 150km, 200km
  - Statewide, Nationwide
- **Business Sizes** (Section 17)
  - Self-employed / Sole Trader (0 employees)
  - Micro (1-5 employees)
  - Small (6-20 employees)
  - Medium (21-50 employees)
  - Medium-Large (51-200 employees)
  - Large (201-500 employees)
  - Enterprise (500+ employees)
- **Business Types** (Section 16)
  - Sole Trader, Partnership, Company, Franchise, etc.

---

## Database Schema (Future Implementation)

### Business Table
```sql
CREATE TABLE Business (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    description TEXT,
    established_year INT,
    business_size VARCHAR(50),
    business_type VARCHAR(50),
    actively_hiring BOOLEAN DEFAULT false,
    
    -- Location (for geospatial search)
    address VARCHAR(255),
    suburb VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(10),
    postcode VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location GEOGRAPHY(POINT, 4326), -- PostGIS for geospatial queries
    
    -- Contact
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Profile
    logo_url VARCHAR(500),
    specializations JSON, -- Array of specialization strings
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_industry (industry),
    INDEX idx_location (city, state),
    INDEX idx_actively_hiring (actively_hiring),
    SPATIAL INDEX idx_geolocation (location)
);
```

### BusinessPosition Table (Open Jobs)
```sql
CREATE TABLE BusinessPosition (
    id UUID PRIMARY KEY,
    business_id UUID REFERENCES Business(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    employment_type VARCHAR(50), -- Full-time, Part-time, etc.
    salary_min INT,
    salary_max INT,
    status VARCHAR(20) DEFAULT 'open', -- open, filled, closed
    posted_date TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_business_id (business_id),
    INDEX idx_status (status)
);
```

### NotificationLog Table
```sql
CREATE TABLE NotificationLog (
    id UUID PRIMARY KEY,
    talent_id UUID REFERENCES User(id),
    notification_type VARCHAR(50), -- 'no_business_results'
    search_criteria JSON,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT,
    
    INDEX idx_talent_id (talent_id),
    INDEX idx_type (notification_type),
    INDEX idx_created_at (created_at)
);
```

### Geospatial Search Query Example (PostGIS)
```sql
-- Find businesses within 10km of Parramatta
SELECT 
    b.*,
    ST_Distance(
        b.location, 
        ST_SetSRID(ST_MakePoint(151.0052, -33.8150), 4326)::geography
    ) / 1000 AS distance_km
FROM Business b
WHERE 
    ST_DWithin(
        b.location, 
        ST_SetSRID(ST_MakePoint(151.0052, -33.8150), 4326)::geography,
        10000  -- 10km in meters
    )
    AND b.industry = 'Construction'
    AND b.actively_hiring = true
ORDER BY distance_km ASC
LIMIT 20;
```

---

## Analytics & Insights

### Track These Metrics:
1. **Search Volume**
   - How many business searches per day/week
   - Peak search times
   - Most searched industries
   - Most searched locations

2. **No Results Rate**
   - Percentage of searches returning zero results
   - Industries with highest no-results rate
   - Locations with insufficient business coverage

3. **Conversion Tracking**
   - Searches → Business profile views
   - Profile views → Connection requests
   - Connection requests → Hires
   - No-results notifications → Business sign-ups

4. **Geographic Heat Maps**
   - Where are talents searching from?
   - Where are gaps in business coverage?
   - Target areas for business acquisition

---

## Business Outreach Strategy

When no-results notification received:

### 1. Research Phase
- Identify 5-10 businesses in the area matching criteria
- Use Google Maps, industry directories, LinkedIn
- Build target list with contact details

### 2. Outreach Message Template
```
Subject: Talented [INDUSTRY] professionals seeking opportunities with businesses like yours

Hi [Business Owner Name],

I'm reaching out from Creerlio, a talent marketplace connecting businesses with 
skilled professionals.

We noticed that qualified [INDUSTRY] workers in [LOCATION] are actively searching 
for employment opportunities with businesses like yours. Just this week, we had 
[X] searches from candidates looking for [SPECIFIC ROLES] within [RADIUS]km of 
your location.

Creerlio makes it easy to:
• Connect with pre-qualified talent actively seeking work
• Post positions and get matched candidates instantly
• Build your team with skills-verified professionals

Would you be interested in a quick call to discuss how Creerlio can help you 
find your next great hire?

Best regards,
[Your Name]
Creerlio Team
```

### 3. Track Outcomes
- Log outreach in CRM
- Track responses and sign-ups
- Notify original talent when business joins
- Measure conversion rate: notification → business sign-up

---

## Priority Implementation Plan

### ✅ COMPLETED:
1. Business Search Component (React)
2. Backend API endpoints (mock data)
3. No-results notification system (console logging)
4. Integration with talent dashboard

### 🔄 TODO (Database Phase):
1. Create Business, BusinessPosition, NotificationLog tables
2. Implement geospatial search (PostGIS or similar)
3. Distance calculation using lat/long coordinates
4. Save no-results notifications to database
5. Email notifications to platform admin
6. CRM integration for business outreach tracking

### 🔄 TODO (Enhancement Phase):
1. Business profile pages
2. Connection/messaging system between talent and business
3. Analytics dashboard for search insights
4. Auto-notify talent when matching business joins
5. Saved searches feature
6. Search history and recommendations
7. Map view of search results

---

## Success Metrics

**Short-term** (First 3 months):
- 500+ business searches per week
- 100+ no-results notifications tracked
- 20+ businesses signed up from outreach
- 10+ talent-business connections made

**Long-term** (12 months):
- 10,000+ businesses in database
- 80%+ searches return results
- Network effect: more businesses attract more talent
- Platform becomes go-to resource for proactive job seeking

---

## Key Differentiator

**Traditional Job Boards**: Reactive
- Talent waits for job postings
- Limited visibility into companies not actively posting
- Businesses control the entire process

**Creerlio**: Proactive
- Talents discover businesses they want to work for
- Search by location, industry, size, culture
- Connect directly, even if no positions posted
- Businesses benefit from inbound talent interest
- Platform team actively recruits businesses based on talent demand

This makes Creerlio a true **talent marketplace**, not just a job board.

---

## Files Modified/Created

### Frontend:
- ✅ `/frontend/frontend-app/components/BusinessSearch.tsx` (NEW)
- ✅ `/frontend/frontend-app/app/talent/dashboard/page.tsx` (UPDATED)
- ✅ `/frontend/frontend-app/lib/enums/business.ts` (ALREADY EXISTS)

### Backend:
- ✅ `/backend/Creerlio.Api/Controllers/BusinessSearchController.cs` (NEW)
- ✅ `/backend/Creerlio.Api/Controllers/NotificationsController.cs` (NEW)

### Documentation:
- ✅ `/BUSINESS_SEARCH_FEATURE.md` (THIS FILE)
