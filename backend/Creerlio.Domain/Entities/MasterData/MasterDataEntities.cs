using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Creerlio.Domain.Entities.MasterData
{
    /// <summary>
    /// Country master data - employment and migration markets
    /// </summary>
    public class Country
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(3)]
        public string Code { get; set; } = string.Empty; // ISO 3166-1 alpha-3
        
        [MaxLength(2)]
        public string Code2 { get; set; } = string.Empty; // ISO 3166-1 alpha-2
        
        public bool IsEmploymentMarket { get; set; } = true;
        public bool IsMigrationMarket { get; set; } = false;
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation
        public List<State> States { get; set; } = new();
    }

    /// <summary>
    /// State/Territory master data (Australian states + international regions)
    /// </summary>
    public class State
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(10)]
        public string Code { get; set; } = string.Empty; // NSW, VIC, QLD, etc.
        
        public Guid CountryId { get; set; }
        public Country Country { get; set; } = null!;
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation
        public List<City> Cities { get; set; } = new();
    }

    /// <summary>
    /// City/Town master data with geolocation
    /// </summary>
    public class City
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        public Guid StateId { get; set; }
        public State State { get; set; } = null!;
        
        [MaxLength(20)]
        public string? Postcode { get; set; }
        
        // Geolocation for spatial queries
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        
        public int Population { get; set; }
        public bool IsCapital { get; set; }
        public bool IsMajorCity { get; set; }
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Industry master data - top-level categories (33 major industries)
    /// </summary>
    public class Industry
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string IconName { get; set; } = string.Empty; // For UI
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation
        public List<JobCategory> JobCategories { get; set; } = new();
    }

    /// <summary>
    /// Job category master data - subcategories within industries
    /// </summary>
    public class JobCategory
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        public Guid IndustryId { get; set; }
        public Industry Industry { get; set; } = null!;
        
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Education provider - Universities
    /// </summary>
    public class University
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string Abbreviation { get; set; } = string.Empty; // UNSW, USYD, etc.
        
        [MaxLength(100)]
        public string City { get; set; } = string.Empty;
        
        [MaxLength(10)]
        public string StateCode { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string WebsiteUrl { get; set; } = string.Empty;
        
        public bool IsGroupOfEight { get; set; } // Prestigious universities
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Education provider - TAFE Institutes
    /// </summary>
    public class TAFEInstitute
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(10)]
        public string StateCode { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string WebsiteUrl { get; set; } = string.Empty;
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Education level - qualifications hierarchy
    /// </summary>
    public class EducationLevel
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty; // AQF1-10, etc.
        
        public int Level { get; set; } // 1-10 (AQF levels)
        
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Credential type - licenses, certifications, etc.
    /// </summary>
    public class CredentialType
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty; // Construction, Healthcare, IT, etc.
        
        [MaxLength(100)]
        public string SubCategory { get; set; } = string.Empty; // Building, Transport, etc.
        
        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;
        
        public bool RequiresRenewal { get; set; }
        public int? RenewalMonths { get; set; }
        
        [MaxLength(500)]
        public string IssuingAuthority { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string VerificationUrl { get; set; } = string.Empty;
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Visa type - Australian visa classifications
    /// </summary>
    public class VisaType
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string SubclassCode { get; set; } = string.Empty; // 189, 190, 482, etc.
        
        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty; // Skilled, Student, Working Holiday, etc.
        
        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;
        
        public bool HasFullWorkRights { get; set; }
        public bool HasLimitedWorkRights { get; set; }
        public int? WorkHoursPerWeekLimit { get; set; } // For student visas
        
        public bool AllowsEmployerSponsorship { get; set; }
        public bool PathwayToPermanentResidence { get; set; }
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Skill definition - standardized skill library
    /// </summary>
    public class SkillDefinition
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty; // Technical, Soft, Trade, etc.
        
        [MaxLength(100)]
        public string SubCategory { get; set; } = string.Empty;
        
        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;
        
        public List<string> Aliases { get; set; } = new(); // Alternative names
        public List<string> RelatedSkills { get; set; } = new();
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Employment type - full-time, part-time, contract, etc.
    /// </summary>
    public class EmploymentType
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Work arrangement - remote, hybrid, on-site
    /// </summary>
    public class WorkArrangement
    {
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
        
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
