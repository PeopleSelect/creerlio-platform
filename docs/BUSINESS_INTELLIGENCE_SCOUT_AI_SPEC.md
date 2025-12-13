# Business Intelligence Feed - Technical Specification
## Feature Name: "Scout AI" / "Business Footprint Intelligence"

## Overview
An AI-driven opportunity-detection system that continuously monitors multiple information streams and automatically sends intelligence briefs to businesses at their chosen frequency. The system helps businesses discover hiring opportunities, market changes, and growth signals before their competitors.

## Core Problem Solved
Businesses miss critical opportunities because they:
- Don't have time to monitor multiple data sources
- Miss signals buried in noise
- React too slowly to market changes
- Can't identify patterns across disparate information

Scout AI solves this by being their 24/7 intelligent watchdog.

---

## Intelligence Categories

### 1. Employment & Talent Signals
Helps businesses find or attract new talent.

**Data Sources:**
- Mass layoffs/redundancies in local area
- Business closures (available skilled staff)
- Immigration policy changes
- University/TAFE graduate outputs
- LinkedIn job change patterns
- SEEK/Indeed job listing trends

**Example Alert:**
```
🎯 Talent Opportunity Detected
Event: Major retailer closing 3 stores in Western Sydney
Impact: ~150 retail workers becoming available
Relevant Skills: Customer Service, Inventory, Team Leadership
Location: Within 15km of your business
Action: Consider posting retail roles now to capture experienced talent
Confidence: 94% (5 sources)
```

### 2. Local Development & Planning Activity
Spot new customer bases, partnerships, or competitive threats.

**Data Sources:**
- Council DA (Development Application) registers
- State planning portals
- PlanningAlerts API
- Infrastructure project databases
- Rezoning decisions

**Example Alert:**
```
🏗️ Development Opportunity
Event: 400-dwelling residential estate approved in Kellyville
Timeline: Construction starts Q2 2026
Relevance: New customer base for home services
Potential Impact: High - substantial local population growth
Competitors: 2 similar businesses already in area
Action: Consider early marketing campaign to new residents
Sources: Blacktown Council DA, Planning NSW, Local news (3 sources)
```

### 3. Industry-Specific News
Tailored intelligence for specific business categories.

**Examples by Industry:**

**Café/Hospitality:**
- Food safety regulation changes
- Upcoming local events/festivals
- Tourism spike predictions
- Competitor openings/closings

**Trades (Electricians, Plumbers):**
- New construction projects
- Infrastructure works
- Building code changes
- Commercial development activity

**Tech/Professional Services:**
- Government grants/tenders
- Industry programs
- Co-working space openings
- Corporate relocations

### 4. Business Growth Opportunities
**Data Sources:**
- Government grant portals
- Tender databases
- Economic development programs
- Business support initiatives
- Tax incentives

**Example Alert:**
```
💰 Grant Opportunity
Program: Small Business Digital Adaptation Grant
Amount: Up to $15,000
Eligibility: Your business matches 8/10 criteria
Deadline: 45 days
Action: Apply now - highly competitive
Match Score: 87%
```

### 5. Competitive Landscape
**Monitoring:**
- New business registrations (ASIC)
- Competitor closures
- Major local employment changes
- Online review trends
- Market share shifts

---

## Intelligence Filtering & Quality Control

### Multi-Source Confirmation (3-5 Sources Rule)
Before ANY alert reaches a business, the system confirms the event across multiple independent sources.

**Example Verification Chain:**
```
Event: New DA Approval
✓ Source 1: Blacktown Council DA register
✓ Source 2: PlanningAlerts API
✓ Source 3: Local planning blog
✓ Source 4: State planning release
✓ Source 5: GIS/zoning update

Status: VERIFIED (5/5 sources) → Send alert
```

### Relevance Scoring Algorithm
Every event scored on multiple dimensions (0-100):

```typescript
interface RelevanceScore {
  industryMatch: number;      // 0-100
  locationProximity: number;  // 0-100  
  impactPotential: number;    // 0-100
  urgency: number;            // 0-100
  sourceConfidence: number;   // 0-100
  
  overall: number;            // Weighted average
}

// Example scoring:
{
  industryMatch: 95,           // Law firm + legal news
  locationProximity: 80,       // 8km from business
  impactPotential: 70,         // Medium-sized event
  urgency: 60,                 // Event in 3 months
  sourceConfidence: 90,        // 4 reliable sources
  overall: 79                  // SEND (threshold: 70)
}
```

### Filtering Dimensions

#### 1. Industry Relevance
- Business industry must match event category
- Specialization sub-filter (e.g., employment law vs property law)
- Related industries (e.g., construction → trades)

#### 2. Location Relevance  
Configurable radius:
- Local: 5-10km
- Regional: 20-50km
- State-wide
- National

#### 3. Business Objective Relevance
Businesses configure what they care about:
```json
{
  "talentAcquisition": true,
  "marketExpansion": true,
  "competitorMonitoring": false,
  "regulatoryUpdates": true,
  "partnershipOpportunities": true
}
```

#### 4. Impact Score Threshold
Businesses set minimum impact score:
- Critical: 80-100 (immediate alert)
- Important: 60-79 (daily digest)
- Moderate: 40-59 (weekly summary)
- Low: 0-39 (filtered out)

### Duplicate & Similarity Detection
AI detects when multiple sources report same event:
- Fuzzy matching on event details
- Entity resolution (same company, different names)
- Timeline correlation
- Geographic proximity

**Output**: One clean summary instead of 5 redundant alerts.

---

## Delivery Mechanisms

### Frequency Options
Businesses choose:
- **Real-time**: Critical alerts only (push notification)
- **Daily Digest**: Email + app notification (7am local time)
- **Weekly Briefing**: Comprehensive summary (Monday 8am)
- **Custom Schedule**: e.g., Every Tuesday & Friday at 9am

### Format Options
- ✉️ Email (HTML formatted)
- 📱 SMS (for critical alerts)
- 🔔 In-app notification
- 💬 Slack integration
- 📊 Teams integration
- 📞 WhatsApp Business (future)

### Content Structure
Each delivery includes:

```markdown
# Scout AI Intelligence Brief
**For**: [Business Name]
**Period**: [Date Range]
**Events Detected**: 12 | **High Priority**: 3

---

## 🔴 CRITICAL: Immediate Action Recommended

### 1. Major Competitor Closure - Talent Opportunity
**What**: ABC Plumbing closing all Sydney operations
**When**: 30 days notice period ending Dec 15
**Impact**: 45 qualified plumbers becoming available
**Location**: 12km from you
**Why it matters**: Rare opportunity to hire experienced team
**Recommended action**: Post roles now, reach out to employees
**Sources**: LinkedIn, ASIC, Local news (4 sources)
**Confidence**: 96%

---

## 🟡 IMPORTANT: Review This Week

### 2. New Housing Development Approved
[Details...]

### 3. Government Grant Opening
[Details...]

---

## 🟢 GENERAL: For Your Awareness

### 4-12. [Summary list of lower-priority items]

---

**Feedback**: [Rate this intel] 👍 👎 | [Adjust preferences]
```

---

## Technical Architecture

### Data Ingestion Pipeline

```
┌─────────────────────────────────────────┐
│     Data Sources (External APIs)       │
├─────────────────────────────────────────┤
│ • Council DA registers                  │
│ • ASIC business register               │
│ • Job listing APIs (SEEK, Indeed)      │
│ • News feeds (RSS, Google News)        │
│ • Government tender portals            │
│ • LinkedIn data (via API)              │
│ • Planning portals                     │
│ • ABS statistics                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Ingestion Service (24/7)          │
│  • Web scraping                        │
│  • API polling                         │
│  • Webhook listeners                   │
│  • RSS aggregation                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│       Raw Data Queue (Redis)           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    AI Processing Pipeline              │
├─────────────────────────────────────────┤
│ 1. Entity extraction (NER)             │
│ 2. Classification (category, industry) │
│ 3. Geocoding (location matching)       │
│ 4. Deduplication                       │
│ 5. Source verification                 │
│ 6. Relevance scoring                   │
│ 7. Impact assessment                   │
│ 8. Summary generation                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Verified Events Database            │
│         (PostgreSQL)                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Matching Engine                   │
│  • Business profile matching           │
│  • Relevance filtering                 │
│  • Priority assignment                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Notification Scheduler              │
│  • Queue by frequency preference       │
│  • Batch daily/weekly digests          │
│  • Send critical alerts immediately    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│       Delivery Services                │
│  • Email (SendGrid)                    │
│  • SMS (Twilio)                        │
│  • Push notifications (Firebase)       │
│  • Slack/Teams webhooks                │
└─────────────────────────────────────────┘
```

### Database Schema

```sql
-- Verified Intelligence Events
CREATE TABLE IntelligenceEvents (
    Id UUID PRIMARY KEY,
    EventType VARCHAR(100),
    Title VARCHAR(500),
    Description TEXT,
    Category VARCHAR(100),
    Industry VARCHAR(100),
    Location GEOGRAPHY(POINT),
    Radius INT,
    SourceUrls JSONB,
    SourceCount INT,
    Confidence DECIMAL(5,2),
    ImpactScore INT,
    UrgencyScore INT,
    EventDate TIMESTAMPTZ,
    DetectedAt TIMESTAMPTZ,
    VerifiedAt TIMESTAMPTZ,
    ExpiresAt TIMESTAMPTZ,
    Metadata JSONB
);

-- Business Intelligence Preferences
CREATE TABLE BusinessIntelligencePreferences (
    BusinessId UUID PRIMARY KEY REFERENCES BusinessProfiles(Id),
    Enabled BOOLEAN DEFAULT true,
    DeliveryFrequency VARCHAR(50), -- realtime, daily, weekly, custom
    DeliveryMethods JSONB, -- ["email", "sms", "app"]
    Categories JSONB, -- ["talent", "development", "grants", etc]
    MinimumImpactScore INT DEFAULT 60,
    LocationRadius INT DEFAULT 20, -- km
    PreferredDeliveryTime TIME, -- e.g., 07:00
    PreferredDays JSONB, -- ["monday", "friday"]
    EmailAddress VARCHAR(255),
    PhoneNumber VARCHAR(20),
    SlackWebhookUrl TEXT,
    CreatedAt TIMESTAMPTZ,
    UpdatedAt TIMESTAMPTZ
);

-- Event Deliveries (tracking)
CREATE TABLE IntelligenceEventDeliveries (
    Id UUID PRIMARY KEY,
    BusinessId UUID REFERENCES BusinessProfiles(Id),
    EventId UUID REFERENCES IntelligenceEvents(Id),
    DeliveredAt TIMESTAMPTZ,
    DeliveryMethod VARCHAR(50),
    ReadAt TIMESTAMPTZ,
    FeedbackRating INT, -- 1-5 or thumbs up/down
    FeedbackComment TEXT,
    ActionTaken BOOLEAN
);
```

### API Endpoints

#### GET /api/intelligence/feed
Get intelligence events for authenticated business.

```typescript
interface IntelligenceFeedRequest {
  period?: 'today' | 'week' | 'month';
  category?: string[];
  minImpactScore?: number;
  limit?: number;
}

interface IntelligenceFeedResponse {
  events: IntelligenceEvent[];
  summary: {
    total: number;
    critical: number;
    important: number;
    general: number;
  };
  lastUpdated: string;
}
```

#### POST /api/intelligence/feedback
Record user feedback on event relevance.

```typescript
interface FeedbackRequest {
  eventId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  actionTaken?: boolean;
}
```

#### GET/PUT /api/intelligence/preferences
Manage intelligence preferences.

```typescript
interface IntelligencePreferences {
  enabled: boolean;
  deliveryFrequency: 'realtime' | 'daily' | 'weekly' | 'custom';
  deliveryMethods: ('email' | 'sms' | 'app' | 'slack')[];
  categories: string[];
  minimumImpactScore: number;
  locationRadius: number;
  schedule?: {
    time: string;
    days: string[];
  };
}
```

---

## AI Processing Details

### Event Classification
```python
# Pseudo-code for AI classification
def classify_event(raw_event):
    # Extract entities
    entities = ner_model.extract(raw_event.text)
    
    # Determine category
    category = classifier_model.predict(raw_event.text)
    # Categories: talent, development, grant, regulatory, competitive
    
    # Industry mapping
    industry = industry_classifier.predict(entities, category)
    
    # Geocoding
    location = geocoder.geocode(entities.locations)
    
    # Impact scoring
    impact = impact_model.score(
        event_size=extract_scale(entities),
        urgency=extract_timeline(entities),
        relevance=category_importance
    )
    
    return ProcessedEvent(
        category=category,
        industry=industry,
        location=location,
        impact_score=impact,
        entities=entities
    )
```

### Source Verification
```python
def verify_event(raw_events):
    # Group similar events
    event_clusters = fuzzy_match(raw_events)
    
    for cluster in event_clusters:
        # Count independent sources
        sources = deduplicate_sources(cluster.sources)
        
        if len(sources) >= 3:
            # Create verified event
            verified = merge_cluster(cluster)
            verified.confidence = calculate_confidence(sources)
            verified.source_count = len(sources)
            
            if verified.confidence >= 0.85:
                return VerifiedEvent(verified)
        
    return None  # Not enough sources
```

---

## Implementation Phases

### Phase 1: MVP (Current Sprint)
- ✅ Basic event ingestion (manual data entry)
- ✅ Simple matching algorithm
- ✅ Email delivery
- ⏳ Database schema
- ⏳ Preferences UI

### Phase 2: Automated Ingestion (Next Sprint)
- Council DA API integration
- ASIC business register
- News feed aggregation
- Job listing APIs
- Basic AI classification

### Phase 3: Advanced AI (Month 2-3)
- Multi-source verification
- Impact scoring model
- Smart summarization
- Predictive opportunity detection

### Phase 4: Scale & Optimize (Month 4+)
- Real-time processing
- SMS/Slack integrations
- Advanced filtering
- Machine learning from feedback

---

## Pricing Model

### Free Tier
- Weekly digest only
- Max 5 events per week
- Email only
- Standard relevance filtering

### Professional ($49/month)
- Daily digest
- Unlimited events
- SMS alerts for critical
- Advanced filtering
- Slack integration

### Enterprise ($199/month)
- Real-time alerts
- Custom categories
- API access
- Dedicated intelligence analyst review
- Multi-location support

---

## Success Metrics

### KPIs
- **Event Discovery Rate**: New opportunities detected per business per week (target: 5-10)
- **Relevance Score**: % of events rated helpful by users (target: >75%)
- **Action Rate**: % of events where business took action (target: >20%)
- **Time to Action**: Hours between alert and business response (target: <24h for critical)
- **Retention Rate**: % of businesses still using after 3 months (target: >70%)

### A/B Testing
- Different summary formats
- Impact score thresholds
- Delivery timing
- Alert frequency

---

## Compliance & Legal

### Data Sources
- Only use publicly available data
- Respect robots.txt and rate limits
- Proper attribution of sources
- GDPR/Privacy Act compliance

### User Consent
- Clear opt-in for intelligence feed
- Easy opt-out mechanism
- Control over data usage
- Transparency on sources

---

**Status**: ✅ Backend API scaffold ready | ⏳ Data ingestion pending | 🔜 AI classification model
**Owner**: Development Team
**Last Updated**: 2025-11-24
