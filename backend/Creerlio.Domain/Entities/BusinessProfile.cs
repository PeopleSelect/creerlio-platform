using System;
using System.Collections.Generic;

namespace Creerlio.Domain.Entities
{
    public class BusinessProfile
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        // Business Information
        public BusinessInformation BusinessInfo { get; set; } = new();
        
        // Multi-Location & Franchise
        public string BusinessType { get; set; } = "Single"; // Single, MultiLocation, Franchise, Government
        public Guid? ParentBusinessId { get; set; } // For franchisees
        public List<Location> Locations { get; set; } = new();
        public FranchiseSettings? FranchiseSettings { get; set; }
        
        // Verification
        public BusinessVerification Verification { get; set; } = new();
        
        // Subscription & Features
        public SubscriptionInfo Subscription { get; set; } = new();
    }

    public class BusinessInformation
    {
        public Guid Id { get; set; }
        public string LegalName { get; set; } = string.Empty;
        public string TradingName { get; set; } = string.Empty;
        public string ABN { get; set; } = string.Empty; // Australian Business Number
        public string ACN { get; set; } = string.Empty; // Australian Company Number
        public string Industry { get; set; } = string.Empty;
        public List<string> Industries { get; set; } = new();
        public string CompanySize { get; set; } = string.Empty; // 1-10, 11-50, 51-200, etc.
        public int EmployeeCount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Mission { get; set; } = string.Empty;
        public List<string> Values { get; set; } = new();
        public string LogoUrl { get; set; } = string.Empty;
        public string CoverImageUrl { get; set; } = string.Empty;
        public string WebsiteUrl { get; set; } = string.Empty;
        public string LinkedInUrl { get; set; } = string.Empty;
        public DateTime? FoundedDate { get; set; }
        
        // Contact Information
        public string PrimaryEmail { get; set; } = string.Empty;
        public string PrimaryPhone { get; set; } = string.Empty;
        public Address HeadOfficeAddress { get; set; } = new();
    }

    public class Address
    {
        public Guid Id { get; set; }
        public string Street { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }

    public class Location
    {
        public Guid Id { get; set; }
        public Guid BusinessProfileId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "Office"; // Office, Store, Warehouse, Remote, etc.
        public Address Address { get; set; } = new();
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
        public bool IsActive { get; set; } = true;
        
        // Location-specific settings
        public bool CanPostJobs { get; set; } = true;
        public List<string> LocationManagerIds { get; set; } = new();
        public Dictionary<string, object> CustomSettings { get; set; } = new();
    }

    public class FranchiseSettings
    {
        public Guid Id { get; set; }
        public bool IsParent { get; set; }
        public string FranchiseName { get; set; } = string.Empty;
        public int TotalFranchisees { get; set; }
        public List<Guid> FranchiseeIds { get; set; } = new();
        
        // Shared Resources
        public bool ShareTalentPool { get; set; } = true;
        public bool ShareJobTemplates { get; set; } = true;
        public bool CentralizedReporting { get; set; } = true;
        public bool EnforceBrandGuidelines { get; set; } = true;
        
        // Brand Guidelines
        public BrandGuidelines BrandGuidelines { get; set; } = new();
    }

    public class BrandGuidelines
    {
        public Guid Id { get; set; }
        public List<string> ApprovedColors { get; set; } = new();
        public List<string> ApprovedFonts { get; set; } = new();
        public string LogoUrl { get; set; } = string.Empty;
        public string JobDescriptionTemplate { get; set; } = string.Empty;
        public Dictionary<string, string> CommunicationTemplates { get; set; } = new();
    }

    public class BusinessVerification
    {
        public Guid Id { get; set; }
        public bool ABNVerified { get; set; }
        public bool EmailVerified { get; set; }
        public bool PhoneVerified { get; set; }
        public bool WebsiteVerified { get; set; }
        public DateTime? VerifiedDate { get; set; }
        public string VerificationStatus { get; set; } = "Pending"; // Pending, Verified, Rejected
        public List<string> VerificationDocuments { get; set; } = new();
    }

    public class SubscriptionInfo
    {
        public Guid Id { get; set; }
        public string PlanType { get; set; } = "Free"; // Free, Basic, Professional, Enterprise
        public DateTime? SubscriptionStartDate { get; set; }
        public DateTime? SubscriptionEndDate { get; set; }
        public bool IsActive { get; set; } = true;
        public int JobPostingLimit { get; set; }
        public int JobPostingUsed { get; set; }
        public bool CanAccessAdvancedSearch { get; set; }
        public bool CanAccessAnalytics { get; set; }
        public bool CanAccessBusinessIntelligence { get; set; }
        public bool CanAccessATS { get; set; }
        public int TeamMemberLimit { get; set; }
    }

    // Job Management
    public class JobPosting
    {
        public Guid Id { get; set; }
        public Guid BusinessProfileId { get; set; }
        public Guid? LocationId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? PublishedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
        
        // Job Details
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> Responsibilities { get; set; } = new();
        public List<string> Requirements { get; set; } = new();
        public List<string> PreferredQualifications { get; set; } = new();
        
        // Job Specifics
        public string EmploymentType { get; set; } = string.Empty; // Full-time, Part-time, Contract, etc.
        public string WorkModel { get; set; } = "Office"; // Office, Remote, Hybrid
        public string ExperienceLevel { get; set; } = string.Empty; // Entry, Mid, Senior, Lead, etc.
        public Address? JobLocation { get; set; }
        
        // Compensation
        public decimal? MinSalary { get; set; }
        public decimal? MaxSalary { get; set; }
        public string SalaryCurrency { get; set; } = "AUD";
        public string SalaryPeriod { get; set; } = "Year"; // Hour, Day, Week, Month, Year
        public bool ShowSalary { get; set; }
        public List<string> Benefits { get; set; } = new();
        
        // Skills & Categories
        public List<string> RequiredSkills { get; set; } = new();
        public List<string> PreferredSkills { get; set; } = new();
        public string Category { get; set; } = string.Empty;
        public string Industry { get; set; } = string.Empty;
        
        // Application Settings
        public string Status { get; set; } = "Draft"; // Draft, Published, Paused, Closed
        public int ApplicationCount { get; set; }
        public int ViewCount { get; set; }
        public bool AcceptApplications { get; set; } = true;
        public string ApplicationMethod { get; set; } = "Platform"; // Platform, Email, External
        public string ExternalApplicationUrl { get; set; } = string.Empty;
        
        // AI & Matching
        public bool AIGenerated { get; set; }
        public bool ComplianceChecked { get; set; }
        public List<string> ComplianceIssues { get; set; } = new();
        public int AIMatchThreshold { get; set; } = 70; // Minimum match score to show to talent
        
        // SEO & External
        public string SEOTitle { get; set; } = string.Empty;
        public string SEODescription { get; set; } = string.Empty;
        public bool PostToSEEK { get; set; }
        public string SEEKJobId { get; set; } = string.Empty;
    }

    // Applicant Tracking System
    public class Application
    {
        public Guid Id { get; set; }
        public Guid JobPostingId { get; set; }
        public Guid TalentProfileId { get; set; }
        public DateTime AppliedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        // Application Details
        public string Status { get; set; } = "New"; // New, Reviewing, Shortlisted, Interview, Offer, Rejected, Withdrawn
        public string Stage { get; set; } = "Application"; // Application, Phone Screen, Interview, Offer, Hired
        public int AIMatchScore { get; set; } // 0-100
        public string CoverLetter { get; set; } = string.Empty;
        public List<string> AttachmentUrls { get; set; } = new();
        
        // Shared Portfolio
        public Guid? SharedPortfolioId { get; set; }
        
        // Tracking & Notes
        public List<ApplicationNote> Notes { get; set; } = new();
        public List<ApplicationActivity> Activities { get; set; } = new();
        public List<string> Tags { get; set; } = new();
        public int Rating { get; set; } // 1-5 stars
        
        // Interview Scheduling
        public List<Interview> Interviews { get; set; } = new();
        
        // Team Collaboration
        public List<string> AssignedReviewers { get; set; } = new();
        public List<TeamMemberRating> TeamRatings { get; set; } = new();
    }

    public class ApplicationNote
    {
        public Guid Id { get; set; }
        public string AuthorId { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool IsPrivate { get; set; }
    }

    public class ApplicationActivity
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty; // StatusChange, NoteAdded, InterviewScheduled, etc.
        public string Description { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public Dictionary<string, string> Metadata { get; set; } = new();
    }

    public class Interview
    {
        public Guid Id { get; set; }
        public DateTime ScheduledTime { get; set; }
        public int DurationMinutes { get; set; }
        public string Type { get; set; } = "Video"; // Phone, Video, InPerson
        public string Location { get; set; } = string.Empty;
        public string MeetingUrl { get; set; } = string.Empty;
        public List<string> InterviewerIds { get; set; } = new();
        public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Cancelled, Rescheduled
        public string Notes { get; set; } = string.Empty;
        public int? Rating { get; set; }
    }

    public class TeamMemberRating
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public int Rating { get; set; } // 1-5
        public string Feedback { get; set; } = string.Empty;
        public DateTime RatedAt { get; set; }
    }

    // Business Intelligence
    public class BusinessIntelligenceReport
    {
        public Guid Id { get; set; }
        public Guid BusinessProfileId { get; set; }
        public DateTime GeneratedAt { get; set; }
        public string ReportType { get; set; } = string.Empty; // Daily, Weekly, Monthly, OnDemand
        public string Scope { get; set; } = "Company"; // Store, Regional, Company
        
        // Market Intelligence
        public MarketIntelligence MarketData { get; set; } = new();
        
        // Competitor Intelligence
        public List<CompetitorActivity> CompetitorActivities { get; set; } = new();
        
        // Reputation Monitoring
        public ReputationMetrics Reputation { get; set; } = new();
        
        // Opportunity Alerts
        public List<OpportunityAlert> Opportunities { get; set; } = new();
    }

    public class MarketIntelligence
    {
        public Guid Id { get; set; }
        public Dictionary<string, int> SkillDemand { get; set; } = new(); // Skill -> Job count
        public Dictionary<string, decimal> SalaryTrends { get; set; } = new(); // Role -> Average salary
        public Dictionary<string, int> TalentAvailability { get; set; } = new(); // Location -> Talent count
        public List<string> EmergingSkills { get; set; } = new();
        public List<string> InDemandRoles { get; set; } = new();
    }

    public class CompetitorActivity
    {
        public Guid Id { get; set; }
        public string CompetitorName { get; set; } = string.Empty;
        public string Activity { get; set; } = string.Empty;
        public DateTime DetectedAt { get; set; }
        public string Url { get; set; } = string.Empty;
        public string Impact { get; set; } = "Low"; // Low, Medium, High
    }

    public class ReputationMetrics
    {
        public Guid Id { get; set; }
        public double OverallScore { get; set; } // 0-10
        public int ReviewCount { get; set; }
        public double AverageRating { get; set; }
        public Dictionary<string, int> SentimentBreakdown { get; set; } = new(); // Positive, Neutral, Negative
        public List<string> RecentMentions { get; set; } = new();
        public string Trend { get; set; } = "Stable"; // Improving, Stable, Declining
    }

    public class OpportunityAlert
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty; // TalentAvailable, MarketShift, CompetitorMove, etc.
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = "Low"; // Low, Medium, High, Urgent
        public DateTime DetectedAt { get; set; }
        public string ActionUrl { get; set; } = string.Empty;
        public bool IsRead { get; set; }
    }

    // Analytics
    public class RecruitmentAnalytics
    {
        public Guid Id { get; set; }
        public Guid BusinessProfileId { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        
        // Key Metrics
        public int TotalJobsPosted { get; set; }
        public int TotalApplications { get; set; }
        public int TotalHires { get; set; }
        public double AverageTimeToHire { get; set; } // Days
        public decimal AverageCostPerHire { get; set; }
        public double ApplicationQualityScore { get; set; } // 0-100
        
        // Source Tracking
        public Dictionary<string, int> ApplicationsBySource { get; set; } = new(); // Platform, SEEK, Referral, etc.
        public Dictionary<string, int> HiresBySource { get; set; } = new();
        
        // Diversity Metrics (Aggregated)
        public Dictionary<string, double> DiversityMetrics { get; set; } = new();
        
        // Funnel Metrics
        public int ApplicationsReceived { get; set; }
        public int ApplicationsReviewed { get; set; }
        public int CandidatesShortlisted { get; set; }
        public int InterviewsConducted { get; set; }
        public int OffersExtended { get; set; }
        public int OffersAccepted { get; set; }
        
        // Benchmarking
        public Dictionary<string, double> IndustryBenchmarks { get; set; } = new();
    }
}
