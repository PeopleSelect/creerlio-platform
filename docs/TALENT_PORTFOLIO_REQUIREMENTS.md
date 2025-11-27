# Talent Portfolio System - Comprehensive Requirements

**Date**: November 23, 2025  
**Status**: Planning Phase

## Overview
Complete talent portfolio system with AI-powered pre-population, selective sharing, and business connection workflow.

---

## 1. Profile Building Features

### 1.1 Auto-complete Fields
**Purpose**: Enhance UX with intelligent type-ahead suggestions

**Required Auto-complete Fields**:
- ✅ Job Titles (e.g., "Senior Software Engineer", "Product Manager")
- ✅ Companies (existing companies in database + external API)
- ✅ Cities/Towns (Australian locations database)
- ✅ States/Territories (NSW, VIC, QLD, etc.)
- ✅ Industries (Technology, Healthcare, Finance, etc.)
- ✅ Skills (React, Python, Project Management, etc.)
- ✅ Certifications (AWS Certified, PMP, etc.)
- ✅ Educational Institutions (Universities, colleges)
- ✅ Degrees (Bachelor of Science, Master of Engineering, etc.)

**Technical Implementation**:
- Frontend: React autocomplete component with debouncing
- Backend: API endpoints returning filtered suggestions
- Database: Pre-populated reference tables for common values
- External APIs: LinkedIn, SEEK, ABS data for locations

### 1.2 Enhanced Job Experience Section
**Purpose**: Match SEEK-level detail for work history

**Required Fields**:
- Job Title * (autocomplete)
- Company Name * (autocomplete)
- Employment Type (Full-time, Part-time, Contract, Casual, Internship)
- Start Date * (month/year picker)
- End Date (month/year picker or "Current Position" checkbox)
- Location (City, State - autocomplete)
- Industry (autocomplete)
- Department/Division
- Reporting To (job title)
- Team Size (number or range)
- Salary Range (optional, for analytics)

**Description Fields**:
- Role Overview * (min 100 chars)
- Key Responsibilities (bullet points, min 3)
- Major Achievements (bullet points)
- Technologies/Tools Used (multi-select tags)
- Projects Delivered (list with links)

**Metrics/Impact**:
- Quantifiable achievements (revenue increase, cost savings, etc.)
- Team leadership (number of direct reports)
- Budget responsibility

### 1.3 Enhanced Certifications Section
**Purpose**: Comprehensive certification tracking with verification

**Required Fields**:
- Certification Name * (autocomplete from certification database)
- Issuing Organization * (autocomplete)
- Certification ID/Number
- Issue Date * (month/year)
- Expiry Date (month/year or "No Expiration")
- Verification URL (link to credential)
- Credential File Upload (PDF certificate)
- Status (Active, Expired, Pending Renewal)
- CPD Points (for ongoing learning)

**Display Features**:
- Badge icons for verified certifications
- Expiry warnings (30/60/90 days)
- Renewal reminders
- Verification status indicator

### 1.4 Persistent File Uploads
**Purpose**: Maintain uploaded images across navigation

**Technical Requirements**:
- Store base64 images in localStorage/sessionStorage temporarily
- Upload to cloud storage on save (Azure Blob Storage / AWS S3)
- Retrieve from cloud storage on page load
- Show loading states during upload/download
- Handle upload failures gracefully

**Affected Components**:
- Profile Photo (talent/business)
- Portfolio Project Images
- Company Logo
- Company Cover Image
- Certification Documents
- Resume Files

---

## 2. AI-Powered Pre-population

### 2.1 LinkedIn Import
**Workflow**:
1. Talent clicks "Import from LinkedIn"
2. OAuth authentication with LinkedIn
3. Fetch profile data via LinkedIn API
4. Parse and map to Creerlio fields
5. Display preview of imported data
6. Talent reviews and confirms import

**Imported Data**:
- Personal info (name, location, photo)
- Work experience (job title, company, dates, description)
- Education (degree, institution, dates)
- Skills (with endorsement counts)
- Certifications
- Summary/About section

### 2.2 Resume Parsing
**Workflow**:
1. Talent uploads PDF/DOCX resume
2. AI parsing service extracts structured data
3. Map parsed data to profile fields
4. Display preview with highlighted matches
5. Talent reviews and edits before saving

**AI Service Options**:
- Azure Form Recognizer
- AWS Textract
- Affinda Resume Parser API
- Custom GPT-4 parsing

**Extracted Data**:
- Personal details
- Work experience with dates
- Education history
- Skills and technologies
- Certifications
- Contact information

### 2.3 Social Media Integration
**Supported Platforms**:
- LinkedIn (primary)
- GitHub (for developers - repos, contributions)
- Behance/Dribbble (for designers - portfolio)
- Medium/Dev.to (for writers - articles)

---

## 3. Talent Search for Businesses

### 3.1 Search Filters
**Location**:
- City (autocomplete)
- State/Territory (dropdown)
- Remote availability (checkbox)
- Willing to relocate (checkbox)
- Distance radius (5km, 10km, 25km, 50km, 100km)

**Industry & Role**:
- Industry (multi-select autocomplete)
- Desired job titles (multi-select autocomplete)
- Seniority level (Junior, Mid, Senior, Lead, Executive)
- Employment type preference (Full-time, Part-time, Contract)

**Skills & Experience**:
- Required skills (AND logic - must have all)
- Desired skills (OR logic - nice to have)
- Years of experience (min/max slider)
- Education level (High School, Bachelor, Master, PhD)
- Certifications (multi-select)

**Availability**:
- Available immediately
- Available within 2 weeks
- Available within 1 month
- Available within 3 months

**Salary Expectations**:
- Minimum salary range
- Maximum salary range
- Currency (AUD default)

### 3.2 Search Results Display
**Talent Card Shows**:
- Profile photo
- Name (privacy settings apply)
- Current/most recent job title
- Location
- Years of experience
- Top 5 skills
- Availability status
- Match score percentage
- "View Portfolio" button
- "Send Connection Request" button

### 3.3 Advanced Filters
- Verification status (verified profiles only)
- Profile completeness (min 50%, 75%, 100%)
- Last active (within 7 days, 30 days, etc.)
- Open to opportunities (active job seekers)

---

## 4. Selective Portfolio Sharing System

### 4.1 Master Portfolio Sections
**Shareable Components** (each with individual share toggle):
1. Personal Information (name, contact, location)
2. Professional Summary
3. Profile Photo
4. Work Experience (individual jobs can be selected)
5. Education (individual degrees can be selected)
6. Skills (can select categories or individual skills)
7. Certifications (individual certs)
8. Portfolio Projects (individual projects with images)
9. Awards & Recognition
10. References (individual references)
11. Career Preferences
12. Documents (resume, cover letter, etc.)

### 4.2 Sharing Interface
**Share Controls** (on each portfolio section):
- ☑️ Include checkbox on each section/item
- "Share All" button (top of page - toggles all on)
- "Clear All" button (toggles all off)
- Selection counter: "12 of 25 items selected"

**Share Preview**:
- "Preview Portfolio" button (prominent)
- Opens modal/new tab showing exactly what will be shared
- Formatted like public portfolio page
- Read-only view matching business perspective
- "Looks good - Send to Business" button
- "Go back and edit" button

### 4.3 Sending Portfolio to Business
**Workflow**:
1. Talent searches for business or finds on platform
2. Clicks "Send Portfolio" or "Connect with Business"
3. Selection interface opens (checkboxes on portfolio items)
4. Talent selects what to share
5. Clicks "Preview Portfolio"
6. Reviews preview
7. Optional: Add personal message (500 chars max)
8. Clicks "Send Connection Request"
9. Confirmation: "Portfolio sent to [Business Name]"

**Tracking**:
- Sent date/time
- Items shared (logged)
- Business viewed (yes/no + date)
- Business response (accepted/rejected/pending)
- Follow-up reminders

---

## 5. Business Connection Request System

### 5.1 Connection Request Types
**Two Distinct Workflows**:

1. **Job Application** (existing):
   - Talent applies to specific job posting
   - Structured application form
   - Goes to "Applications" tab in business dashboard
   - Tied to job posting

2. **Connection Request** (NEW):
   - Talent expresses interest in business (no specific job)
   - Portfolio-based introduction
   - Goes to "Connection Requests" tab in business dashboard
   - Not tied to any job posting
   - Exploratory/networking focused

### 5.2 Business Dashboard - Connection Requests Tab
**NEW Tab**: "Connection Requests" (separate from Applications)

**List View Shows**:
- Talent name
- Profile photo
- Current/recent job title
- Location
- Match score (based on business preferences)
- Date received
- Status badge (New, Viewed, Accepted, Rejected)
- Quick actions: View Portfolio, Accept, Reject

**Filter Options**:
- Status (New, Viewed, Accepted, Rejected)
- Date range
- Location
- Skills matching
- Sort by: Date, Match score, Name

### 5.3 Connection Request Detail View
**Displays**:
- Shared portfolio items (only what talent selected)
- Personal message from talent
- Talent contact info (if shared)
- Skills matching business needs (highlighted)
- Availability status
- Salary expectations (if shared)

**Business Actions**:
- ✅ **Accept Connection**: 
  - Unlocks messaging with talent
  - Adds to "Connected Talents" list
  - Talent notified of acceptance
  - Can invite to apply for jobs
  
- ❌ **Reject Connection**:
  - Option to add private note (internal use)
  - Talent notified (generic message)
  - Moved to "Rejected" tab
  
- 💬 **Send Message** (if accepted):
  - Opens messaging interface
  - Initial conversation starter
  
- 📋 **Invite to Apply**:
  - Select job posting from business
  - Send invitation to talent
  - Pre-fills application with shared data

---

## 6. Technical Architecture

### 6.1 Database Schema Extensions

**New Tables Required**:

```sql
-- Portfolio Sharing
CREATE TABLE PortfolioShares (
    Id INT PRIMARY KEY,
    TalentUserId INT,
    BusinessUserId INT,
    ShareToken NVARCHAR(100),
    SharedItems JSON, -- Array of shared section IDs
    PersonalMessage NVARCHAR(500),
    CreatedDate DATETIME,
    ViewedDate DATETIME,
    Status NVARCHAR(20) -- Pending, Viewed, Accepted, Rejected
);

-- Connection Requests
CREATE TABLE ConnectionRequests (
    Id INT PRIMARY KEY,
    TalentUserId INT,
    BusinessUserId INT,
    PortfolioShareId INT,
    Status NVARCHAR(20),
    BusinessResponse NVARCHAR(MAX),
    CreatedDate DATETIME,
    ResponseDate DATETIME
);

-- Autocomplete Data
CREATE TABLE JobTitles (Id INT PRIMARY KEY, Title NVARCHAR(200), Category NVARCHAR(100));
CREATE TABLE Companies (Id INT PRIMARY KEY, Name NVARCHAR(200), Industry NVARCHAR(100));
CREATE TABLE AustralianCities (Id INT PRIMARY KEY, City NVARCHAR(100), State NVARCHAR(50), Postcode NVARCHAR(10));
CREATE TABLE Skills (Id INT PRIMARY KEY, Name NVARCHAR(100), Category NVARCHAR(100));
CREATE TABLE Certifications (Id INT PRIMARY KEY, Name NVARCHAR(200), Issuer NVARCHAR(200));

-- File Storage
CREATE TABLE UploadedFiles (
    Id INT PRIMARY KEY,
    UserId INT,
    FileType NVARCHAR(50), -- ProfilePhoto, Resume, Certificate, Portfolio
    FileName NVARCHAR(500),
    BlobStorageUrl NVARCHAR(MAX),
    UploadedDate DATETIME,
    FileSize BIGINT
);
```

### 6.2 API Endpoints Required

**Autocomplete**:
- `GET /api/autocomplete/job-titles?query={text}`
- `GET /api/autocomplete/companies?query={text}`
- `GET /api/autocomplete/cities?query={text}&state={state}`
- `GET /api/autocomplete/skills?query={text}`
- `GET /api/autocomplete/certifications?query={text}`

**Portfolio Management**:
- `POST /api/talent/portfolio/share` - Create share preview
- `POST /api/talent/portfolio/send` - Send to business
- `GET /api/talent/portfolio/shares` - Get sent portfolios
- `PUT /api/talent/portfolio/share/{id}` - Update shared items

**Connection Requests**:
- `GET /api/business/connection-requests` - List all requests
- `GET /api/business/connection-requests/{id}` - Get detail
- `PUT /api/business/connection-requests/{id}/accept` - Accept request
- `PUT /api/business/connection-requests/{id}/reject` - Reject request

**AI Integration**:
- `POST /api/talent/import/linkedin` - LinkedIn OAuth callback
- `POST /api/talent/import/resume` - Upload and parse resume
- `GET /api/talent/import/resume/{jobId}` - Get parsing status

**File Upload**:
- `POST /api/files/upload` - Upload to blob storage
- `GET /api/files/{id}` - Get file URL
- `DELETE /api/files/{id}` - Delete file

---

## 7. Implementation Phases

### Phase 1: Form Enhancements (Week 1-2)
- ✅ Autocomplete components for all fields
- ✅ Enhanced job experience form
- ✅ Enhanced certifications form
- ✅ Persistent file upload system
- ✅ Form validation improvements

### Phase 2: Portfolio Sharing (Week 3-4)
- ✅ Selective sharing interface
- ✅ Share preview functionality
- ✅ Send to business workflow
- ✅ Connection request system
- ✅ Business connection request dashboard

### Phase 3: Search & Discovery (Week 5-6)
- ✅ Talent search for businesses
- ✅ Advanced filtering
- ✅ Match scoring algorithm
- ✅ Search results UI

### Phase 4: AI Pre-population (Week 7-8)
- ✅ LinkedIn OAuth integration
- ✅ Resume parsing service
- ✅ Data mapping and preview
- ✅ Import review interface

### Phase 5: Testing & Polish (Week 9-10)
- ✅ End-to-end workflow testing
- ✅ Performance optimization
- ✅ UX refinements
- ✅ Documentation

---

## 8. Success Metrics

**Talent Metrics**:
- Profile completion rate (target: 80%+)
- Time to complete profile (target: <30 mins with AI import)
- Connection requests sent per talent (target: 5+ per month)
- Connection acceptance rate (target: 30%+)

**Business Metrics**:
- Connection requests received (indicates talent interest)
- Response time to connection requests (target: <48 hours)
- Conversion from connection to interview (target: 15%+)
- Quality of matched talents

**Platform Metrics**:
- AI import usage rate (target: 60%+ of new profiles)
- Autocomplete engagement (click-through on suggestions)
- Portfolio sharing rate (vs. job applications)
- Time saved vs. manual entry

---

## 9. Privacy & Security

**Talent Privacy Controls**:
- Granular sharing permissions per section
- Anonymous browsing mode for businesses
- Control who can see profile (all businesses, selected only, none)
- Share history tracking
- Revoke shared portfolio access

**Business Privacy**:
- Connection request spam prevention
- Rate limiting on talent connections
- Verified business accounts only

**Data Security**:
- Encrypted file storage
- Secure share tokens (time-limited, one-time use)
- Audit logs for all sharing activities
- GDPR compliance for data export/deletion

---

## Next Steps

1. **Immediate**: Implement autocomplete components (Day 1-2)
2. **High Priority**: Persistent file uploads (Day 3)
3. **High Priority**: Enhanced job experience forms (Day 4-5)
4. **Medium Priority**: Portfolio sharing interface (Week 2)
5. **Future**: AI integrations (Phase 4)

---

**Document Owner**: Development Team  
**Last Updated**: November 23, 2025  
**Next Review**: December 1, 2025
