-- =====================================================
-- CREERLIO PLATFORM TABLES ONLY (73 tables)
-- PostgreSQL (Supabase)
-- SKIPS Identity tables (already exist)
-- Generated: 2025-11-24
-- =====================================================

-- =====================================================
-- MASTER DATA TABLES (13 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "Countries" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(100) NOT NULL,
    "Code" character varying(3) NOT NULL,
    "Code2" character varying(2) NOT NULL,
    "IsEmploymentMarket" boolean NOT NULL DEFAULT true,
    "IsMigrationMarket" boolean NOT NULL DEFAULT false,
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "States" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(100) NOT NULL,
    "Code" character varying(10) NOT NULL,
    "CountryId" uuid NOT NULL,
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "FK_States_Countries_CountryId" FOREIGN KEY ("CountryId") REFERENCES "Countries" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Cities" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(100) NOT NULL,
    "StateId" uuid NOT NULL,
    "Postcode" character varying(20),
    "Latitude" double precision,
    "Longitude" double precision,
    "Population" integer NOT NULL DEFAULT 0,
    "IsCapital" boolean NOT NULL DEFAULT false,
    "IsMajorCity" boolean NOT NULL DEFAULT false,
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "FK_Cities_States_StateId" FOREIGN KEY ("StateId") REFERENCES "States" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Industries" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(200) NOT NULL,
    "Description" character varying(500) NOT NULL DEFAULT '',
    "IconName" character varying(50) NOT NULL DEFAULT '',
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "JobCategories" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(200) NOT NULL,
    "IndustryId" uuid NOT NULL,
    "Description" character varying(500) NOT NULL DEFAULT '',
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "FK_JobCategories_Industries_IndustryId" FOREIGN KEY ("IndustryId") REFERENCES "Industries" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Universities" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(200) NOT NULL,
    "Abbreviation" character varying(50) NOT NULL DEFAULT '',
    "City" character varying(100) NOT NULL DEFAULT '',
    "StateCode" character varying(10) NOT NULL DEFAULT '',
    "WebsiteUrl" character varying(500) NOT NULL DEFAULT '',
    "IsGroupOfEight" boolean NOT NULL DEFAULT false,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "TAFEInstitutes" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(200) NOT NULL,
    "StateCode" character varying(10) NOT NULL DEFAULT '',
    "WebsiteUrl" character varying(500) NOT NULL DEFAULT '',
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "EducationLevels" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(200) NOT NULL,
    "Code" character varying(50) NOT NULL DEFAULT '',
    "Level" integer NOT NULL DEFAULT 0,
    "Description" character varying(500) NOT NULL DEFAULT '',
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "CredentialTypes" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(200) NOT NULL,
    "Category" character varying(100) NOT NULL,
    "SubCategory" character varying(100) NOT NULL DEFAULT '',
    "Description" character varying(1000) NOT NULL DEFAULT '',
    "RequiresRenewal" boolean NOT NULL DEFAULT false,
    "RenewalMonths" integer,
    "IssuingAuthority" character varying(500) NOT NULL DEFAULT '',
    "VerificationUrl" character varying(500) NOT NULL DEFAULT '',
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "VisaTypes" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(100) NOT NULL,
    "SubclassCode" character varying(20) NOT NULL DEFAULT '',
    "Category" character varying(100) NOT NULL,
    "Description" character varying(1000) NOT NULL DEFAULT '',
    "HasFullWorkRights" boolean NOT NULL DEFAULT false,
    "HasLimitedWorkRights" boolean NOT NULL DEFAULT false,
    "WorkHoursPerWeekLimit" integer,
    "AllowsEmployerSponsorship" boolean NOT NULL DEFAULT false,
    "PathwayToPermanentResidence" boolean NOT NULL DEFAULT false,
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SkillDefinitions" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(200) NOT NULL,
    "Category" character varying(100) NOT NULL,
    "SubCategory" character varying(100) NOT NULL DEFAULT '',
    "Description" character varying(1000) NOT NULL DEFAULT '',
    "Aliases" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "RelatedSkills" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "EmploymentTypes" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(100) NOT NULL,
    "Description" character varying(500) NOT NULL DEFAULT '',
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "WorkArrangements" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Name" character varying(100) NOT NULL,
    "Description" character varying(500) NOT NULL DEFAULT '',
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================================================
-- TALENT PROFILE TABLES (12 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "TalentProfiles" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "UserId" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "Headline" text NOT NULL DEFAULT '',
    "Summary" text NOT NULL DEFAULT '',
    "ProfileImageUrl" text NOT NULL DEFAULT '',
    "ProfileStatus" text NOT NULL DEFAULT 'Active',
    "IsPublic" boolean NOT NULL DEFAULT true,
    "Slug" text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "PersonalInformation" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "FirstName" text NOT NULL DEFAULT '',
    "LastName" text NOT NULL DEFAULT '',
    "Email" text NOT NULL DEFAULT '',
    "Phone" text NOT NULL DEFAULT '',
    "City" text NOT NULL DEFAULT '',
    "State" text NOT NULL DEFAULT '',
    "Country" text NOT NULL DEFAULT '',
    "PostalCode" text NOT NULL DEFAULT '',
    "LinkedInUrl" text NOT NULL DEFAULT '',
    "GitHubUrl" text NOT NULL DEFAULT '',
    "WebsiteUrl" text NOT NULL DEFAULT '',
    "DateOfBirth" timestamp with time zone,
    CONSTRAINT "FK_PersonalInformation_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "WorkExperiences" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Company" text NOT NULL DEFAULT '',
    "Title" text NOT NULL DEFAULT '',
    "Description" text NOT NULL DEFAULT '',
    "StartDate" timestamp with time zone NOT NULL,
    "EndDate" timestamp with time zone,
    "IsCurrentRole" boolean NOT NULL DEFAULT false,
    "Location" text NOT NULL DEFAULT '',
    "EmploymentType" text NOT NULL DEFAULT '',
    "Achievements" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Technologies" jsonb NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "FK_WorkExperiences_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Educations" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Institution" text NOT NULL DEFAULT '',
    "Degree" text NOT NULL DEFAULT '',
    "Field" text NOT NULL DEFAULT '',
    "StartDate" timestamp with time zone NOT NULL,
    "EndDate" timestamp with time zone,
    "GPA" double precision,
    "Description" text NOT NULL DEFAULT '',
    "Honors" jsonb NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "FK_Educations_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Skills" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Name" text NOT NULL DEFAULT '',
    "Category" text NOT NULL DEFAULT '',
    "ProficiencyLevel" integer NOT NULL DEFAULT 0,
    "YearsOfExperience" double precision NOT NULL DEFAULT 0,
    "EndorsementCount" integer NOT NULL DEFAULT 0,
    "LastUsed" timestamp with time zone,
    CONSTRAINT "FK_Skills_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Certifications" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Name" text NOT NULL DEFAULT '',
    "IssuingOrganization" text NOT NULL DEFAULT '',
    "IssueDate" timestamp with time zone NOT NULL,
    "ExpiryDate" timestamp with time zone,
    "CredentialId" text NOT NULL DEFAULT '',
    "CredentialUrl" text NOT NULL DEFAULT '',
    "IsVerified" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_Certifications_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "PortfolioItems" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Title" text NOT NULL DEFAULT '',
    "Description" text NOT NULL DEFAULT '',
    "Type" text NOT NULL DEFAULT '',
    "Url" text NOT NULL DEFAULT '',
    "Images" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Technologies" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "CompletionDate" timestamp with time zone,
    "DisplayOrder" integer NOT NULL DEFAULT 0,
    CONSTRAINT "FK_PortfolioItems_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Awards" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Title" text NOT NULL DEFAULT '',
    "Issuer" text NOT NULL DEFAULT '',
    "DateReceived" timestamp with time zone NOT NULL,
    "Description" text NOT NULL DEFAULT '',
    CONSTRAINT "FK_Awards_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "References" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Name" text NOT NULL DEFAULT '',
    "Title" text NOT NULL DEFAULT '',
    "Company" text NOT NULL DEFAULT '',
    "Email" text NOT NULL DEFAULT '',
    "Phone" text NOT NULL DEFAULT '',
    "Relationship" text NOT NULL DEFAULT '',
    "Testimonial" text NOT NULL DEFAULT '',
    "IsVerified" boolean NOT NULL DEFAULT false,
    "VerifiedAt" timestamp with time zone,
    CONSTRAINT "FK_References_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "CareerPreferences" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "PreferredRoles" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "PreferredIndustries" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "PreferredLocations" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "WorkModel" text NOT NULL DEFAULT '',
    "PreferredEmploymentTypes" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "ExpectedSalary" numeric(18,2),
    "Currency" text NOT NULL DEFAULT 'AUD',
    "OpenToRelocation" boolean NOT NULL DEFAULT false,
    "OpenToRemote" boolean NOT NULL DEFAULT true,
    "AvailableFrom" timestamp with time zone,
    "NoticePeriod" text NOT NULL DEFAULT '',
    CONSTRAINT "FK_CareerPreferences_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "PrivacySettings" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "ShowEmail" boolean NOT NULL DEFAULT false,
    "ShowPhone" boolean NOT NULL DEFAULT false,
    "ShowLocation" boolean NOT NULL DEFAULT true,
    "ShowSalaryExpectations" boolean NOT NULL DEFAULT false,
    "AllowContactFromRecruiters" boolean NOT NULL DEFAULT true,
    "ShowProfileInSearch" boolean NOT NULL DEFAULT true,
    "BlockedBusinessIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "FK_PrivacySettings_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "VerificationStatuses" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "EmailVerified" boolean NOT NULL DEFAULT false,
    "PhoneVerified" boolean NOT NULL DEFAULT false,
    "IdentityVerified" boolean NOT NULL DEFAULT false,
    "BackgroundCheckCompleted" boolean NOT NULL DEFAULT false,
    "LastVerificationDate" timestamp with time zone,
    "VerificationScore" integer NOT NULL DEFAULT 0,
    CONSTRAINT "FK_VerificationStatuses_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

-- =====================================================
-- PORTFOLIO TEMPLATE TABLES (5 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "PortfolioTemplates" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Name" text NOT NULL DEFAULT '',
    "TemplateName" text NOT NULL DEFAULT '',
    "ColorScheme" text NOT NULL DEFAULT '',
    "IsActive" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "FK_PortfolioTemplates_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "TemplateDesigns" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "PortfolioTemplateId" uuid NOT NULL,
    "PrimaryColor" text NOT NULL DEFAULT '',
    "SecondaryColor" text NOT NULL DEFAULT '',
    "AccentColor" text NOT NULL DEFAULT '',
    "FontFamily" text NOT NULL DEFAULT '',
    "FontSize" text NOT NULL DEFAULT '',
    "CustomCSS" text NOT NULL DEFAULT '',
    CONSTRAINT "FK_TemplateDesigns_PortfolioTemplates_PortfolioTemplateId" FOREIGN KEY ("PortfolioTemplateId") REFERENCES "PortfolioTemplates" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "PortfolioSections" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "PortfolioTemplateId" uuid NOT NULL,
    "Type" text NOT NULL DEFAULT '',
    "Title" text NOT NULL DEFAULT '',
    "IsVisible" boolean NOT NULL DEFAULT true,
    "DisplayOrder" integer NOT NULL DEFAULT 0,
    "Content" text NOT NULL DEFAULT '',
    CONSTRAINT "FK_PortfolioSections_PortfolioTemplates_PortfolioTemplateId" FOREIGN KEY ("PortfolioTemplateId") REFERENCES "PortfolioTemplates" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "PortfolioSharings" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "ShareToken" text NOT NULL DEFAULT '',
    "ShareUrl" text NOT NULL DEFAULT '',
    "IsPublic" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "ExpiresAt" timestamp with time zone,
    "ViewCount" integer NOT NULL DEFAULT 0,
    CONSTRAINT "FK_PortfolioSharings_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "BusinessAccesses" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "PortfolioSharingId" uuid NOT NULL,
    "BusinessProfileId" uuid NOT NULL,
    "GrantedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "ExpiresAt" timestamp with time zone,
    "CanDownload" boolean NOT NULL DEFAULT false,
    "CanContact" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_BusinessAccesses_PortfolioSharings_PortfolioSharingId" FOREIGN KEY ("PortfolioSharingId") REFERENCES "PortfolioSharings" ("Id") ON DELETE RESTRICT
);

-- =====================================================
-- BUSINESS PROFILE TABLES (12 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "BusinessProfiles" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "UserId" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "BusinessType" text NOT NULL DEFAULT 'Single',
    "ParentBusinessId" uuid
);

CREATE TABLE IF NOT EXISTS "BusinessInformation" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "LegalName" text NOT NULL DEFAULT '',
    "TradingName" text NOT NULL DEFAULT '',
    "ABN" text NOT NULL DEFAULT '',
    "ACN" text NOT NULL DEFAULT '',
    "Industry" text NOT NULL DEFAULT '',
    "Industries" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "CompanySize" text NOT NULL DEFAULT '',
    "EmployeeCount" integer NOT NULL DEFAULT 0,
    "Description" text NOT NULL DEFAULT '',
    "Mission" text NOT NULL DEFAULT '',
    "Values" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "LogoUrl" text NOT NULL DEFAULT '',
    "CoverImageUrl" text NOT NULL DEFAULT '',
    "WebsiteUrl" text NOT NULL DEFAULT '',
    "LinkedInUrl" text NOT NULL DEFAULT '',
    "FoundedDate" timestamp with time zone,
    "PrimaryEmail" text NOT NULL DEFAULT '',
    "PrimaryPhone" text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "Addresses" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Street" text NOT NULL DEFAULT '',
    "City" text NOT NULL DEFAULT '',
    "State" text NOT NULL DEFAULT '',
    "PostalCode" text NOT NULL DEFAULT '',
    "Country" text NOT NULL DEFAULT '',
    "Latitude" double precision,
    "Longitude" double precision
);

CREATE TABLE IF NOT EXISTS "Locations" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "BusinessProfileId" uuid NOT NULL,
    "Name" text NOT NULL DEFAULT '',
    "Type" text NOT NULL DEFAULT 'Office',
    "Phone" text NOT NULL DEFAULT '',
    "Email" text NOT NULL DEFAULT '',
    "IsPrimary" boolean NOT NULL DEFAULT false,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CanPostJobs" boolean NOT NULL DEFAULT true,
    "LocationManagerIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "CustomSettings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT "FK_Locations_BusinessProfiles_BusinessProfileId" FOREIGN KEY ("BusinessProfileId") REFERENCES "BusinessProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "FranchiseSettings" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "IsParent" boolean NOT NULL DEFAULT false,
    "FranchiseName" text NOT NULL DEFAULT '',
    "TotalFranchisees" integer NOT NULL DEFAULT 0,
    "FranchiseeIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "ShareTalentPool" boolean NOT NULL DEFAULT true,
    "ShareJobTemplates" boolean NOT NULL DEFAULT true,
    "CentralizedReporting" boolean NOT NULL DEFAULT true,
    "EnforceBrandGuidelines" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "BrandGuidelines" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "ApprovedColors" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "ApprovedFonts" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "LogoUrl" text NOT NULL DEFAULT '',
    "JobDescriptionTemplate" text NOT NULL DEFAULT '',
    "CommunicationTemplates" jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS "BusinessVerifications" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "ABNVerified" boolean NOT NULL DEFAULT false,
    "EmailVerified" boolean NOT NULL DEFAULT false,
    "PhoneVerified" boolean NOT NULL DEFAULT false,
    "WebsiteVerified" boolean NOT NULL DEFAULT false,
    "VerifiedDate" timestamp with time zone,
    "VerificationStatus" text NOT NULL DEFAULT 'Pending',
    "VerificationDocuments" jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS "SubscriptionInfos" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "PlanType" text NOT NULL DEFAULT 'Free',
    "SubscriptionStartDate" timestamp with time zone,
    "SubscriptionEndDate" timestamp with time zone,
    "IsActive" boolean NOT NULL DEFAULT true,
    "JobPostingLimit" integer NOT NULL DEFAULT 0,
    "JobPostingUsed" integer NOT NULL DEFAULT 0,
    "CanAccessAdvancedSearch" boolean NOT NULL DEFAULT false,
    "CanAccessAnalytics" boolean NOT NULL DEFAULT false,
    "CanAccessBusinessIntelligence" boolean NOT NULL DEFAULT false,
    "CanAccessATS" boolean NOT NULL DEFAULT false,
    "TeamMemberLimit" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "TeamMemberRatings" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "UserId" text NOT NULL DEFAULT '',
    "UserName" text NOT NULL DEFAULT '',
    "Rating" integer NOT NULL DEFAULT 0,
    "Feedback" text NOT NULL DEFAULT '',
    "RatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "MarketIntelligences" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "SkillDemand" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "SalaryTrends" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "TalentAvailability" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "EmergingSkills" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "InDemandRoles" jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS "CompetitorActivities" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "CompetitorName" text NOT NULL DEFAULT '',
    "Activity" text NOT NULL DEFAULT '',
    "DetectedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "Url" text NOT NULL DEFAULT '',
    "Impact" text NOT NULL DEFAULT 'Low'
);

CREATE TABLE IF NOT EXISTS "ReputationMetrics" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "OverallScore" numeric(5,2) NOT NULL DEFAULT 0,
    "ReviewCount" integer NOT NULL DEFAULT 0,
    "AverageRating" double precision NOT NULL DEFAULT 0,
    "SentimentBreakdown" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "RecentMentions" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Trend" text NOT NULL DEFAULT 'Stable'
);

-- =====================================================
-- JOB POSTING & ATS TABLES (5 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "JobPostings" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "BusinessProfileId" uuid NOT NULL,
    "LocationId" uuid,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "PublishedAt" timestamp with time zone,
    "ClosedAt" timestamp with time zone,
    "Title" text NOT NULL DEFAULT '',
    "Description" text NOT NULL DEFAULT '',
    "Responsibilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Requirements" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "PreferredQualifications" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "EmploymentType" text NOT NULL DEFAULT '',
    "WorkModel" text NOT NULL DEFAULT 'Office',
    "ExperienceLevel" text NOT NULL DEFAULT '',
    "MinSalary" numeric(18,2),
    "MaxSalary" numeric(18,2),
    "SalaryCurrency" text NOT NULL DEFAULT 'AUD',
    "SalaryPeriod" text NOT NULL DEFAULT 'Year',
    "ShowSalary" boolean NOT NULL DEFAULT false,
    "Benefits" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "RequiredSkills" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "PreferredSkills" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Category" text NOT NULL DEFAULT '',
    "Industry" text NOT NULL DEFAULT '',
    "Status" text NOT NULL DEFAULT 'Draft',
    "ApplicationCount" integer NOT NULL DEFAULT 0,
    "ViewCount" integer NOT NULL DEFAULT 0,
    "AcceptApplications" boolean NOT NULL DEFAULT true,
    "ApplicationMethod" text NOT NULL DEFAULT 'Platform',
    "ExternalApplicationUrl" text NOT NULL DEFAULT '',
    "AIGenerated" boolean NOT NULL DEFAULT false,
    "ComplianceChecked" boolean NOT NULL DEFAULT false,
    "ComplianceIssues" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "AIMatchThreshold" integer NOT NULL DEFAULT 70,
    "SEOTitle" text NOT NULL DEFAULT '',
    "SEODescription" text NOT NULL DEFAULT '',
    "PostToSEEK" boolean NOT NULL DEFAULT false,
    "SEEKJobId" text NOT NULL DEFAULT '',
    CONSTRAINT "FK_JobPostings_BusinessProfiles_BusinessProfileId" FOREIGN KEY ("BusinessProfileId") REFERENCES "BusinessProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Applications" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "JobPostingId" uuid NOT NULL,
    "TalentProfileId" uuid NOT NULL,
    "AppliedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "Status" text NOT NULL DEFAULT 'New',
    "Stage" text NOT NULL DEFAULT 'Application',
    "AIMatchScore" integer NOT NULL DEFAULT 0,
    "CoverLetter" text NOT NULL DEFAULT '',
    "AttachmentUrls" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "SharedPortfolioId" uuid,
    "Tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Rating" integer NOT NULL DEFAULT 0,
    "AssignedReviewers" jsonb NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "FK_Applications_JobPostings_JobPostingId" FOREIGN KEY ("JobPostingId") REFERENCES "JobPostings" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Applications_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "ApplicationNotes" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "AuthorId" text NOT NULL DEFAULT '',
    "AuthorName" text NOT NULL DEFAULT '',
    "Content" text NOT NULL DEFAULT '',
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "IsPrivate" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "ApplicationActivities" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Type" text NOT NULL DEFAULT '',
    "Description" text NOT NULL DEFAULT '',
    "PerformedBy" text NOT NULL DEFAULT '',
    "Timestamp" timestamp with time zone NOT NULL DEFAULT now(),
    "Metadata" jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS "Interviews" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "ScheduledTime" timestamp with time zone NOT NULL,
    "DurationMinutes" integer NOT NULL DEFAULT 0,
    "Type" text NOT NULL DEFAULT 'Video',
    "Location" text NOT NULL DEFAULT '',
    "MeetingUrl" text NOT NULL DEFAULT '',
    "InterviewerIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Status" text NOT NULL DEFAULT 'Scheduled',
    "Notes" text NOT NULL DEFAULT '',
    "Rating" integer
);

-- =====================================================
-- BUSINESS INTELLIGENCE TABLES (3 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "BusinessIntelligenceReports" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "BusinessProfileId" uuid NOT NULL,
    "GeneratedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "ReportType" text NOT NULL DEFAULT '',
    "Scope" text NOT NULL DEFAULT 'Company',
    CONSTRAINT "FK_BusinessIntelligenceReports_BusinessProfiles_BusinessProfileId" FOREIGN KEY ("BusinessProfileId") REFERENCES "BusinessProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "OpportunityAlerts" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "Type" text NOT NULL DEFAULT '',
    "Title" text NOT NULL DEFAULT '',
    "Description" text NOT NULL DEFAULT '',
    "Priority" text NOT NULL DEFAULT 'Low',
    "DetectedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "ActionUrl" text NOT NULL DEFAULT '',
    "IsRead" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "RecruitmentAnalytics" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "BusinessProfileId" uuid NOT NULL,
    "PeriodStart" timestamp with time zone NOT NULL,
    "PeriodEnd" timestamp with time zone NOT NULL,
    "TotalJobsPosted" integer NOT NULL DEFAULT 0,
    "TotalApplications" integer NOT NULL DEFAULT 0,
    "TotalHires" integer NOT NULL DEFAULT 0,
    "AverageTimeToHire" double precision NOT NULL DEFAULT 0,
    "AverageCostPerHire" numeric(18,2) NOT NULL DEFAULT 0,
    "ApplicationQualityScore" double precision NOT NULL DEFAULT 0,
    "ApplicationsBySource" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "HiresBySource" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "DiversityMetrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "ApplicationsReceived" integer NOT NULL DEFAULT 0,
    "ApplicationsReviewed" integer NOT NULL DEFAULT 0,
    "CandidatesShortlisted" integer NOT NULL DEFAULT 0,
    "InterviewsConducted" integer NOT NULL DEFAULT 0,
    "OffersExtended" integer NOT NULL DEFAULT 0,
    "OffersAccepted" integer NOT NULL DEFAULT 0,
    "IndustryBenchmarks" jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT "FK_RecruitmentAnalytics_BusinessProfiles_BusinessProfileId" FOREIGN KEY ("BusinessProfileId") REFERENCES "BusinessProfiles" ("Id") ON DELETE RESTRICT
);

-- =====================================================
-- CAREER PATHWAY TABLES (7 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "CareerPathways" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "CurrentRole" text NOT NULL DEFAULT '',
    "TargetRole" text NOT NULL DEFAULT '',
    "Industry" text NOT NULL DEFAULT '',
    "EstimatedTimelineMonths" integer NOT NULL DEFAULT 0,
    "EstimatedCost" numeric(18,2) NOT NULL DEFAULT 0,
    "Currency" text NOT NULL DEFAULT 'AUD',
    "CompletionPercentage" integer NOT NULL DEFAULT 0,
    "TargetCompletionDate" timestamp with time zone,
    "Status" text NOT NULL DEFAULT 'Active',
    "IsAIGenerated" boolean NOT NULL DEFAULT false,
    "LastAIUpdateDate" timestamp with time zone,
    CONSTRAINT "FK_CareerPathways_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "PathwaySteps" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "PathwayId" uuid NOT NULL,
    "StepNumber" integer NOT NULL DEFAULT 0,
    "Type" text NOT NULL DEFAULT '',
    "Title" text NOT NULL DEFAULT '',
    "Description" text NOT NULL DEFAULT '',
    "DurationMonths" integer NOT NULL DEFAULT 0,
    "EstimatedCost" numeric(18,2) NOT NULL DEFAULT 0,
    "Status" text NOT NULL DEFAULT 'NotStarted',
    "StartedDate" timestamp with time zone,
    "CompletedDate" timestamp with time zone,
    "CompletionPercentage" integer NOT NULL DEFAULT 0,
    "Prerequisites" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "SkillsToAcquire" jsonb NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "FK_PathwaySteps_CareerPathways_PathwayId" FOREIGN KEY ("PathwayId") REFERENCES "CareerPathways" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "PathwayResources" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "StepId" uuid NOT NULL,
    "Type" text NOT NULL DEFAULT '',
    "Title" text NOT NULL DEFAULT '',
    "Provider" text NOT NULL DEFAULT '',
    "Url" text NOT NULL DEFAULT '',
    "Cost" numeric(18,2),
    "DurationHours" integer,
    "Rating" double precision,
    "IsCompleted" boolean NOT NULL DEFAULT false,
    "CompletedDate" timestamp with time zone,
    CONSTRAINT "FK_PathwayResources_PathwaySteps_StepId" FOREIGN KEY ("StepId") REFERENCES "PathwaySteps" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Milestones" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "PathwayId" uuid NOT NULL,
    "Title" text NOT NULL DEFAULT '',
    "Description" text NOT NULL DEFAULT '',
    "TargetDate" timestamp with time zone NOT NULL,
    "IsCompleted" boolean NOT NULL DEFAULT false,
    "CompletedDate" timestamp with time zone,
    CONSTRAINT "FK_Milestones_CareerPathways_PathwayId" FOREIGN KEY ("PathwayId") REFERENCES "CareerPathways" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "SkillGapAnalyses" (
    "PathwayId" uuid PRIMARY KEY NOT NULL,
    "AnalysisDate" timestamp with time zone NOT NULL DEFAULT now(),
    "MissingSkills" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "SkillsToImprove" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "OverallReadinessScore" integer NOT NULL DEFAULT 0,
    CONSTRAINT "FK_SkillGapAnalyses_CareerPathways_PathwayId" FOREIGN KEY ("PathwayId") REFERENCES "CareerPathways" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "SkillGaps" (
    "PathwayId" uuid NOT NULL,
    "SkillName" text NOT NULL,
    "CurrentLevel" integer NOT NULL DEFAULT 0,
    "RequiredLevel" integer NOT NULL DEFAULT 0,
    "GapSize" integer NOT NULL DEFAULT 0,
    "Priority" text NOT NULL DEFAULT 'Medium',
    "EstimatedTimeToAcquireMonths" integer NOT NULL DEFAULT 0,
    "RecommendedCourses" jsonb NOT NULL DEFAULT '[]'::jsonb,
    PRIMARY KEY ("PathwayId", "SkillName"),
    CONSTRAINT "FK_SkillGaps_CareerPathways_PathwayId" FOREIGN KEY ("PathwayId") REFERENCES "CareerPathways" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "PathwayRecommendations" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Type" text NOT NULL DEFAULT '',
    "Title" text NOT NULL DEFAULT '',
    "Description" text NOT NULL DEFAULT '',
    "Reason" text NOT NULL DEFAULT '',
    "ConfidenceScore" integer NOT NULL DEFAULT 0,
    "IsApplied" boolean NOT NULL DEFAULT false,
    "GeneratedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "FK_PathwayRecommendations_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

-- =====================================================
-- AI MATCHING TABLES (3 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "JobMatches" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "JobPostingId" uuid NOT NULL,
    "CalculatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "MatchScore" integer NOT NULL DEFAULT 0,
    "MatchQuality" text NOT NULL DEFAULT 'Good',
    "MatchExplanation" text NOT NULL DEFAULT '',
    "MatchReasons" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Concerns" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "IsViewed" boolean NOT NULL DEFAULT false,
    "IsApplied" boolean NOT NULL DEFAULT false,
    "IsSaved" boolean NOT NULL DEFAULT false,
    "IsHidden" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_JobMatches_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_JobMatches_JobPostings_JobPostingId" FOREIGN KEY ("JobPostingId") REFERENCES "JobPostings" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "MatchBreakdowns" (
    "MatchId" uuid PRIMARY KEY NOT NULL,
    "SkillsMatchScore" integer NOT NULL DEFAULT 0,
    "ExperienceMatchScore" integer NOT NULL DEFAULT 0,
    "EducationMatchScore" integer NOT NULL DEFAULT 0,
    "LocationMatchScore" integer NOT NULL DEFAULT 0,
    "SalaryMatchScore" integer NOT NULL DEFAULT 0,
    "CultureFitScore" integer NOT NULL DEFAULT 0,
    "CareerGrowthScore" integer NOT NULL DEFAULT 0,
    "MissingSkills" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "BonusSkills" jsonb NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "FK_MatchBreakdowns_JobMatches_MatchId" FOREIGN KEY ("MatchId") REFERENCES "JobMatches" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "SkillMatches" (
    "MatchId" uuid NOT NULL,
    "SkillName" text NOT NULL,
    "IsRequired" boolean NOT NULL DEFAULT false,
    "HasSkill" boolean NOT NULL DEFAULT false,
    "TalentProficiency" integer NOT NULL DEFAULT 0,
    "RequiredProficiency" integer NOT NULL DEFAULT 0,
    "YearsExperience" integer NOT NULL DEFAULT 0,
    PRIMARY KEY ("MatchId", "SkillName"),
    CONSTRAINT "FK_SkillMatches_JobMatches_MatchId" FOREIGN KEY ("MatchId") REFERENCES "JobMatches" ("Id") ON DELETE RESTRICT
);

-- =====================================================
-- ELECTRONIC FOOTPRINT TABLES (8 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "ElectronicFootprints" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "LastScannedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "NextScanAt" timestamp with time zone NOT NULL,
    "CredibilityScore" integer NOT NULL DEFAULT 0,
    "VisibilityScore" integer NOT NULL DEFAULT 0,
    "ReputationScore" integer NOT NULL DEFAULT 0,
    CONSTRAINT "FK_ElectronicFootprints_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "NewsMentions" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Title" text NOT NULL DEFAULT '',
    "Source" text NOT NULL DEFAULT '',
    "Url" text NOT NULL DEFAULT '',
    "PublishedDate" timestamp with time zone NOT NULL,
    "Sentiment" text NOT NULL DEFAULT 'Neutral',
    "Excerpt" text NOT NULL DEFAULT '',
    "IsVerified" boolean NOT NULL DEFAULT false,
    "AddedToProfile" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_NewsMentions_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "SocialMediaPosts" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Platform" text NOT NULL DEFAULT '',
    "PostUrl" text NOT NULL DEFAULT '',
    "Content" text NOT NULL DEFAULT '',
    "PostedDate" timestamp with time zone NOT NULL,
    "EngagementScore" integer NOT NULL DEFAULT 0,
    "Sentiment" text NOT NULL DEFAULT 'Neutral',
    "IsRelevant" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_SocialMediaPosts_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "GitHubActivities" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "RepositoryName" text NOT NULL DEFAULT '',
    "RepositoryUrl" text NOT NULL DEFAULT '',
    "ActivityType" text NOT NULL DEFAULT '',
    "ActivityDate" timestamp with time zone NOT NULL,
    "Stars" integer NOT NULL DEFAULT 0,
    "Forks" integer NOT NULL DEFAULT 0,
    "Languages" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Topics" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "IsFeatured" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_GitHubActivities_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Publications" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Title" text NOT NULL DEFAULT '',
    "Publisher" text NOT NULL DEFAULT '',
    "PublishedDate" timestamp with time zone NOT NULL,
    "Url" text NOT NULL DEFAULT '',
    "CoAuthors" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Citations" integer NOT NULL DEFAULT 0,
    "AddedToProfile" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_Publications_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "SpeakingEngagements" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "EventName" text NOT NULL DEFAULT '',
    "Topic" text NOT NULL DEFAULT '',
    "EventDate" timestamp with time zone NOT NULL,
    "EventUrl" text NOT NULL DEFAULT '',
    "VideoUrl" text NOT NULL DEFAULT '',
    "Attendees" integer NOT NULL DEFAULT 0,
    "AddedToProfile" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_SpeakingEngagements_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "AwardRecognitions" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Title" text NOT NULL DEFAULT '',
    "Issuer" text NOT NULL DEFAULT '',
    "Date" timestamp with time zone NOT NULL,
    "Url" text NOT NULL DEFAULT '',
    "IsVerified" boolean NOT NULL DEFAULT false,
    "AddedToProfile" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_AwardRecognitions_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "FootprintAlerts" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Type" text NOT NULL DEFAULT '',
    "Title" text NOT NULL DEFAULT '',
    "Description" text NOT NULL DEFAULT '',
    "Severity" text NOT NULL DEFAULT 'Info',
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "IsRead" boolean NOT NULL DEFAULT false,
    "ActionUrl" text NOT NULL DEFAULT '',
    CONSTRAINT "FK_FootprintAlerts_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

-- =====================================================
-- CREDENTIAL VERIFICATION TABLES (2 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "CredentialVerifications" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "ItemType" text NOT NULL DEFAULT '',
    "ItemId" uuid NOT NULL,
    "InitiatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "CompletedAt" timestamp with time zone,
    "Status" text NOT NULL DEFAULT 'Pending',
    "ConfidenceScore" integer NOT NULL DEFAULT 0,
    "VerificationMethod" text NOT NULL DEFAULT '',
    "IsVerified" boolean NOT NULL DEFAULT false,
    "VerificationFlags" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Notes" text NOT NULL DEFAULT '',
    "TimelineConsistent" boolean NOT NULL DEFAULT false,
    "TimelineIssues" jsonb NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "FK_CredentialVerifications_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "VerificationSources" (
    "VerificationId" uuid NOT NULL,
    "Source" text NOT NULL,
    "Type" text NOT NULL DEFAULT '',
    "IsVerified" boolean NOT NULL DEFAULT false,
    "ConfidenceScore" integer NOT NULL DEFAULT 0,
    "CheckedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "VerifiedData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY ("VerificationId", "Source"),
    CONSTRAINT "FK_VerificationSources_CredentialVerifications_VerificationId" FOREIGN KEY ("VerificationId") REFERENCES "CredentialVerifications" ("Id") ON DELETE RESTRICT
);

-- =====================================================
-- SEARCH & DISCOVERY TABLES (3 tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS "SavedSearches" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "TalentProfileId" uuid NOT NULL,
    "Name" text NOT NULL DEFAULT '',
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "IsActive" boolean NOT NULL DEFAULT true,
    "AlertsEnabled" boolean NOT NULL DEFAULT false,
    "AlertFrequency" text NOT NULL DEFAULT 'Daily',
    "NewResultsCount" integer NOT NULL DEFAULT 0,
    "LastAlertSent" timestamp with time zone,
    CONSTRAINT "FK_SavedSearches_TalentProfiles_TalentProfileId" FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "SearchCriterias" (
    "SavedSearchId" uuid NOT NULL,
    "TalentPoolId" uuid NOT NULL,
    "Keywords" text NOT NULL DEFAULT '',
    "Locations" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "MinSalary" numeric(18,2),
    "MaxSalary" numeric(18,2),
    "EmploymentTypes" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Industries" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "CompanySizes" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "RemoteOnly" boolean NOT NULL DEFAULT false,
    "MinMatchScore" integer,
    "RequiredSkills" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "Benefits" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "PostedAfter" timestamp with time zone,
    PRIMARY KEY ("SavedSearchId", "TalentPoolId")
);

CREATE TABLE IF NOT EXISTS "TalentPools" (
    "Id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    "BusinessProfileId" uuid NOT NULL,
    "Name" text NOT NULL DEFAULT '',
    "Description" text NOT NULL DEFAULT '',
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "TalentProfileIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "AutoPopulateEnabled" boolean NOT NULL DEFAULT false,
    "IsShared" boolean NOT NULL DEFAULT false,
    "SharedWithBusinessIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "FK_TalentPools_BusinessProfiles_BusinessProfileId" FOREIGN KEY ("BusinessProfileId") REFERENCES "BusinessProfiles" ("Id") ON DELETE RESTRICT
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Master data indexes (skip if already exist from previous 36-table schema)
CREATE INDEX IF NOT EXISTS "IX_Countries_Name" ON "Countries" ("Name");
CREATE INDEX IF NOT EXISTS "IX_Countries_Code" ON "Countries" ("Code");
CREATE INDEX IF NOT EXISTS "IX_States_CountryId_Code" ON "States" ("CountryId", "Code");
CREATE INDEX IF NOT EXISTS "IX_States_Name" ON "States" ("Name");
CREATE INDEX IF NOT EXISTS "IX_Cities_StateId_Name" ON "Cities" ("StateId", "Name");
CREATE INDEX IF NOT EXISTS "IX_Cities_Postcode" ON "Cities" ("Postcode");
CREATE INDEX IF NOT EXISTS "IX_Cities_Latitude_Longitude" ON "Cities" ("Latitude", "Longitude");
CREATE INDEX IF NOT EXISTS "IX_Industries_Name" ON "Industries" ("Name");
CREATE INDEX IF NOT EXISTS "IX_JobCategories_IndustryId_Name" ON "JobCategories" ("IndustryId", "Name");
CREATE INDEX IF NOT EXISTS "IX_Universities_Name" ON "Universities" ("Name");
CREATE INDEX IF NOT EXISTS "IX_TAFEInstitutes_Name" ON "TAFEInstitutes" ("Name");
CREATE INDEX IF NOT EXISTS "IX_CredentialTypes_Category_Name" ON "CredentialTypes" ("Category", "Name");
CREATE INDEX IF NOT EXISTS "IX_VisaTypes_SubclassCode" ON "VisaTypes" ("SubclassCode");
CREATE INDEX IF NOT EXISTS "IX_SkillDefinitions_Category_Name" ON "SkillDefinitions" ("Category", "Name");

-- Talent profile indexes
CREATE UNIQUE INDEX IF NOT EXISTS "IX_TalentProfiles_UserId" ON "TalentProfiles" ("UserId");

-- Business profile indexes
CREATE UNIQUE INDEX IF NOT EXISTS "IX_BusinessProfiles_UserId" ON "BusinessProfiles" ("UserId");

-- Job matching indexes
CREATE UNIQUE INDEX IF NOT EXISTS "IX_JobMatches_TalentProfileId_JobPostingId" ON "JobMatches" ("TalentProfileId", "JobPostingId");
CREATE INDEX IF NOT EXISTS "IX_JobMatches_TalentProfileId_MatchScore" ON "JobMatches" ("TalentProfileId", "MatchScore");

-- Electronic footprint indexes
CREATE UNIQUE INDEX IF NOT EXISTS "IX_ElectronicFootprints_TalentProfileId" ON "ElectronicFootprints" ("TalentProfileId");

-- Application indexes
CREATE INDEX IF NOT EXISTS "IX_Applications_JobPostingId_Status" ON "Applications" ("JobPostingId", "Status");
CREATE INDEX IF NOT EXISTS "IX_Applications_TalentProfileId" ON "Applications" ("TalentProfileId");

-- Job posting indexes
CREATE INDEX IF NOT EXISTS "IX_JobPostings_BusinessProfileId_Status" ON "JobPostings" ("BusinessProfileId", "Status");

-- Career pathway indexes
CREATE INDEX IF NOT EXISTS "IX_CareerPathways_TalentProfileId" ON "CareerPathways" ("TalentProfileId");

-- Search indexes
CREATE INDEX IF NOT EXISTS "IX_SavedSearches_TalentProfileId" ON "SavedSearches" ("TalentProfileId");
CREATE INDEX IF NOT EXISTS "IX_TalentPools_BusinessProfileId" ON "TalentPools" ("BusinessProfileId");

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Run this after deployment to verify table count:
-- SELECT COUNT(*) as table_count FROM pg_tables WHERE schemaname = 'public';
-- Expected: 80 tables total (7 Identity + 73 Platform)

-- =====================================================
-- END OF SCHEMA
-- =====================================================
