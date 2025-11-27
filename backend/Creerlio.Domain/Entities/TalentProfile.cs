using System;
using System.Collections.Generic;

namespace Creerlio.Domain.Entities
{
    // Main Talent Profile - Comprehensive data repository
    public class TalentProfile
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        // Basic Info
        public string Headline { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public string ProfileImageUrl { get; set; } = string.Empty;
        public string ProfileStatus { get; set; } = "Active"; // Active, Inactive, Hidden, Deleted
        public bool IsPublic { get; set; } = true;
        public string Slug { get; set; } = string.Empty; // URL-friendly username
        
        // Navigation Properties (EF Core relationships)
        public PersonalInformation? PersonalInformation { get; set; }
        public List<WorkExperience> WorkExperiences { get; set; } = new();
        public List<Education> Educations { get; set; } = new();
        public List<Skill> Skills { get; set; } = new();
        public List<Certification> Certifications { get; set; } = new();
        public List<PortfolioItem> PortfolioItems { get; set; } = new();
        public List<Award> Awards { get; set; } = new();
        public List<Reference> References { get; set; } = new();
        public CareerPreferences? CareerPreferences { get; set; }
        public PrivacySettings? PrivacySettings { get; set; }
        public VerificationStatus? VerificationStatus { get; set; }
    }

    // Separate Entity Classes for EF Core
    public class PersonalInformation
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public string LinkedInUrl { get; set; } = string.Empty;
        public string GitHubUrl { get; set; } = string.Empty;
        public string WebsiteUrl { get; set; } = string.Empty;
        public DateTime? DateOfBirth { get; set; }
    }

    public class WorkExperience
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Company { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsCurrentRole { get; set; }
        public string Location { get; set; } = string.Empty;
        public string EmploymentType { get; set; } = string.Empty; // Full-time, Part-time, Contract, etc.
        public List<string> Achievements { get; set; } = new(); // JSON in DB
        public List<string> Technologies { get; set; } = new(); // JSON in DB
    }

    public class Education
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Institution { get; set; } = string.Empty;
        public string Degree { get; set; } = string.Empty;
        public string Field { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public double? GPA { get; set; }
        public string Description { get; set; } = string.Empty;
        public List<string> Honors { get; set; } = new(); // JSON in DB
    }

    public class Skill
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // Technical, Soft, Language, etc.
        public int ProficiencyLevel { get; set; } // 1-5
        public double YearsOfExperience { get; set; }
        public int EndorsementCount { get; set; }
        public DateTime? LastUsed { get; set; }
    }

    public class Certification
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string IssuingOrganization { get; set; } = string.Empty;
        public DateTime IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string CredentialId { get; set; } = string.Empty;
        public string CredentialUrl { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
    }

    public class PortfolioItem
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // Project, Publication, Presentation, etc.
        public string Url { get; set; } = string.Empty;
        public List<string> Images { get; set; } = new(); // JSON in DB
        public List<string> Technologies { get; set; } = new(); // JSON in DB
        public DateTime? CompletionDate { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class Award
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public DateTime DateReceived { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class Reference
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Relationship { get; set; } = string.Empty;
        public string Testimonial { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
        public DateTime? VerifiedAt { get; set; }
    }

    public class CareerPreferences
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public List<string> PreferredRoles { get; set; } = new(); // JSON in DB
        public List<string> PreferredIndustries { get; set; } = new(); // JSON in DB
        public List<string> PreferredLocations { get; set; } = new(); // JSON in DB
        public string WorkModel { get; set; } = string.Empty; // Remote, Hybrid, Office
        public List<string> PreferredEmploymentTypes { get; set; } = new(); // JSON in DB
        public decimal? ExpectedSalary { get; set; }
        public string Currency { get; set; } = "AUD";
        public bool OpenToRelocation { get; set; }
        public bool OpenToRemote { get; set; } = true;
        public DateTime? AvailableFrom { get; set; }
        public string NoticePeriod { get; set; } = string.Empty;
    }

    public class PrivacySettings
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public bool ShowEmail { get; set; }
        public bool ShowPhone { get; set; }
        public bool ShowLocation { get; set; } = true;
        public bool ShowSalaryExpectations { get; set; }
        public bool AllowContactFromRecruiters { get; set; } = true;
        public bool ShowProfileInSearch { get; set; } = true;
        public List<string> BlockedBusinessIds { get; set; } = new(); // JSON in DB
    }

    public class VerificationStatus
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public bool EmailVerified { get; set; }
        public bool PhoneVerified { get; set; }
        public bool IdentityVerified { get; set; }
        public bool BackgroundCheckCompleted { get; set; }
        public DateTime? LastVerificationDate { get; set; }
        public int VerificationScore { get; set; } // 0-100
    }
}
