# Business Intelligence Radar (Scout AI / Opportunity Footprint)

## Overview
An AI-driven opportunity-detection system that continuously monitors multiple information streams and automatically sends tailored intelligence briefings to businesses. The system identifies opportunities for talent acquisition, business growth, competitive positioning, and market changes.

## Core Concept
Businesses receive **verified, relevant, actionable intelligence** at their chosen frequency (daily, weekly, or instant alerts) about events that could affect their:
- Talent acquisition opportunities
- Business growth potential  
- Competitive landscape
- Regulatory environment
- Local market conditions

## Key Principle: Quality Over Quantity
**❌ NOT a spam generator**  
**✅ Strict multi-source validation before any alert is sent**

### Validation Rules
1. **Multi-Source Confirmation (3-5 Sources Rule)**
   - Every alert must be confirmed across 3-5 independent sources
   - Prevents false positives and single-source rumours
   - Only verified events reach the business

2. **Relevance Scoring (0-100)**
   - Each event scored against multiple dimensions
   - Businesses set minimum threshold (e.g., "Only 60+ scores")
   - Low-relevance items filtered automatically

3. **Category Filtering**
   - Businesses choose which intelligence categories they want
   - Fine-grained control prevents irrelevant alerts

## Intelligence Categories

### 1. 🎯 Employment & Talent Signals
Helps businesses find or attract new talent:

- **Mass layoffs/redundancies** in their industry or local area
- **Business closures** nearby (potentially available skilled staff)
- **Immigration policy changes** that open new talent pools
- **University/TAFE graduate outputs** in relevant fields
- **Competitor staffing changes** (hiring freezes, expansions)
- **Industry skill shortages** announcements

**Example Alert:**
```
🟡 Medium Priority | Talent Opportunity

ABC Manufacturing (15km away) announced 120 redundancies
- Industry: Manufacturing & Engineering
- Roles affected: Mechanical Engineers, Technicians, Production Managers
- Timeline: 30-day notice period ending March 15

Why this matters:
These workers match your hiring profile for:
- Senior Mechanical Engineer (currently advertised)
- Production Supervisor roles

Recommended action:
- Contact ABC HR for talent pipeline discussion
- Post targeted ads in local engineering groups
- Prepare fast-track interview process

Sources: ABC Company announcement, Australian Financial Review, 
         Local council economic development, LinkedIn activity

Confidence: 92% | Sources: 4/5
```

### 2. 🏗️ Local Development & Planning Activity
Spots new customer bases, partnerships, or competitive threats:

- **New Development Applications (DA)** approved
  - Housing estates → demand for local services
  - Retail/commercial → partnership or competition opportunities
  - Industrial → B2B opportunities

- **Infrastructure projects** announced or approved
- **Rezoning decisions** affecting business potential
- **Major construction starting** in the area

**Example Alert:**
```
🟢 High Priority | Growth Opportunity

New residential development approved: "Parramatta Grove Estate"
- Location: 3.2km from your cafe
- Scale: 450 new dwellings
- Timeline: Construction Q2 2025, first occupancy Q4 2025
- Demographics: Young families, professionals

Why this matters:
This represents 1,000+ new potential customers within your service radius.

Recommended actions:
- Begin planning for increased capacity
- Consider catering service for construction crews (immediate opportunity)
- Prepare marketing campaign for move-in period (Q4 2025)
- Review staffing needs for Q4 2025

Sources: Parramatta Council DA register, PlanningAlerts, 
         Western Sydney Business News, Development NSW

Confidence: 95% | Sources: 4/4
```

### 3. 📰 Industry-Specific Intelligence
Tailored to business category:

#### For Hospitality (Café/Restaurant):
- Food safety regulation changes
- Tourism spikes or major events
- Competitor openings/closings
- Supplier issues or opportunities

#### For Trades (Electricians/Plumbers):
- New construction projects
- Building code changes
- Government grant programs
- Major infrastructure work

#### For Professional Services (Law/Accounting):
- Regulatory changes requiring client updates
- Large business activities (M&A, restructuring)
- New legislation affecting practice areas
- Industry association updates

**Example Alert:**
```
🔴 Critical | Regulatory Change

New workplace safety legislation affecting electrical contractors

Changes effective: July 1, 2025
- Mandatory certification updates for high-voltage work
- New documentation requirements
- Updated safety equipment standards

Why this matters:
You have 12 active clients who will require compliance updates.
Your team certifications expire Q3 2025 (timing critical).

Recommended actions:
- Schedule team recertification (book now - limited availability)
- Prepare client communication templates
- Update service pricing to reflect compliance costs
- Review and update safety procedures documentation

Sources: NSW Government Gazette, SafeWork NSW, 
         Master Electricians Australia, WorkCover NSW

Confidence: 98% | Sources: 5/5
```

### 4. 💰 Business Growth Opportunities
Financial and expansion opportunities:

- **Government grants** and funding programs
- **Tenders and procurement** opportunities
- **Economic development initiatives**
- **Business-friendly policy** changes
- **Partner or supplier** activities
- **Market expansion** signals

**Example Alert:**
```
🟢 High Priority | Funding Opportunity

NSW Government "Digital Transformation Grant" now accepting applications

- Available funding: $10,000 - $50,000
- Target: SMEs in Western Sydney
- Use: Website, e-commerce, automation, digital marketing
- Applications close: March 31, 2025
- Success rate: 60% (historical)
- Your eligibility: ✅ Confirmed

Why this matters:
Matches your stated goal of launching online ordering system.
Grant would cover 75% of your planned $40,000 investment.

Recommended actions:
- Start application immediately (competitive program)
- We can connect you with grant writing consultant
- Prepare supporting documentation
- Get quotes from approved vendors

Sources: NSW Government grants portal, Service NSW, 
         Western Sydney Business Chamber, Regional NSW

Confidence: 100% | Sources: 5/5
```

### 5. 🎯 Competitive Intelligence
Market landscape awareness:

- **New competitors** opening nearby
- **Competitor closures** or difficulties
- **Major competitor changes** (expansions, pivots)
- **Market share shifts**
- **Review trends** and reputation signals
- **Pricing changes** in local market

**Example Alert:**
```
🟡 Medium Priority | Competitive Alert

New cafe opening: "Daily Grind Coffee Co" (direct competitor)

- Location: 800m from your location (Main St)
- Opening date: Estimated April 2025
- Capacity: 60 seats (larger than yours)
- Positioning: "Premium specialty coffee and all-day breakfast"
- Backing: Part of Sydney-based chain (5 locations)
- Social media: Already 2,000 followers

Why this matters:
First major competitor in your immediate area since 2022.
Targets similar demographic to your core customers.

Recommended actions:
- Review and strengthen your unique value proposition
- Consider loyalty program launch before their opening
- Enhance social media presence
- Evaluate pricing strategy
- Strengthen relationships with regular customers

Intelligence gathered:
- Planning permit application
- Business name registration
- Job advertisements (seeking experienced baristas)
- Social media pages launched
- Supplier industry connections

Confidence: 87% | Sources: 5/6
```

## Relevance Scoring System

Every event is scored 0-100 across these dimensions:

### 1. Industry Relevance (0-25 points)
- Exact industry match: 25 points
- Adjacent industry: 15 points
- Broader sector: 10 points
- Tangential: 5 points

### 2. Location Relevance (0-25 points)
Business defines their "footprint":
- Within 5km radius: 25 points
- Within 10km: 20 points
- Within 20km: 15 points
- Same region: 10 points
- Same state: 5 points

### 3. Business Objective Alignment (0-30 points)
Matches stated priorities:
- Direct opportunity: 30 points
- Indirect opportunity: 20 points
- Defensive need (risk): 25 points
- Nice to know: 10 points

### 4. Impact Potential (0-10 points)
- Game-changing: 10 points
- Significant: 7 points
- Moderate: 5 points
- Minor: 3 points

### 5. Time Sensitivity (0-10 points)
- Immediate action required: 10 points
- Action within 1 month: 7 points
- Planning horizon: 5 points
- Informational: 3 points

**Example Calculation:**
```
Event: "120 engineer redundancies at nearby manufacturer"

Industry: Exact match (manufacturing) = 25
Location: 15km away = 15
Objective: Direct hiring opportunity = 30
Impact: Significant talent access = 7
Urgency: 30-day window = 7

Total Score: 84/100 ✅ (Above 60 threshold → Send alert)
```

## Data Sources & Integration

### Government & Planning
- Council DA registers (all Australian councils)
- State planning portals
- PlanningAlerts API
- Infrastructure Australia
- GIS and zoning data
- Tender portals (AusTender, state equivalents)

### Employment & Business
- ASIC business registry updates
- Job listing platforms (Seek, LinkedIn, Indeed)
- Company announcements (ASX, media releases)
- Redundancy notices (Fair Work)
- Industry association updates

### News & Media
- Major news outlets (AFR, SMH, Age, Australian, etc.)
- Industry publications
- Regional and local newspapers
- Trade magazines
- Business journals

### Market Intelligence
- Social media signals (LinkedIn, business pages)
- Review platforms (Google, ProductReview, industry-specific)
- Business directories
- Chamber of commerce announcements
- Economic development bodies

### Regulatory
- Government gazettes (Commonwealth, State, Territory)
- Regulatory body announcements
- Legislative updates
- Policy changes
- Industry standards bodies

## Delivery Options

### Frequency Settings
Businesses choose per-category:
- **Instant** (push notification, SMS, email within 1 hour)
- **Daily Digest** (email, 7am local time)
- **Weekly Briefing** (email, Monday 7am)
- **Monthly Summary** (email, 1st of month)

### Delivery Channels
- 📧 Email (formatted HTML digest)
- 📱 SMS (critical alerts only)
- 🔔 In-app notification
- 💬 Slack/Teams integration
- 📞 WhatsApp Business

### Format
Each digest includes:
```
┌─────────────────────────────────────────┐
│ Creerlio Business Intelligence Radar    │
│ Your Daily Briefing - March 12, 2025   │
└─────────────────────────────────────────┘

🔴 1 Critical Alert
🟡 3 Medium Priority Items  
🟢 2 Growth Opportunities

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRITICAL

[Alert details with sources, confidence, actions]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 MEDIUM PRIORITY

[3 alerts summarized]

[View full details →]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 OPPORTUNITIES

[2 opportunities with action items]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Your Intelligence Settings
Monitoring: 5km radius, Manufacturing Industry
Minimum relevance: 60/100
Categories: Talent (✓), Local Development (✓), 
           Competitive (✓)

[Adjust settings →]
```

## AI Processing Pipeline

### 1. Data Ingestion
```
External Sources
  ↓
Web Scrapers / APIs / RSS Feeds
  ↓
Raw Data Lake
  ↓
Deduplication & Normalization
  ↓
Structured Events Database
```

### 2. Event Classification
```
Raw Event
  ↓
Category Detection (employment/planning/etc)
  ↓
Entity Extraction (location, company, dates)
  ↓
Geographic Tagging
  ↓
Industry Tagging
  ↓
Classified Event
```

### 3. Multi-Source Validation
```
Single Event Signal
  ↓
Search for Corroborating Sources
  ↓
Match Similar Events
  ↓
Verify Facts Across Sources
  ↓
Calculate Confidence Score
  ↓
[IF confidence > 70%] → Continue
[IF confidence ≤ 70%] → Hold for more data
```

### 4. Business Matching & Scoring
```
Validated Event
  ↓
Load Business Profiles
  ↓
For each business:
  - Calculate relevance score
  - Check minimum threshold
  - Apply category filters
  - Check frequency settings
  ↓
[IF score > threshold] → Queue for delivery
[IF score ≤ threshold] → Archive
```

### 5. Insight Generation
```
Matched Event + Business Context
  ↓
LLM (GPT-4) Processing:
  - "Why this matters" analysis
  - Recommended actions
  - Impact assessment
  - Urgency evaluation
  ↓
Human-Quality Intelligence Brief
  ↓
Delivery Queue
```

### 6. Delivery
```
Delivery Queue
  ↓
Check delivery preferences
  ↓
Format for channel (email/SMS/app)
  ↓
Send via appropriate channel
  ↓
Track delivery & engagement
  ↓
Learn from user feedback
```

## Configuration Interface

### Business Setup Wizard
```
Step 1: Define Your Footprint
┌─────────────────────────────────┐
│ Where do you operate?           │
│                                 │
│ Primary location: [Parramatta] │
│ Monitoring radius:              │
│   ○ 5km  ◉ 10km  ○ 20km  ○ 50km│
│                                 │
│ Additional regions:             │
│ + Add region                    │
└─────────────────────────────────┘

Step 2: Choose Intelligence Categories
┌─────────────────────────────────┐
│ What matters to your business?  │
│                                 │
│ ☑ Talent & Employment           │
│ ☑ Local Development             │
│ ☑ Industry News                 │
│ ☑ Growth Opportunities          │
│ ☑ Competitive Intelligence      │
│ ☐ Regulatory Changes            │
└─────────────────────────────────┘

Step 3: Set Relevance Threshold
┌─────────────────────────────────┐
│ How selective should we be?     │
│                                 │
│ ←──────────────────────────────→│
│ Show more  [====●====]  Critical│
│            (Score: 60)    only  │
│                                 │
│ You'll receive approximately    │
│ 5-8 alerts per week             │
└─────────────────────────────────┘

Step 4: Delivery Preferences
┌─────────────────────────────────┐
│ How often do you want updates?  │
│                                 │
│ Critical alerts: [Instant ▼]   │
│ Regular updates: [Daily ▼]     │
│                                 │
│ Send to:                        │
│ ☑ Email: owner@business.com.au │
│ ☑ App notifications             │
│ ☐ SMS (critical only)           │
└─────────────────────────────────┘
```

## Privacy & Data Handling

### What We Monitor
- ✅ Publicly available information only
- ✅ Government records and databases
- ✅ Published news and media
- ✅ Business registries and public filings

### What We DON'T Do
- ❌ No surveillance or private data access
- ❌ No confidential information
- ❌ No personal data harvesting
- ❌ No unlawful data access

### Business Data Protection
- Business intelligence preferences encrypted
- No sharing of business strategies with third parties
- Compliance with Australian Privacy Principles
- GDPR compliant for international clients

## Success Metrics

### Value Delivered
- Time saved on market research
- Opportunities captured (hire, tender, grant)
- Threats avoided (competitive, regulatory)
- ROI on subscription cost

### System Performance
- Alert accuracy rate (user confirmation)
- False positive rate (target: <5%)
- Source confidence scores (target: >85% avg)
- Delivery reliability (target: 99.9%)

### User Engagement
- Alert open rate
- Action taken rate
- Settings adjustment frequency
- User satisfaction (NPS score)

## Pricing Model (Suggested)

### Freemium Tier
- Basic alerts (1 category)
- Weekly digest only
- 10km radius max
- Email delivery only

### Professional Tier ($99/month)
- All intelligence categories
- Daily + instant alerts
- 50km radius
- All delivery channels
- Priority support

### Enterprise Tier ($299/month)
- Everything in Professional
- Custom integrations
- Dedicated analyst review
- API access
- White-label option
- Multi-location support

## Technical Implementation

### Backend Services (.NET)
```csharp
/api/intelligence/
  /configure     - Set business preferences
  /alerts        - Get current alerts
  /history       - View past intelligence
  /feedback      - Rate alert relevance
  
/services/
  DataIngestionService
  SourceValidationService
  RelevanceScoringService
  InsightGenerationService
  DeliveryService
```

### Database Schema
```sql
IntelligenceEvents
  - Id
  - Category (enum)
  - Title
  - Description
  - SourceUrls (jsonb)
  - ConfidenceScore
  - ValidatedAt
  - ExpiresAt
  
BusinessIntelligenceSettings
  - BusinessProfileId
  - MonitoringRadius
  - EnabledCategories (jsonb)
  - MinimumRelevanceScore
  - DeliveryPreferences (jsonb)
  
IntelligenceAlerts
  - Id
  - EventId
  - BusinessProfileId
  - RelevanceScore
  - Priority
  - GeneratedInsights (text)
  - DeliveredAt
  - OpenedAt
  - ActionTaken
  - UserFeedback
```

### Integration with Fred AI
Fred can help businesses configure their intelligence preferences:

```
User: "I want to know about new cafes opening near me and any construction projects"

Fred interprets:
- Categories: Competitive Intelligence + Local Development
- Radius: "near me" = 5km default
- Creates configuration automatically
```

## Phase 1 MVP Features

### Must-Have
1. ✅ Employment & talent signals
2. ✅ Local development alerts (DA approvals)
3. ✅ Basic relevance scoring
4. ✅ Email daily digest
5. ✅ Simple configuration interface

### Phase 2
- Industry-specific intelligence
- Growth opportunity alerts
- SMS delivery
- Slack/Teams integration
- Advanced filtering

### Phase 3
- Competitive intelligence
- Regulatory tracking
- Custom integrations
- White-label for partners
- API access

## Related Features
- See: `FRED_AI_ASSISTANT.md` for AI assistance integration
- See: `TALENT_PORTFOLIO_REQUIREMENTS.md` for talent matching
- See: `BUSINESS_PROFILE_LOCATION_FEATURE.md` for location intelligence

---

**Next Steps:**
1. Define initial data sources for MVP
2. Design alert template system
3. Build relevance scoring algorithm
4. Create business configuration UI
5. Set up delivery infrastructure
