# PeopleSelect - Simplified Talent Acquisition Platform

## Overview
PeopleSelect is a streamlined, business-focused talent acquisition platform linked to the Creerlio ecosystem. It provides businesses with quick, efficient tools to find and hire talent without the complexity of the full Creerlio platform.

## Brand Identity
- **Target Audience**: Small to medium businesses seeking quick hires
- **Value Proposition**: "Find the right person, fast"
- **Positioning**: Simplified alternative to Creerlio for specific hiring needs
- **Domain**: peopleselect.com.au (or similar)

## Key Differentiators from Creerlio

### Creerlio (Full Platform)
- Comprehensive talent profiles
- Location intelligence & mapping
- Portfolio showcasing
- Long-term career planning
- Proactive talent recruiting
- Rich business profiles

### PeopleSelect (Simplified)
- Quick search & match
- Essential profiles only
- Fast application process
- Immediate hire focus
- Business-centric interface
- Pay-per-hire model

## Core Features

### 1. Smart Search
- Simple keyword search
- Location-based filtering
- Industry categories
- Availability status
- Salary range matching

### 2. Quick Profiles
- Name, photo, headline
- Key skills (max 10)
- Experience summary (brief)
- Availability
- Contact preference

### 3. Fast Hire Flow
1. Search talents
2. View shortlist
3. Send interview request
4. Schedule meeting
5. Make offer

### 4. Business Tools
- Job posting (simplified)
- Applicant tracking
- Interview scheduling
- Offer management
- Hiring analytics

### 5. Pricing Model
- Free to browse
- Pay per successful connection
- Monthly subscription for unlimited
- No hidden fees

## Technical Architecture

### Frontend
- **Framework**: Next.js 14+ (separate app)
- **Styling**: Tailwind CSS (simpler color scheme)
- **Components**: Minimal, focused on conversion
- **Mobile**: Fully responsive, mobile-first

### Backend
- **Shared**: Uses Creerlio API backend
- **Endpoints**: Subset of Creerlio APIs
- **Data**: Synchronized with Creerlio database
- **Auth**: Shared authentication system

### Integration with Creerlio
- Cross-platform talent profiles
- Shared talent database
- Unified messaging system
- Common payment gateway
- Analytics linkage

## Page Structure

```
/
├── index.html              # Landing page
├── search.html             # Talent search
├── talent/
│   └── [id].html          # Talent profile
├── business/
│   ├── dashboard.html     # Business dashboard
│   ├── post-job.html      # Post a job
│   └── applicants.html    # Manage applicants
├── pricing.html           # Pricing plans
├── about.html             # About PeopleSelect
└── contact.html           # Contact us
```

## Design System

### Colors
- Primary: #FF6B35 (Orange - action, urgency)
- Secondary: #004E89 (Blue - trust, professional)
- Success: #10B981 (Green)
- Background: #F9FAFB (Light gray)
- Text: #111827 (Dark gray)

### Typography
- Headings: Inter Bold
- Body: Inter Regular
- Monospace: Roboto Mono

### Components
- Buttons: Rounded, solid colors, clear CTAs
- Cards: Simple borders, minimal shadows
- Forms: Large inputs, clear labels
- Navigation: Sticky header, minimal links

## Conversion Funnel

### For Businesses
1. **Landing** → See value proposition
2. **Search** → Find relevant talents
3. **Profile** → Review talent details
4. **Connect** → Send interview request
5. **Hire** → Complete transaction

### For Talents
1. **Register** → Create simple profile
2. **Visibility** → Profile appears in searches
3. **Applications** → Receive interview requests
4. **Interview** → Connect with businesses
5. **Employment** → Get hired

## Marketing Strategy

### Target Markets
- Hospitality & Tourism
- Retail
- Trades & Services
- Small tech startups
- Healthcare (non-medical)

### Channels
- Google Ads (local search)
- Facebook/Instagram (SMB owners)
- LinkedIn (B2B)
- Local business directories
- Trade association partnerships

### Messaging
- "Hire in hours, not weeks"
- "No job ads, just results"
- "Pay only when you hire"
- "Australia's fastest hiring platform"

## Revenue Model

### Plans
1. **Pay-Per-Hire**: $199 per successful hire
2. **Monthly Unlimited**: $499/month (unlimited hires)
3. **Enterprise**: Custom pricing for 50+ employees

### Features by Plan
| Feature | Pay-Per-Hire | Monthly | Enterprise |
|---------|--------------|---------|------------|
| Search talents | ✅ | ✅ | ✅ |
| Interview requests | 5/month | Unlimited | Unlimited |
| Job postings | 1 active | 5 active | Unlimited |
| Analytics | Basic | Advanced | Custom |
| Support | Email | Priority | Dedicated |

## Development Roadmap

### Phase 1: MVP (4 weeks)
- [ ] Landing page
- [ ] Search functionality
- [ ] Basic talent profiles
- [ ] Interview request system
- [ ] Business dashboard

### Phase 2: Enhanced Features (4 weeks)
- [ ] Job posting system
- [ ] Applicant tracking
- [ ] Payment integration
- [ ] Email notifications
- [ ] Mobile optimization

### Phase 3: Growth (Ongoing)
- [ ] Analytics dashboard
- [ ] Advanced search filters
- [ ] Video introduction feature
- [ ] Bulk hiring tools
- [ ] API for enterprise clients

## Technical Specifications

### Performance Targets
- Page load: < 2 seconds
- Search results: < 500ms
- API response: < 200ms
- Mobile score: 95+
- SEO score: 90+

### Security
- HTTPS only
- OWASP Top 10 compliance
- Data encryption at rest
- Regular security audits
- GDPR/Privacy Act compliant

### Hosting
- **Frontend**: Vercel or Netlify
- **Backend**: Shared with Creerlio (Azure/AWS)
- **CDN**: CloudFlare
- **Database**: Shared PostgreSQL

## Success Metrics

### Key KPIs
- Conversion rate: 15%+ (visitor → search)
- Time to hire: < 48 hours average
- Business satisfaction: 4.5/5 stars
- Talent satisfaction: 4.3/5 stars
- Monthly recurring revenue growth: 20%+

---

**Status**: Specification Complete  
**Next Steps**: 
1. Review and approve specification
2. Set up separate Next.js project
3. Design mockups
4. Begin Phase 1 development
