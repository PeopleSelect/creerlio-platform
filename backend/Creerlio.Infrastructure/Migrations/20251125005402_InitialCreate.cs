using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Creerlio.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Addresses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Street = table.Column<string>(type: "TEXT", nullable: false),
                    City = table.Column<string>(type: "TEXT", nullable: false),
                    State = table.Column<string>(type: "TEXT", nullable: false),
                    PostalCode = table.Column<string>(type: "TEXT", nullable: false),
                    Country = table.Column<string>(type: "TEXT", nullable: false),
                    Latitude = table.Column<double>(type: "REAL", nullable: true),
                    Longitude = table.Column<double>(type: "REAL", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Addresses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Applications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    JobPostingId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    Stage = table.Column<string>(type: "TEXT", nullable: false),
                    AIMatchScore = table.Column<int>(type: "INTEGER", nullable: false),
                    CoverLetter = table.Column<string>(type: "TEXT", nullable: false),
                    AttachmentUrls = table.Column<string>(type: "jsonb", nullable: false),
                    SharedPortfolioId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Tags = table.Column<string>(type: "jsonb", nullable: false),
                    Rating = table.Column<int>(type: "INTEGER", nullable: false),
                    AssignedReviewers = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Applications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BrandGuidelines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ApprovedColors = table.Column<string>(type: "jsonb", nullable: false),
                    ApprovedFonts = table.Column<string>(type: "jsonb", nullable: false),
                    LogoUrl = table.Column<string>(type: "TEXT", nullable: false),
                    JobDescriptionTemplate = table.Column<string>(type: "TEXT", nullable: false),
                    CommunicationTemplates = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BrandGuidelines", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BusinessVerifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ABNVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    EmailVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    PhoneVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    WebsiteVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    VerifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    VerificationStatus = table.Column<string>(type: "TEXT", nullable: false),
                    VerificationDocuments = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessVerifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Countries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 3, nullable: false),
                    Code2 = table.Column<string>(type: "TEXT", maxLength: 2, nullable: false),
                    IsEmploymentMarket = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsMigrationMarket = table.Column<bool>(type: "INTEGER", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Countries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CredentialTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    SubCategory = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    RequiresRenewal = table.Column<bool>(type: "INTEGER", nullable: false),
                    RenewalMonths = table.Column<int>(type: "INTEGER", nullable: true),
                    IssuingAuthority = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    VerificationUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CredentialTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CredentialVerifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ItemType = table.Column<string>(type: "TEXT", nullable: false),
                    ItemId = table.Column<Guid>(type: "TEXT", nullable: false),
                    InitiatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    ConfidenceScore = table.Column<int>(type: "INTEGER", nullable: false),
                    VerificationMethod = table.Column<string>(type: "TEXT", nullable: false),
                    IsVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    VerificationFlags = table.Column<string>(type: "jsonb", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    TimelineConsistent = table.Column<bool>(type: "INTEGER", nullable: false),
                    TimelineIssues = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CredentialVerifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EducationLevels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Level = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EducationLevels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ElectronicFootprints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LastScannedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    NextScanAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CredibilityScore = table.Column<int>(type: "INTEGER", nullable: false),
                    VisibilityScore = table.Column<int>(type: "INTEGER", nullable: false),
                    ReputationScore = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ElectronicFootprints", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmploymentTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmploymentTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Industries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    IconName = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Industries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MarketIntelligences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SkillDemand = table.Column<string>(type: "TEXT", nullable: false),
                    SalaryTrends = table.Column<string>(type: "TEXT", nullable: false),
                    TalentAvailability = table.Column<string>(type: "TEXT", nullable: false),
                    EmergingSkills = table.Column<string>(type: "jsonb", nullable: false),
                    InDemandRoles = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MarketIntelligences", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MatchBreakdowns",
                columns: table => new
                {
                    MatchId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SkillsMatchScore = table.Column<int>(type: "INTEGER", nullable: false),
                    ExperienceMatchScore = table.Column<int>(type: "INTEGER", nullable: false),
                    EducationMatchScore = table.Column<int>(type: "INTEGER", nullable: false),
                    LocationMatchScore = table.Column<int>(type: "INTEGER", nullable: false),
                    SalaryMatchScore = table.Column<int>(type: "INTEGER", nullable: false),
                    CultureFitScore = table.Column<int>(type: "INTEGER", nullable: false),
                    CareerGrowthScore = table.Column<int>(type: "INTEGER", nullable: false),
                    MissingSkills = table.Column<string>(type: "jsonb", nullable: false),
                    BonusSkills = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchBreakdowns", x => x.MatchId);
                });

            migrationBuilder.CreateTable(
                name: "PortfolioSharings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ShareToken = table.Column<string>(type: "TEXT", nullable: false),
                    ShareUrl = table.Column<string>(type: "TEXT", nullable: false),
                    IsPublic = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ViewCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PortfolioSharings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PortfolioTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    TemplateName = table.Column<string>(type: "TEXT", nullable: false),
                    ColorScheme = table.Column<string>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PortfolioTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RecruitmentAnalytics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BusinessProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TotalJobsPosted = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalApplications = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalHires = table.Column<int>(type: "INTEGER", nullable: false),
                    AverageTimeToHire = table.Column<double>(type: "REAL", nullable: false),
                    AverageCostPerHire = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    ApplicationQualityScore = table.Column<double>(type: "REAL", nullable: false),
                    ApplicationsBySource = table.Column<string>(type: "TEXT", nullable: false),
                    HiresBySource = table.Column<string>(type: "TEXT", nullable: false),
                    DiversityMetrics = table.Column<string>(type: "TEXT", nullable: false),
                    ApplicationsReceived = table.Column<int>(type: "INTEGER", nullable: false),
                    ApplicationsReviewed = table.Column<int>(type: "INTEGER", nullable: false),
                    CandidatesShortlisted = table.Column<int>(type: "INTEGER", nullable: false),
                    InterviewsConducted = table.Column<int>(type: "INTEGER", nullable: false),
                    OffersExtended = table.Column<int>(type: "INTEGER", nullable: false),
                    OffersAccepted = table.Column<int>(type: "INTEGER", nullable: false),
                    IndustryBenchmarks = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecruitmentAnalytics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReputationMetrics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OverallScore = table.Column<double>(type: "REAL", precision: 5, scale: 2, nullable: false),
                    ReviewCount = table.Column<int>(type: "INTEGER", nullable: false),
                    AverageRating = table.Column<double>(type: "REAL", nullable: false),
                    SentimentBreakdown = table.Column<string>(type: "TEXT", nullable: false),
                    RecentMentions = table.Column<string>(type: "jsonb", nullable: false),
                    Trend = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReputationMetrics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SavedSearches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    AlertsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    AlertFrequency = table.Column<string>(type: "TEXT", nullable: false),
                    NewResultsCount = table.Column<int>(type: "INTEGER", nullable: false),
                    LastAlertSent = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedSearches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SkillDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    SubCategory = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    Aliases = table.Column<string>(type: "jsonb", nullable: false),
                    RelatedSkills = table.Column<string>(type: "jsonb", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SkillDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SkillGapAnalyses",
                columns: table => new
                {
                    PathwayId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    AnalysisDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    MissingSkills = table.Column<string>(type: "jsonb", nullable: false),
                    SkillsToImprove = table.Column<string>(type: "jsonb", nullable: false),
                    OverallReadinessScore = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SkillGapAnalyses", x => x.PathwayId);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionInfos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PlanType = table.Column<string>(type: "TEXT", nullable: false),
                    SubscriptionStartDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    SubscriptionEndDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    JobPostingLimit = table.Column<int>(type: "INTEGER", nullable: false),
                    JobPostingUsed = table.Column<int>(type: "INTEGER", nullable: false),
                    CanAccessAdvancedSearch = table.Column<bool>(type: "INTEGER", nullable: false),
                    CanAccessAnalytics = table.Column<bool>(type: "INTEGER", nullable: false),
                    CanAccessBusinessIntelligence = table.Column<bool>(type: "INTEGER", nullable: false),
                    CanAccessATS = table.Column<bool>(type: "INTEGER", nullable: false),
                    TeamMemberLimit = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionInfos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TAFEInstitutes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    StateCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    WebsiteUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TAFEInstitutes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TalentPools",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BusinessProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TalentProfileIds = table.Column<string>(type: "jsonb", nullable: false),
                    AutoPopulateEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsShared = table.Column<bool>(type: "INTEGER", nullable: false),
                    SharedWithBusinessIds = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TalentPools", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TalentProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Headline = table.Column<string>(type: "TEXT", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: false),
                    ProfileImageUrl = table.Column<string>(type: "TEXT", nullable: false),
                    ProfileStatus = table.Column<string>(type: "TEXT", nullable: false),
                    IsPublic = table.Column<bool>(type: "INTEGER", nullable: false),
                    Slug = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TalentProfiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Universities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Abbreviation = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    City = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    StateCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    WebsiteUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    IsGroupOfEight = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Universities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VisaTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    SubclassCode = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    HasFullWorkRights = table.Column<bool>(type: "INTEGER", nullable: false),
                    HasLimitedWorkRights = table.Column<bool>(type: "INTEGER", nullable: false),
                    WorkHoursPerWeekLimit = table.Column<int>(type: "INTEGER", nullable: true),
                    AllowsEmployerSponsorship = table.Column<bool>(type: "INTEGER", nullable: false),
                    PathwayToPermanentResidence = table.Column<bool>(type: "INTEGER", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisaTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkArrangements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkArrangements", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BusinessInformation",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    LegalName = table.Column<string>(type: "TEXT", nullable: false),
                    TradingName = table.Column<string>(type: "TEXT", nullable: false),
                    ABN = table.Column<string>(type: "TEXT", nullable: false),
                    ACN = table.Column<string>(type: "TEXT", nullable: false),
                    Industry = table.Column<string>(type: "TEXT", nullable: false),
                    Industries = table.Column<string>(type: "jsonb", nullable: false),
                    CompanySize = table.Column<string>(type: "TEXT", nullable: false),
                    EmployeeCount = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Mission = table.Column<string>(type: "TEXT", nullable: false),
                    Values = table.Column<string>(type: "jsonb", nullable: false),
                    LogoUrl = table.Column<string>(type: "TEXT", nullable: false),
                    CoverImageUrl = table.Column<string>(type: "TEXT", nullable: false),
                    WebsiteUrl = table.Column<string>(type: "TEXT", nullable: false),
                    LinkedInUrl = table.Column<string>(type: "TEXT", nullable: false),
                    FoundedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    PrimaryEmail = table.Column<string>(type: "TEXT", nullable: false),
                    PrimaryPhone = table.Column<string>(type: "TEXT", nullable: false),
                    HeadOfficeAddressId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessInformation", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessInformation_Addresses_HeadOfficeAddressId",
                        column: x => x.HeadOfficeAddressId,
                        principalTable: "Addresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JobPostings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BusinessProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LocationId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ClosedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Responsibilities = table.Column<string>(type: "jsonb", nullable: false),
                    Requirements = table.Column<string>(type: "jsonb", nullable: false),
                    PreferredQualifications = table.Column<string>(type: "jsonb", nullable: false),
                    EmploymentType = table.Column<string>(type: "TEXT", nullable: false),
                    WorkModel = table.Column<string>(type: "TEXT", nullable: false),
                    ExperienceLevel = table.Column<string>(type: "TEXT", nullable: false),
                    JobLocationId = table.Column<Guid>(type: "TEXT", nullable: true),
                    MinSalary = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: true),
                    MaxSalary = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: true),
                    SalaryCurrency = table.Column<string>(type: "TEXT", nullable: false),
                    SalaryPeriod = table.Column<string>(type: "TEXT", nullable: false),
                    ShowSalary = table.Column<bool>(type: "INTEGER", nullable: false),
                    Benefits = table.Column<string>(type: "jsonb", nullable: false),
                    RequiredSkills = table.Column<string>(type: "jsonb", nullable: false),
                    PreferredSkills = table.Column<string>(type: "jsonb", nullable: false),
                    Category = table.Column<string>(type: "TEXT", nullable: false),
                    Industry = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    ApplicationCount = table.Column<int>(type: "INTEGER", nullable: false),
                    ViewCount = table.Column<int>(type: "INTEGER", nullable: false),
                    AcceptApplications = table.Column<bool>(type: "INTEGER", nullable: false),
                    ApplicationMethod = table.Column<string>(type: "TEXT", nullable: false),
                    ExternalApplicationUrl = table.Column<string>(type: "TEXT", nullable: false),
                    AIGenerated = table.Column<bool>(type: "INTEGER", nullable: false),
                    ComplianceChecked = table.Column<bool>(type: "INTEGER", nullable: false),
                    ComplianceIssues = table.Column<string>(type: "jsonb", nullable: false),
                    AIMatchThreshold = table.Column<int>(type: "INTEGER", nullable: false),
                    SEOTitle = table.Column<string>(type: "TEXT", nullable: false),
                    SEODescription = table.Column<string>(type: "TEXT", nullable: false),
                    PostToSEEK = table.Column<bool>(type: "INTEGER", nullable: false),
                    SEEKJobId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobPostings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobPostings_Addresses_JobLocationId",
                        column: x => x.JobLocationId,
                        principalTable: "Addresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ApplicationActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    PerformedBy = table.Column<string>(type: "TEXT", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Metadata = table.Column<string>(type: "TEXT", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicationActivities_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ApplicationNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    AuthorId = table.Column<string>(type: "TEXT", nullable: false),
                    AuthorName = table.Column<string>(type: "TEXT", nullable: false),
                    Content = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsPrivate = table.Column<bool>(type: "INTEGER", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicationNotes_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Interviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ScheduledTime = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DurationMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Location = table.Column<string>(type: "TEXT", nullable: false),
                    MeetingUrl = table.Column<string>(type: "TEXT", nullable: false),
                    InterviewerIds = table.Column<string>(type: "jsonb", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    Rating = table.Column<int>(type: "INTEGER", nullable: true),
                    ApplicationId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Interviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Interviews_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TeamMemberRatings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    UserName = table.Column<string>(type: "TEXT", nullable: false),
                    Rating = table.Column<int>(type: "INTEGER", nullable: false),
                    Feedback = table.Column<string>(type: "TEXT", nullable: false),
                    RatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamMemberRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamMemberRatings_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FranchiseSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    IsParent = table.Column<bool>(type: "INTEGER", nullable: false),
                    FranchiseName = table.Column<string>(type: "TEXT", nullable: false),
                    TotalFranchisees = table.Column<int>(type: "INTEGER", nullable: false),
                    FranchiseeIds = table.Column<string>(type: "jsonb", nullable: false),
                    ShareTalentPool = table.Column<bool>(type: "INTEGER", nullable: false),
                    ShareJobTemplates = table.Column<bool>(type: "INTEGER", nullable: false),
                    CentralizedReporting = table.Column<bool>(type: "INTEGER", nullable: false),
                    EnforceBrandGuidelines = table.Column<bool>(type: "INTEGER", nullable: false),
                    BrandGuidelinesId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FranchiseSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FranchiseSettings_BrandGuidelines_BrandGuidelinesId",
                        column: x => x.BrandGuidelinesId,
                        principalTable: "BrandGuidelines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "States",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    CountryId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_States", x => x.Id);
                    table.ForeignKey(
                        name: "FK_States_Countries_CountryId",
                        column: x => x.CountryId,
                        principalTable: "Countries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VerificationSources",
                columns: table => new
                {
                    VerificationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Source = table.Column<string>(type: "TEXT", nullable: false),
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    IsVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    ConfidenceScore = table.Column<int>(type: "INTEGER", nullable: false),
                    CheckedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    VerifiedData = table.Column<string>(type: "TEXT", nullable: false),
                    CredentialVerificationId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VerificationSources", x => new { x.VerificationId, x.Source });
                    table.ForeignKey(
                        name: "FK_VerificationSources_CredentialVerifications_CredentialVerificationId",
                        column: x => x.CredentialVerificationId,
                        principalTable: "CredentialVerifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AwardRecognitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Issuer = table.Column<string>(type: "TEXT", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    IsVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    AddedToProfile = table.Column<bool>(type: "INTEGER", nullable: false),
                    ElectronicFootprintId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardRecognitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AwardRecognitions_ElectronicFootprints_ElectronicFootprintId",
                        column: x => x.ElectronicFootprintId,
                        principalTable: "ElectronicFootprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FootprintAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Severity = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsRead = table.Column<bool>(type: "INTEGER", nullable: false),
                    ActionUrl = table.Column<string>(type: "TEXT", nullable: false),
                    ElectronicFootprintId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FootprintAlerts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FootprintAlerts_ElectronicFootprints_ElectronicFootprintId",
                        column: x => x.ElectronicFootprintId,
                        principalTable: "ElectronicFootprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GitHubActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    RepositoryName = table.Column<string>(type: "TEXT", nullable: false),
                    RepositoryUrl = table.Column<string>(type: "TEXT", nullable: false),
                    ActivityType = table.Column<string>(type: "TEXT", nullable: false),
                    ActivityDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Stars = table.Column<int>(type: "INTEGER", nullable: false),
                    Forks = table.Column<int>(type: "INTEGER", nullable: false),
                    Languages = table.Column<string>(type: "jsonb", nullable: false),
                    Topics = table.Column<string>(type: "jsonb", nullable: false),
                    IsFeatured = table.Column<bool>(type: "INTEGER", nullable: false),
                    ElectronicFootprintId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GitHubActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GitHubActivities_ElectronicFootprints_ElectronicFootprintId",
                        column: x => x.ElectronicFootprintId,
                        principalTable: "ElectronicFootprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NewsMentions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Source = table.Column<string>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    PublishedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Sentiment = table.Column<string>(type: "TEXT", nullable: false),
                    Excerpt = table.Column<string>(type: "TEXT", nullable: false),
                    IsVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    AddedToProfile = table.Column<bool>(type: "INTEGER", nullable: false),
                    ElectronicFootprintId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsMentions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NewsMentions_ElectronicFootprints_ElectronicFootprintId",
                        column: x => x.ElectronicFootprintId,
                        principalTable: "ElectronicFootprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Publications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Publisher = table.Column<string>(type: "TEXT", nullable: false),
                    PublishedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    CoAuthors = table.Column<string>(type: "jsonb", nullable: false),
                    Citations = table.Column<int>(type: "INTEGER", nullable: false),
                    AddedToProfile = table.Column<bool>(type: "INTEGER", nullable: false),
                    ElectronicFootprintId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Publications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Publications_ElectronicFootprints_ElectronicFootprintId",
                        column: x => x.ElectronicFootprintId,
                        principalTable: "ElectronicFootprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SocialMediaPosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Platform = table.Column<string>(type: "TEXT", nullable: false),
                    PostUrl = table.Column<string>(type: "TEXT", nullable: false),
                    Content = table.Column<string>(type: "TEXT", nullable: false),
                    PostedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EngagementScore = table.Column<int>(type: "INTEGER", nullable: false),
                    Sentiment = table.Column<string>(type: "TEXT", nullable: false),
                    IsRelevant = table.Column<bool>(type: "INTEGER", nullable: false),
                    ElectronicFootprintId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialMediaPosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialMediaPosts_ElectronicFootprints_ElectronicFootprintId",
                        column: x => x.ElectronicFootprintId,
                        principalTable: "ElectronicFootprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SpeakingEngagements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    EventName = table.Column<string>(type: "TEXT", nullable: false),
                    Topic = table.Column<string>(type: "TEXT", nullable: false),
                    EventDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EventUrl = table.Column<string>(type: "TEXT", nullable: false),
                    VideoUrl = table.Column<string>(type: "TEXT", nullable: false),
                    Attendees = table.Column<int>(type: "INTEGER", nullable: false),
                    AddedToProfile = table.Column<bool>(type: "INTEGER", nullable: false),
                    ElectronicFootprintId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpeakingEngagements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SpeakingEngagements_ElectronicFootprints_ElectronicFootprintId",
                        column: x => x.ElectronicFootprintId,
                        principalTable: "ElectronicFootprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JobCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    IndustryId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobCategories_Industries_IndustryId",
                        column: x => x.IndustryId,
                        principalTable: "Industries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JobMatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    JobPostingId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CalculatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    MatchScore = table.Column<int>(type: "INTEGER", nullable: false),
                    MatchQuality = table.Column<string>(type: "TEXT", nullable: false),
                    BreakdownMatchId = table.Column<Guid>(type: "TEXT", nullable: true),
                    MatchExplanation = table.Column<string>(type: "TEXT", nullable: false),
                    MatchReasons = table.Column<string>(type: "jsonb", nullable: false),
                    Concerns = table.Column<string>(type: "jsonb", nullable: false),
                    IsViewed = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsApplied = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsSaved = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsHidden = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobMatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobMatches_MatchBreakdowns_BreakdownMatchId",
                        column: x => x.BreakdownMatchId,
                        principalTable: "MatchBreakdowns",
                        principalColumn: "MatchId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SkillMatches",
                columns: table => new
                {
                    MatchId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SkillName = table.Column<string>(type: "TEXT", nullable: false),
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    IsRequired = table.Column<bool>(type: "INTEGER", nullable: false),
                    HasSkill = table.Column<bool>(type: "INTEGER", nullable: false),
                    TalentProficiency = table.Column<int>(type: "INTEGER", nullable: false),
                    RequiredProficiency = table.Column<int>(type: "INTEGER", nullable: false),
                    YearsExperience = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SkillMatches", x => new { x.MatchId, x.SkillName });
                    table.ForeignKey(
                        name: "FK_SkillMatches_MatchBreakdowns_MatchId",
                        column: x => x.MatchId,
                        principalTable: "MatchBreakdowns",
                        principalColumn: "MatchId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BusinessAccesses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PortfolioSharingId = table.Column<Guid>(type: "TEXT", nullable: false),
                    BusinessProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    GrantedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CanDownload = table.Column<bool>(type: "INTEGER", nullable: false),
                    CanContact = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessAccesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessAccesses_PortfolioSharings_PortfolioSharingId",
                        column: x => x.PortfolioSharingId,
                        principalTable: "PortfolioSharings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PortfolioSections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PortfolioTemplateId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    IsVisible = table.Column<bool>(type: "INTEGER", nullable: false),
                    DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    Content = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PortfolioSections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PortfolioSections_PortfolioTemplates_PortfolioTemplateId",
                        column: x => x.PortfolioTemplateId,
                        principalTable: "PortfolioTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TemplateDesigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PortfolioTemplateId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PrimaryColor = table.Column<string>(type: "TEXT", nullable: false),
                    SecondaryColor = table.Column<string>(type: "TEXT", nullable: false),
                    AccentColor = table.Column<string>(type: "TEXT", nullable: false),
                    FontFamily = table.Column<string>(type: "TEXT", nullable: false),
                    FontSize = table.Column<string>(type: "TEXT", nullable: false),
                    CustomCSS = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateDesigns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TemplateDesigns_PortfolioTemplates_PortfolioTemplateId",
                        column: x => x.PortfolioTemplateId,
                        principalTable: "PortfolioTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BusinessIntelligenceReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BusinessProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ReportType = table.Column<string>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", nullable: false),
                    MarketDataId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ReputationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessIntelligenceReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessIntelligenceReports_MarketIntelligences_MarketDataId",
                        column: x => x.MarketDataId,
                        principalTable: "MarketIntelligences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BusinessIntelligenceReports_ReputationMetrics_ReputationId",
                        column: x => x.ReputationId,
                        principalTable: "ReputationMetrics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CareerPathways",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CurrentRole = table.Column<string>(type: "TEXT", nullable: false),
                    TargetRole = table.Column<string>(type: "TEXT", nullable: false),
                    Industry = table.Column<string>(type: "TEXT", nullable: false),
                    EstimatedTimelineMonths = table.Column<int>(type: "INTEGER", nullable: false),
                    EstimatedCost = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "TEXT", nullable: false),
                    CompletionPercentage = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetCompletionDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    SkillGapsPathwayId = table.Column<Guid>(type: "TEXT", nullable: false),
                    IsAIGenerated = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastAIUpdateDate = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CareerPathways", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CareerPathways_SkillGapAnalyses_SkillGapsPathwayId",
                        column: x => x.SkillGapsPathwayId,
                        principalTable: "SkillGapAnalyses",
                        principalColumn: "PathwayId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SkillGaps",
                columns: table => new
                {
                    PathwayId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SkillName = table.Column<string>(type: "TEXT", nullable: false),
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CurrentLevel = table.Column<int>(type: "INTEGER", nullable: false),
                    RequiredLevel = table.Column<int>(type: "INTEGER", nullable: false),
                    GapSize = table.Column<int>(type: "INTEGER", nullable: false),
                    Priority = table.Column<string>(type: "TEXT", nullable: false),
                    EstimatedTimeToAcquireMonths = table.Column<int>(type: "INTEGER", nullable: false),
                    RecommendedCourses = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SkillGaps", x => new { x.PathwayId, x.SkillName });
                    table.ForeignKey(
                        name: "FK_SkillGaps_SkillGapAnalyses_PathwayId",
                        column: x => x.PathwayId,
                        principalTable: "SkillGapAnalyses",
                        principalColumn: "PathwayId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SearchCriterias",
                columns: table => new
                {
                    SavedSearchId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentPoolId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Keywords = table.Column<string>(type: "TEXT", nullable: false),
                    Locations = table.Column<string>(type: "jsonb", nullable: false),
                    MinSalary = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: true),
                    MaxSalary = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: true),
                    EmploymentTypes = table.Column<string>(type: "jsonb", nullable: false),
                    Industries = table.Column<string>(type: "jsonb", nullable: false),
                    CompanySizes = table.Column<string>(type: "jsonb", nullable: false),
                    RemoteOnly = table.Column<bool>(type: "INTEGER", nullable: false),
                    MinMatchScore = table.Column<int>(type: "INTEGER", nullable: true),
                    RequiredSkills = table.Column<string>(type: "jsonb", nullable: false),
                    Benefits = table.Column<string>(type: "jsonb", nullable: false),
                    PostedAfter = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchCriterias", x => new { x.SavedSearchId, x.TalentPoolId });
                    table.ForeignKey(
                        name: "FK_SearchCriterias_SavedSearches_SavedSearchId",
                        column: x => x.SavedSearchId,
                        principalTable: "SavedSearches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SearchCriterias_TalentPools_TalentPoolId",
                        column: x => x.TalentPoolId,
                        principalTable: "TalentPools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Awards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Issuer = table.Column<string>(type: "TEXT", nullable: false),
                    DateReceived = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Awards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Awards_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CareerPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PreferredRoles = table.Column<string>(type: "jsonb", nullable: false),
                    PreferredIndustries = table.Column<string>(type: "jsonb", nullable: false),
                    PreferredLocations = table.Column<string>(type: "jsonb", nullable: false),
                    WorkModel = table.Column<string>(type: "TEXT", nullable: false),
                    PreferredEmploymentTypes = table.Column<string>(type: "jsonb", nullable: false),
                    ExpectedSalary = table.Column<decimal>(type: "TEXT", nullable: true),
                    Currency = table.Column<string>(type: "TEXT", nullable: false),
                    OpenToRelocation = table.Column<bool>(type: "INTEGER", nullable: false),
                    OpenToRemote = table.Column<bool>(type: "INTEGER", nullable: false),
                    AvailableFrom = table.Column<DateTime>(type: "TEXT", nullable: true),
                    NoticePeriod = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CareerPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CareerPreferences_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Certifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    IssuingOrganization = table.Column<string>(type: "TEXT", nullable: false),
                    IssueDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CredentialId = table.Column<string>(type: "TEXT", nullable: false),
                    CredentialUrl = table.Column<string>(type: "TEXT", nullable: false),
                    IsVerified = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Certifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Certifications_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Educations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Institution = table.Column<string>(type: "TEXT", nullable: false),
                    Degree = table.Column<string>(type: "TEXT", nullable: false),
                    Field = table.Column<string>(type: "TEXT", nullable: false),
                    StartDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    GPA = table.Column<double>(type: "REAL", nullable: true),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Honors = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Educations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Educations_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PersonalInformation",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FirstName = table.Column<string>(type: "TEXT", nullable: false),
                    LastName = table.Column<string>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    Phone = table.Column<string>(type: "TEXT", nullable: false),
                    City = table.Column<string>(type: "TEXT", nullable: false),
                    State = table.Column<string>(type: "TEXT", nullable: false),
                    Country = table.Column<string>(type: "TEXT", nullable: false),
                    PostalCode = table.Column<string>(type: "TEXT", nullable: false),
                    LinkedInUrl = table.Column<string>(type: "TEXT", nullable: false),
                    GitHubUrl = table.Column<string>(type: "TEXT", nullable: false),
                    WebsiteUrl = table.Column<string>(type: "TEXT", nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonalInformation", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PersonalInformation_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PortfolioItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    Images = table.Column<string>(type: "jsonb", nullable: false),
                    Technologies = table.Column<string>(type: "jsonb", nullable: false),
                    CompletionDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PortfolioItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PortfolioItems_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PrivacySettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ShowEmail = table.Column<bool>(type: "INTEGER", nullable: false),
                    ShowPhone = table.Column<bool>(type: "INTEGER", nullable: false),
                    ShowLocation = table.Column<bool>(type: "INTEGER", nullable: false),
                    ShowSalaryExpectations = table.Column<bool>(type: "INTEGER", nullable: false),
                    AllowContactFromRecruiters = table.Column<bool>(type: "INTEGER", nullable: false),
                    ShowProfileInSearch = table.Column<bool>(type: "INTEGER", nullable: false),
                    BlockedBusinessIds = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrivacySettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrivacySettings_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "References",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Company = table.Column<string>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    Phone = table.Column<string>(type: "TEXT", nullable: false),
                    Relationship = table.Column<string>(type: "TEXT", nullable: false),
                    Testimonial = table.Column<string>(type: "TEXT", nullable: false),
                    IsVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_References", x => x.Id);
                    table.ForeignKey(
                        name: "FK_References_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Skills",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Category = table.Column<string>(type: "TEXT", nullable: false),
                    ProficiencyLevel = table.Column<int>(type: "INTEGER", nullable: false),
                    YearsOfExperience = table.Column<double>(type: "REAL", nullable: false),
                    EndorsementCount = table.Column<int>(type: "INTEGER", nullable: false),
                    LastUsed = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Skills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Skills_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VerificationStatuses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    EmailVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    PhoneVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    IdentityVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    BackgroundCheckCompleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastVerificationDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    VerificationScore = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VerificationStatuses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VerificationStatuses_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkExperiences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Company = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    StartDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsCurrentRole = table.Column<bool>(type: "INTEGER", nullable: false),
                    Location = table.Column<string>(type: "TEXT", nullable: false),
                    EmploymentType = table.Column<string>(type: "TEXT", nullable: false),
                    Achievements = table.Column<string>(type: "jsonb", nullable: false),
                    Technologies = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkExperiences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkExperiences_TalentProfiles_TalentProfileId",
                        column: x => x.TalentProfileId,
                        principalTable: "TalentProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BusinessProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    BusinessInfoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    BusinessType = table.Column<string>(type: "TEXT", nullable: false),
                    ParentBusinessId = table.Column<Guid>(type: "TEXT", nullable: true),
                    FranchiseSettingsId = table.Column<Guid>(type: "TEXT", nullable: true),
                    VerificationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessProfiles_BusinessInformation_BusinessInfoId",
                        column: x => x.BusinessInfoId,
                        principalTable: "BusinessInformation",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BusinessProfiles_BusinessVerifications_VerificationId",
                        column: x => x.VerificationId,
                        principalTable: "BusinessVerifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BusinessProfiles_FranchiseSettings_FranchiseSettingsId",
                        column: x => x.FranchiseSettingsId,
                        principalTable: "FranchiseSettings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BusinessProfiles_SubscriptionInfos_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "SubscriptionInfos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Cities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    StateId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Postcode = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    Latitude = table.Column<double>(type: "REAL", nullable: true),
                    Longitude = table.Column<double>(type: "REAL", nullable: true),
                    Population = table.Column<int>(type: "INTEGER", nullable: false),
                    IsCapital = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsMajorCity = table.Column<bool>(type: "INTEGER", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cities_States_StateId",
                        column: x => x.StateId,
                        principalTable: "States",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CompetitorActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CompetitorName = table.Column<string>(type: "TEXT", nullable: false),
                    Activity = table.Column<string>(type: "TEXT", nullable: false),
                    DetectedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    Impact = table.Column<string>(type: "TEXT", nullable: false),
                    BusinessIntelligenceReportId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompetitorActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompetitorActivities_BusinessIntelligenceReports_BusinessIntelligenceReportId",
                        column: x => x.BusinessIntelligenceReportId,
                        principalTable: "BusinessIntelligenceReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OpportunityAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Priority = table.Column<string>(type: "TEXT", nullable: false),
                    DetectedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ActionUrl = table.Column<string>(type: "TEXT", nullable: false),
                    IsRead = table.Column<bool>(type: "INTEGER", nullable: false),
                    BusinessIntelligenceReportId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OpportunityAlerts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OpportunityAlerts_BusinessIntelligenceReports_BusinessIntelligenceReportId",
                        column: x => x.BusinessIntelligenceReportId,
                        principalTable: "BusinessIntelligenceReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PathwayRecommendations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TalentProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", nullable: false),
                    ConfidenceScore = table.Column<int>(type: "INTEGER", nullable: false),
                    IsApplied = table.Column<bool>(type: "INTEGER", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CareerPathwayId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathwayRecommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PathwayRecommendations_CareerPathways_CareerPathwayId",
                        column: x => x.CareerPathwayId,
                        principalTable: "CareerPathways",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PathwaySteps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PathwayId = table.Column<Guid>(type: "TEXT", nullable: false),
                    StepNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    DurationMonths = table.Column<int>(type: "INTEGER", nullable: false),
                    EstimatedCost = table.Column<decimal>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    StartedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletionPercentage = table.Column<int>(type: "INTEGER", nullable: false),
                    Prerequisites = table.Column<string>(type: "jsonb", nullable: false),
                    SkillsToAcquire = table.Column<string>(type: "jsonb", nullable: false),
                    CareerPathwayId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathwaySteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PathwaySteps_CareerPathways_CareerPathwayId",
                        column: x => x.CareerPathwayId,
                        principalTable: "CareerPathways",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BusinessProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    AddressId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Phone = table.Column<string>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CanPostJobs = table.Column<bool>(type: "INTEGER", nullable: false),
                    LocationManagerIds = table.Column<string>(type: "jsonb", nullable: false),
                    CustomSettings = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Locations_Addresses_AddressId",
                        column: x => x.AddressId,
                        principalTable: "Addresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Locations_BusinessProfiles_BusinessProfileId",
                        column: x => x.BusinessProfileId,
                        principalTable: "BusinessProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Milestones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PathwayId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    TargetDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsCompleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    CompletedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    PathwayStepId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Milestones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Milestones_PathwaySteps_PathwayStepId",
                        column: x => x.PathwayStepId,
                        principalTable: "PathwaySteps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PathwayResources",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    StepId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Provider = table.Column<string>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    Cost = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: true),
                    DurationHours = table.Column<int>(type: "INTEGER", nullable: true),
                    Rating = table.Column<double>(type: "REAL", nullable: true),
                    IsCompleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    CompletedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    PathwayStepId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathwayResources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PathwayResources_PathwaySteps_PathwayStepId",
                        column: x => x.PathwayStepId,
                        principalTable: "PathwaySteps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationActivities_ApplicationId",
                table: "ApplicationActivities",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationNotes_ApplicationId",
                table: "ApplicationNotes",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_JobPostingId_Status",
                table: "Applications",
                columns: new[] { "JobPostingId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Applications_TalentProfileId",
                table: "Applications",
                column: "TalentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_AwardRecognitions_ElectronicFootprintId",
                table: "AwardRecognitions",
                column: "ElectronicFootprintId");

            migrationBuilder.CreateIndex(
                name: "IX_Awards_TalentProfileId",
                table: "Awards",
                column: "TalentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessAccesses_PortfolioSharingId",
                table: "BusinessAccesses",
                column: "PortfolioSharingId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessInformation_HeadOfficeAddressId",
                table: "BusinessInformation",
                column: "HeadOfficeAddressId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessIntelligenceReports_MarketDataId",
                table: "BusinessIntelligenceReports",
                column: "MarketDataId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessIntelligenceReports_ReputationId",
                table: "BusinessIntelligenceReports",
                column: "ReputationId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessProfiles_BusinessInfoId",
                table: "BusinessProfiles",
                column: "BusinessInfoId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessProfiles_FranchiseSettingsId",
                table: "BusinessProfiles",
                column: "FranchiseSettingsId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessProfiles_SubscriptionId",
                table: "BusinessProfiles",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessProfiles_UserId",
                table: "BusinessProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BusinessProfiles_VerificationId",
                table: "BusinessProfiles",
                column: "VerificationId");

            migrationBuilder.CreateIndex(
                name: "IX_CareerPathways_SkillGapsPathwayId",
                table: "CareerPathways",
                column: "SkillGapsPathwayId");

            migrationBuilder.CreateIndex(
                name: "IX_CareerPathways_TalentProfileId",
                table: "CareerPathways",
                column: "TalentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_CareerPreferences_TalentProfileId",
                table: "CareerPreferences",
                column: "TalentProfileId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Certifications_TalentProfileId",
                table: "Certifications",
                column: "TalentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_Cities_Latitude_Longitude",
                table: "Cities",
                columns: new[] { "Latitude", "Longitude" });

            migrationBuilder.CreateIndex(
                name: "IX_Cities_Postcode",
                table: "Cities",
                column: "Postcode");

            migrationBuilder.CreateIndex(
                name: "IX_Cities_StateId_Name",
                table: "Cities",
                columns: new[] { "StateId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_CompetitorActivities_BusinessIntelligenceReportId",
                table: "CompetitorActivities",
                column: "BusinessIntelligenceReportId");

            migrationBuilder.CreateIndex(
                name: "IX_Countries_Code",
                table: "Countries",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_Countries_Name",
                table: "Countries",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CredentialTypes_Category_Name",
                table: "CredentialTypes",
                columns: new[] { "Category", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Educations_TalentProfileId",
                table: "Educations",
                column: "TalentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_ElectronicFootprints_TalentProfileId",
                table: "ElectronicFootprints",
                column: "TalentProfileId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FootprintAlerts_ElectronicFootprintId",
                table: "FootprintAlerts",
                column: "ElectronicFootprintId");

            migrationBuilder.CreateIndex(
                name: "IX_FranchiseSettings_BrandGuidelinesId",
                table: "FranchiseSettings",
                column: "BrandGuidelinesId");

            migrationBuilder.CreateIndex(
                name: "IX_GitHubActivities_ElectronicFootprintId",
                table: "GitHubActivities",
                column: "ElectronicFootprintId");

            migrationBuilder.CreateIndex(
                name: "IX_Industries_Name",
                table: "Industries",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Interviews_ApplicationId",
                table: "Interviews",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_JobCategories_IndustryId_Name",
                table: "JobCategories",
                columns: new[] { "IndustryId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_JobMatches_BreakdownMatchId",
                table: "JobMatches",
                column: "BreakdownMatchId");

            migrationBuilder.CreateIndex(
                name: "IX_JobMatches_TalentProfileId_JobPostingId",
                table: "JobMatches",
                columns: new[] { "TalentProfileId", "JobPostingId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobMatches_TalentProfileId_MatchScore",
                table: "JobMatches",
                columns: new[] { "TalentProfileId", "MatchScore" });

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_BusinessProfileId_Status",
                table: "JobPostings",
                columns: new[] { "BusinessProfileId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_JobLocationId",
                table: "JobPostings",
                column: "JobLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_AddressId",
                table: "Locations",
                column: "AddressId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_BusinessProfileId",
                table: "Locations",
                column: "BusinessProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_PathwayStepId",
                table: "Milestones",
                column: "PathwayStepId");

            migrationBuilder.CreateIndex(
                name: "IX_NewsMentions_ElectronicFootprintId",
                table: "NewsMentions",
                column: "ElectronicFootprintId");

            migrationBuilder.CreateIndex(
                name: "IX_OpportunityAlerts_BusinessIntelligenceReportId",
                table: "OpportunityAlerts",
                column: "BusinessIntelligenceReportId");

            migrationBuilder.CreateIndex(
                name: "IX_PathwayRecommendations_CareerPathwayId",
                table: "PathwayRecommendations",
                column: "CareerPathwayId");

            migrationBuilder.CreateIndex(
                name: "IX_PathwayResources_PathwayStepId",
                table: "PathwayResources",
                column: "PathwayStepId");

            migrationBuilder.CreateIndex(
                name: "IX_PathwaySteps_CareerPathwayId",
                table: "PathwaySteps",
                column: "CareerPathwayId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalInformation_TalentProfileId",
                table: "PersonalInformation",
                column: "TalentProfileId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PortfolioItems_TalentProfileId",
                table: "PortfolioItems",
                column: "TalentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_PortfolioSections_PortfolioTemplateId",
                table: "PortfolioSections",
                column: "PortfolioTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_PrivacySettings_TalentProfileId",
                table: "PrivacySettings",
                column: "TalentProfileId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Publications_ElectronicFootprintId",
                table: "Publications",
                column: "ElectronicFootprintId");

            migrationBuilder.CreateIndex(
                name: "IX_References_TalentProfileId",
                table: "References",
                column: "TalentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_SavedSearches_TalentProfileId",
                table: "SavedSearches",
                column: "TalentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_SearchCriterias_SavedSearchId",
                table: "SearchCriterias",
                column: "SavedSearchId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SearchCriterias_TalentPoolId",
                table: "SearchCriterias",
                column: "TalentPoolId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SkillDefinitions_Category_Name",
                table: "SkillDefinitions",
                columns: new[] { "Category", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Skills_TalentProfileId",
                table: "Skills",
                column: "TalentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialMediaPosts_ElectronicFootprintId",
                table: "SocialMediaPosts",
                column: "ElectronicFootprintId");

            migrationBuilder.CreateIndex(
                name: "IX_SpeakingEngagements_ElectronicFootprintId",
                table: "SpeakingEngagements",
                column: "ElectronicFootprintId");

            migrationBuilder.CreateIndex(
                name: "IX_States_CountryId_Code",
                table: "States",
                columns: new[] { "CountryId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_States_Name",
                table: "States",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_TAFEInstitutes_Name",
                table: "TAFEInstitutes",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_TalentPools_BusinessProfileId",
                table: "TalentPools",
                column: "BusinessProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_TalentProfiles_UserId",
                table: "TalentProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamMemberRatings_ApplicationId",
                table: "TeamMemberRatings",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateDesigns_PortfolioTemplateId",
                table: "TemplateDesigns",
                column: "PortfolioTemplateId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Universities_Name",
                table: "Universities",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VerificationSources_CredentialVerificationId",
                table: "VerificationSources",
                column: "CredentialVerificationId");

            migrationBuilder.CreateIndex(
                name: "IX_VerificationStatuses_TalentProfileId",
                table: "VerificationStatuses",
                column: "TalentProfileId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VisaTypes_SubclassCode",
                table: "VisaTypes",
                column: "SubclassCode");

            migrationBuilder.CreateIndex(
                name: "IX_WorkExperiences_TalentProfileId",
                table: "WorkExperiences",
                column: "TalentProfileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationActivities");

            migrationBuilder.DropTable(
                name: "ApplicationNotes");

            migrationBuilder.DropTable(
                name: "AwardRecognitions");

            migrationBuilder.DropTable(
                name: "Awards");

            migrationBuilder.DropTable(
                name: "BusinessAccesses");

            migrationBuilder.DropTable(
                name: "CareerPreferences");

            migrationBuilder.DropTable(
                name: "Certifications");

            migrationBuilder.DropTable(
                name: "Cities");

            migrationBuilder.DropTable(
                name: "CompetitorActivities");

            migrationBuilder.DropTable(
                name: "CredentialTypes");

            migrationBuilder.DropTable(
                name: "EducationLevels");

            migrationBuilder.DropTable(
                name: "Educations");

            migrationBuilder.DropTable(
                name: "EmploymentTypes");

            migrationBuilder.DropTable(
                name: "FootprintAlerts");

            migrationBuilder.DropTable(
                name: "GitHubActivities");

            migrationBuilder.DropTable(
                name: "Interviews");

            migrationBuilder.DropTable(
                name: "JobCategories");

            migrationBuilder.DropTable(
                name: "JobMatches");

            migrationBuilder.DropTable(
                name: "JobPostings");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropTable(
                name: "Milestones");

            migrationBuilder.DropTable(
                name: "NewsMentions");

            migrationBuilder.DropTable(
                name: "OpportunityAlerts");

            migrationBuilder.DropTable(
                name: "PathwayRecommendations");

            migrationBuilder.DropTable(
                name: "PathwayResources");

            migrationBuilder.DropTable(
                name: "PersonalInformation");

            migrationBuilder.DropTable(
                name: "PortfolioItems");

            migrationBuilder.DropTable(
                name: "PortfolioSections");

            migrationBuilder.DropTable(
                name: "PrivacySettings");

            migrationBuilder.DropTable(
                name: "Publications");

            migrationBuilder.DropTable(
                name: "RecruitmentAnalytics");

            migrationBuilder.DropTable(
                name: "References");

            migrationBuilder.DropTable(
                name: "SearchCriterias");

            migrationBuilder.DropTable(
                name: "SkillDefinitions");

            migrationBuilder.DropTable(
                name: "SkillGaps");

            migrationBuilder.DropTable(
                name: "SkillMatches");

            migrationBuilder.DropTable(
                name: "Skills");

            migrationBuilder.DropTable(
                name: "SocialMediaPosts");

            migrationBuilder.DropTable(
                name: "SpeakingEngagements");

            migrationBuilder.DropTable(
                name: "TAFEInstitutes");

            migrationBuilder.DropTable(
                name: "TeamMemberRatings");

            migrationBuilder.DropTable(
                name: "TemplateDesigns");

            migrationBuilder.DropTable(
                name: "Universities");

            migrationBuilder.DropTable(
                name: "VerificationSources");

            migrationBuilder.DropTable(
                name: "VerificationStatuses");

            migrationBuilder.DropTable(
                name: "VisaTypes");

            migrationBuilder.DropTable(
                name: "WorkArrangements");

            migrationBuilder.DropTable(
                name: "WorkExperiences");

            migrationBuilder.DropTable(
                name: "PortfolioSharings");

            migrationBuilder.DropTable(
                name: "States");

            migrationBuilder.DropTable(
                name: "Industries");

            migrationBuilder.DropTable(
                name: "BusinessProfiles");

            migrationBuilder.DropTable(
                name: "BusinessIntelligenceReports");

            migrationBuilder.DropTable(
                name: "PathwaySteps");

            migrationBuilder.DropTable(
                name: "SavedSearches");

            migrationBuilder.DropTable(
                name: "TalentPools");

            migrationBuilder.DropTable(
                name: "MatchBreakdowns");

            migrationBuilder.DropTable(
                name: "ElectronicFootprints");

            migrationBuilder.DropTable(
                name: "Applications");

            migrationBuilder.DropTable(
                name: "PortfolioTemplates");

            migrationBuilder.DropTable(
                name: "CredentialVerifications");

            migrationBuilder.DropTable(
                name: "TalentProfiles");

            migrationBuilder.DropTable(
                name: "Countries");

            migrationBuilder.DropTable(
                name: "BusinessInformation");

            migrationBuilder.DropTable(
                name: "BusinessVerifications");

            migrationBuilder.DropTable(
                name: "FranchiseSettings");

            migrationBuilder.DropTable(
                name: "SubscriptionInfos");

            migrationBuilder.DropTable(
                name: "MarketIntelligences");

            migrationBuilder.DropTable(
                name: "ReputationMetrics");

            migrationBuilder.DropTable(
                name: "CareerPathways");

            migrationBuilder.DropTable(
                name: "Addresses");

            migrationBuilder.DropTable(
                name: "BrandGuidelines");

            migrationBuilder.DropTable(
                name: "SkillGapAnalyses");
        }
    }
}
