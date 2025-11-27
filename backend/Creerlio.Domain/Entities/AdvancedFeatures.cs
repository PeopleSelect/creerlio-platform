using System;
using System.Collections.Generic;

namespace Creerlio.Domain.Entities
{
    // Career Pathway Planning
    public class CareerPathway
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        // Pathway Definition
        public string CurrentRole { get; set; } = string.Empty;
        public string TargetRole { get; set; } = string.Empty;
        public string Industry { get; set; } = string.Empty;
        public int EstimatedTimelineMonths { get; set; }
        public decimal EstimatedCost { get; set; }
        public string Currency { get; set; } = "AUD";
        
        // Progress Tracking
        public int CompletionPercentage { get; set; } // 0-100
        public DateTime? TargetCompletionDate { get; set; }
        public string Status { get; set; } = "Active"; // Active, Completed, Paused, Archived
        
        // Pathway Steps
        public List<PathwayStep> Steps { get; set; } = new();
        
        // Skill Gap Analysis
        public SkillGapAnalysis SkillGaps { get; set; } = new();
        
        // AI Recommendations
        public bool IsAIGenerated { get; set; }
        public DateTime? LastAIUpdateDate { get; set; }
        public List<PathwayRecommendation> Recommendations { get; set; } = new();
    }

    public class PathwayStep
    {
        public Guid Id { get; set; }
        public Guid PathwayId { get; set; }
        public int StepNumber { get; set; }
        public string Type { get; set; } = string.Empty; // Skill, Course, Certification, Experience, IntermediateRole
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DurationMonths { get; set; }
        public decimal EstimatedCost { get; set; }
        public string Status { get; set; } = "NotStarted"; // NotStarted, InProgress, Completed, Skipped
        public DateTime? StartedDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public int CompletionPercentage { get; set; }
        
        // Requirements
        public List<string> Prerequisites { get; set; } = new();
        public List<string> SkillsToAcquire { get; set; } = new();
        
        // Resources
        public List<PathwayResource> Resources { get; set; } = new();
        
        // Milestones
        public List<Milestone> Milestones { get; set; } = new();
    }

    public class PathwayResource
    {
        public Guid Id { get; set; }
        public Guid StepId { get; set; }
        public string Type { get; set; } = string.Empty; // Course, Book, Video, Article, Mentor, etc.
        public string Title { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public decimal? Cost { get; set; }
        public int? DurationHours { get; set; }
        public double? Rating { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? CompletedDate { get; set; }
    }

    public class Milestone
    {
        public Guid Id { get; set; }
        public Guid PathwayId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime TargetDate { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? CompletedDate { get; set; }
    }

    public class SkillGapAnalysis
    {
        public Guid Id { get; set; }
        public Guid PathwayId { get; set; }
        public DateTime AnalysisDate { get; set; }
        public List<SkillGap> Gaps { get; set; } = new();
        public List<string> MissingSkills { get; set; } = new();
        public List<string> SkillsToImprove { get; set; } = new();
        public int OverallReadinessScore { get; set; } // 0-100
    }

    public class SkillGap
    {
        public Guid Id { get; set; }
        public Guid PathwayId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public int CurrentLevel { get; set; } // 1-5
        public int RequiredLevel { get; set; } // 1-5
        public int GapSize { get; set; } // Difference
        public string Priority { get; set; } = "Medium"; // Low, Medium, High, Critical
        public int EstimatedTimeToAcquireMonths { get; set; }
        public List<string> RecommendedCourses { get; set; } = new();
    }

    public class PathwayRecommendation
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public int ConfidenceScore { get; set; } // 0-100
        public bool IsApplied { get; set; }
        public DateTime GeneratedAt { get; set; }
    }

    // AI Matching System
    public class JobMatch
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public Guid JobPostingId { get; set; }
        public DateTime CalculatedAt { get; set; }
        
        // Overall Match
        public int MatchScore { get; set; } // 0-100
        public string MatchQuality { get; set; } = "Good"; // Poor, Fair, Good, Excellent, Perfect
        
        // Component Scores
        public MatchBreakdown? Breakdown { get; set; }
        
        // AI Explanation
        public string MatchExplanation { get; set; } = string.Empty;
        public List<string> MatchReasons { get; set; } = new();
        public List<string> Concerns { get; set; } = new();
        
        // Status
        public bool IsViewed { get; set; }
        public bool IsApplied { get; set; }
        public bool IsSaved { get; set; }
        public bool IsHidden { get; set; }
    }

    public class MatchBreakdown
    {
        public Guid Id { get; set; }
        public Guid MatchId { get; set; }
        public int SkillsMatchScore { get; set; } // 0-100
        public int ExperienceMatchScore { get; set; } // 0-100
        public int EducationMatchScore { get; set; } // 0-100
        public int LocationMatchScore { get; set; } // 0-100
        public int SalaryMatchScore { get; set; } // 0-100
        public int CultureFitScore { get; set; } // 0-100
        public int CareerGrowthScore { get; set; } // 0-100
        
        // Detailed Breakdowns
        public List<SkillMatch> SkillMatches { get; set; } = new();
        public List<string> MissingSkills { get; set; } = new();
        public List<string> BonusSkills { get; set; } = new();
    }

    public class SkillMatch
    {
        public Guid Id { get; set; }
        public Guid MatchId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public bool IsRequired { get; set; }
        public bool HasSkill { get; set; }
        public int TalentProficiency { get; set; } // 1-5
        public int RequiredProficiency { get; set; } // 1-5
        public int YearsExperience { get; set; }
    }

    // Electronic Footprint Monitoring
    public class ElectronicFootprint
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public DateTime LastScannedAt { get; set; }
        public DateTime NextScanAt { get; set; }
        
        // Overall Scores
        public int CredibilityScore { get; set; } // 0-100
        public int VisibilityScore { get; set; } // 0-100
        public int ReputationScore { get; set; } // 0-100
        
        // Discovered Items
        public List<NewsMention> NewsMentions { get; set; } = new();
        public List<SocialMediaPost> SocialMediaPosts { get; set; } = new();
        public List<GitHubActivity> GitHubActivities { get; set; } = new();
        public List<Publication> Publications { get; set; } = new();
        public List<SpeakingEngagement> SpeakingEngagements { get; set; } = new();
        public List<AwardRecognition> Awards { get; set; } = new();
        
        // Alerts
        public List<FootprintAlert> Alerts { get; set; } = new();
    }

    public class NewsMention
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public DateTime PublishedDate { get; set; }
        public string Sentiment { get; set; } = "Neutral"; // Positive, Neutral, Negative
        public string Excerpt { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
        public bool AddedToProfile { get; set; }
    }

    public class SocialMediaPost
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Platform { get; set; } = string.Empty; // LinkedIn, Twitter, etc.
        public string PostUrl { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime PostedDate { get; set; }
        public int EngagementScore { get; set; }
        public string Sentiment { get; set; } = "Neutral";
        public bool IsRelevant { get; set; }
    }

    public class GitHubActivity
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string RepositoryName { get; set; } = string.Empty;
        public string RepositoryUrl { get; set; } = string.Empty;
        public string ActivityType { get; set; } = string.Empty; // Commit, PR, Issue, Release
        public DateTime ActivityDate { get; set; }
        public int Stars { get; set; }
        public int Forks { get; set; }
        public List<string> Languages { get; set; } = new();
        public List<string> Topics { get; set; } = new();
        public bool IsFeatured { get; set; }
    }

    public class Publication
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Publisher { get; set; } = string.Empty;
        public DateTime PublishedDate { get; set; }
        public string Url { get; set; } = string.Empty;
        public List<string> CoAuthors { get; set; } = new();
        public int Citations { get; set; }
        public bool AddedToProfile { get; set; }
    }

    public class SpeakingEngagement
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string EventName { get; set; } = string.Empty;
        public string Topic { get; set; } = string.Empty;
        public DateTime EventDate { get; set; }
        public string EventUrl { get; set; } = string.Empty;
        public string VideoUrl { get; set; } = string.Empty;
        public int Attendees { get; set; }
        public bool AddedToProfile { get; set; }
    }

    public class AwardRecognition
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Url { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
        public bool AddedToProfile { get; set; }
    }

    public class FootprintAlert
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Type { get; set; } = string.Empty; // NewMention, ReputationChange, OpportunityDiscovered
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Severity { get; set; } = "Info"; // Info, Warning, Critical
        public DateTime CreatedAt { get; set; }
        public bool IsRead { get; set; }
        public string ActionUrl { get; set; } = string.Empty;
    }

    // Credential Verification
    public class CredentialVerification
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string ItemType { get; set; } = string.Empty; // Education, Employment, Certification
        public Guid ItemId { get; set; }
        public DateTime InitiatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        
        // Verification Status
        public string Status { get; set; } = "Pending"; // Pending, InProgress, Verified, Failed, ManualReview
        public int ConfidenceScore { get; set; } // 0-100
        public string VerificationMethod { get; set; } = string.Empty;
        
        // Data Sources
        public List<VerificationSource> Sources { get; set; } = new();
        
        // Results
        public bool IsVerified { get; set; }
        public List<string> VerificationFlags { get; set; } = new();
        public string Notes { get; set; } = string.Empty;
        
        // Timeline Consistency
        public bool TimelineConsistent { get; set; }
        public List<string> TimelineIssues { get; set; } = new();
    }

    public class VerificationSource
    {
        public Guid Id { get; set; }
        public Guid VerificationId { get; set; }
        public string Source { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // Database, API, Social, Manual
        public bool IsVerified { get; set; }
        public int ConfidenceScore { get; set; }
        public DateTime CheckedAt { get; set; }
        public Dictionary<string, string> VerifiedData { get; set; } = new();
    }

    // Saved Searches & Alerts
    public class SavedSearch
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; } = true;
        
        // Search Criteria
        public SearchCriteria? Criteria { get; set; }
        
        // Alert Settings
        public bool AlertsEnabled { get; set; }
        public string AlertFrequency { get; set; } = "Daily"; // Instant, Daily, Weekly
        public int NewResultsCount { get; set; }
        public DateTime? LastAlertSent { get; set; }
    }

    public class SearchCriteria
    {
        public Guid Id { get; set; }
        public Guid SavedSearchId { get; set; }
        public Guid TalentPoolId { get; set; }
        public string Keywords { get; set; } = string.Empty;
        public List<string> Locations { get; set; } = new();
        public decimal? MinSalary { get; set; }
        public decimal? MaxSalary { get; set; }
        public List<string> EmploymentTypes { get; set; } = new();
        public List<string> Industries { get; set; } = new();
        public List<string> CompanySizes { get; set; } = new();
        public bool RemoteOnly { get; set; }
        public int? MinMatchScore { get; set; }
        public List<string> RequiredSkills { get; set; } = new();
        public List<string> Benefits { get; set; } = new();
        public DateTime? PostedAfter { get; set; }
    }

    // Talent Pool (for businesses)
    public class TalentPool
    {
        public Guid Id { get; set; }
        public Guid BusinessProfileId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        
        // Pool Members
        public List<Guid> TalentProfileIds { get; set; } = new();
        
        // Search Criteria (auto-populate)
        public SearchCriteria? AutoPopulateCriteria { get; set; }
        public bool AutoPopulateEnabled { get; set; }
        
        // Sharing (for franchises)
        public bool IsShared { get; set; }
        public List<Guid> SharedWithBusinessIds { get; set; } = new();
    }
}
