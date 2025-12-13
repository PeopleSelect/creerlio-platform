-- Creerlio Platform Database Schema for Supabase PostgreSQL
-- Generated from EF Core Migrations
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- IDENTITY TABLES (ASP.NET Core Identity)
-- =====================================================

CREATE TABLE "AspNetRoles" (
    "Id" VARCHAR(450) PRIMARY KEY,
    "Name" VARCHAR(256),
    "NormalizedName" VARCHAR(256),
    "ConcurrencyStamp" TEXT
);

CREATE TABLE "AspNetUsers" (
    "Id" VARCHAR(450) PRIMARY KEY,
    "UserType" TEXT NOT NULL,
    "FirstName" TEXT NOT NULL,
    "LastName" TEXT NOT NULL,
    "UserName" VARCHAR(256),
    "NormalizedUserName" VARCHAR(256),
    "Email" VARCHAR(256),
    "NormalizedEmail" VARCHAR(256),
    "EmailConfirmed" BOOLEAN NOT NULL,
    "PasswordHash" TEXT,
    "SecurityStamp" TEXT,
    "ConcurrencyStamp" TEXT,
    "PhoneNumber" TEXT,
    "PhoneNumberConfirmed" BOOLEAN NOT NULL,
    "TwoFactorEnabled" BOOLEAN NOT NULL,
    "LockoutEnd" TIMESTAMPTZ,
    "LockoutEnabled" BOOLEAN NOT NULL,
    "AccessFailedCount" INT NOT NULL
);

CREATE TABLE "AspNetRoleClaims" (
    "Id" SERIAL PRIMARY KEY,
    "RoleId" VARCHAR(450) NOT NULL,
    "ClaimType" TEXT,
    "ClaimValue" TEXT,
    FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles"("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserClaims" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" VARCHAR(450) NOT NULL,
    "ClaimType" TEXT,
    "ClaimValue" TEXT,
    FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserLogins" (
    "LoginProvider" VARCHAR(450) NOT NULL,
    "ProviderKey" VARCHAR(450) NOT NULL,
    "ProviderDisplayName" TEXT,
    "UserId" VARCHAR(450) NOT NULL,
    PRIMARY KEY ("LoginProvider", "ProviderKey"),
    FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserRoles" (
    "UserId" VARCHAR(450) NOT NULL,
    "RoleId" VARCHAR(450) NOT NULL,
    PRIMARY KEY ("UserId", "RoleId"),
    FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles"("Id") ON DELETE CASCADE,
    FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserTokens" (
    "UserId" VARCHAR(450) NOT NULL,
    "LoginProvider" VARCHAR(450) NOT NULL,
    "Name" VARCHAR(450) NOT NULL,
    "Value" TEXT,
    PRIMARY KEY ("UserId", "LoginProvider", "Name"),
    FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
);

-- Create indexes for Identity tables
CREATE INDEX "IX_AspNetRoleClaims_RoleId" ON "AspNetRoleClaims"("RoleId");
CREATE UNIQUE INDEX "RoleNameIndex" ON "AspNetRoles"("NormalizedName");
CREATE INDEX "IX_AspNetUserClaims_UserId" ON "AspNetUserClaims"("UserId");
CREATE INDEX "IX_AspNetUserLogins_UserId" ON "AspNetUserLogins"("UserId");
CREATE INDEX "IX_AspNetUserRoles_RoleId" ON "AspNetUserRoles"("RoleId");
CREATE INDEX "EmailIndex" ON "AspNetUsers"("NormalizedEmail");
CREATE UNIQUE INDEX "UserNameIndex" ON "AspNetUsers"("NormalizedUserName");

-- =====================================================
-- MASTER DATA TABLES
-- =====================================================

CREATE TABLE "Countries" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(100) NOT NULL,
    "Code" VARCHAR(3) NOT NULL,
    "Code2" VARCHAR(2) NOT NULL,
    "IsEmploymentMarket" BOOLEAN NOT NULL,
    "IsMigrationMarket" BOOLEAN NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "States" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(100) NOT NULL,
    "Code" VARCHAR(10) NOT NULL,
    "CountryId" UUID NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("CountryId") REFERENCES "Countries"("Id") ON DELETE RESTRICT
);

CREATE TABLE "Cities" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(100) NOT NULL,
    "StateId" UUID NOT NULL,
    "Population" INT NOT NULL,
    "IsCapital" BOOLEAN NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("StateId") REFERENCES "States"("Id") ON DELETE RESTRICT
);

CREATE TABLE "Industries" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(500) NOT NULL,
    "IconName" VARCHAR(50) NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "JobCategories" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(200) NOT NULL,
    "IndustryId" UUID NOT NULL,
    "Description" VARCHAR(500) NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("IndustryId") REFERENCES "Industries"("Id") ON DELETE RESTRICT
);

CREATE TABLE "Universities" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(200) NOT NULL,
    "Abbreviation" VARCHAR(50) NOT NULL,
    "City" VARCHAR(100) NOT NULL,
    "StateCode" VARCHAR(10) NOT NULL,
    "WebsiteUrl" VARCHAR(500) NOT NULL,
    "IsGroupOfEight" BOOLEAN NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TAFEInstitutes" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(200) NOT NULL,
    "StateCode" VARCHAR(10) NOT NULL,
    "WebsiteUrl" VARCHAR(500) NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "EducationLevels" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(200) NOT NULL,
    "Code" VARCHAR(50) NOT NULL,
    "Level" INT NOT NULL,
    "Description" VARCHAR(500) NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CredentialTypes" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(200) NOT NULL,
    "Category" VARCHAR(100) NOT NULL,
    "SubCategory" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(1000) NOT NULL,
    "RequiresRenewal" BOOLEAN NOT NULL,
    "RenewalMonths" INT,
    "IssuingAuthority" VARCHAR(500) NOT NULL,
    "VerificationUrl" VARCHAR(500) NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "VisaTypes" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(100) NOT NULL,
    "SubclassCode" VARCHAR(20) NOT NULL,
    "Category" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(1000) NOT NULL,
    "HasFullWorkRights" BOOLEAN NOT NULL,
    "HasLimitedWorkRights" BOOLEAN NOT NULL,
    "WorkHoursPerWeekLimit" INT,
    "AllowsEmployerSponsorship" BOOLEAN NOT NULL,
    "PathwayToPermanentResidence" BOOLEAN NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SkillDefinitions" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(200) NOT NULL,
    "Category" VARCHAR(100) NOT NULL,
    "SubCategory" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(1000) NOT NULL,
    "Aliases" TEXT NOT NULL,
    "RelatedSkills" TEXT NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "EmploymentTypes" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500) NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WorkArrangements" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500) NOT NULL,
    "SortOrder" INT NOT NULL,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CORE APPLICATION TABLES
-- =====================================================

CREATE TABLE "TalentProfiles" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "UserId" UUID NOT NULL,
    "LastName" TEXT NOT NULL,
    "PreferredName" TEXT,
    "Bio" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "Phone" TEXT,
    "LinkedInUrl" TEXT,
    "GitHubUrl" TEXT,
    "PortfolioUrl" TEXT,
    "Skills" TEXT NOT NULL,
    "Experience" TEXT NOT NULL,
    "Education" TEXT NOT NULL,
    "Resume" TEXT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "BusinessProfiles" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "UserId" UUID NOT NULL,
    "CompanyName" TEXT NOT NULL,
    "Industry" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "Website" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Jobs" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "BusinessProfileId" UUID NOT NULL,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "Requirements" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "Salary" TEXT,
    "IsActive" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("BusinessProfileId") REFERENCES "BusinessProfiles"("Id") ON DELETE CASCADE
);

CREATE TABLE "Applications" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "TalentProfileId" UUID NOT NULL,
    "JobId" UUID NOT NULL,
    "Status" TEXT NOT NULL,
    "CoverLetter" TEXT,
    "AppliedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("TalentProfileId") REFERENCES "TalentProfiles"("Id") ON DELETE CASCADE,
    FOREIGN KEY ("JobId") REFERENCES "Jobs"("Id") ON DELETE CASCADE
);

-- Create indexes for foreign keys
CREATE INDEX "IX_States_CountryId" ON "States"("CountryId");
CREATE INDEX "IX_Cities_StateId" ON "Cities"("StateId");
CREATE INDEX "IX_JobCategories_IndustryId" ON "JobCategories"("IndustryId");
CREATE INDEX "IX_Jobs_BusinessProfileId" ON "Jobs"("BusinessProfileId");
CREATE INDEX "IX_Applications_TalentProfileId" ON "Applications"("TalentProfileId");
CREATE INDEX "IX_Applications_JobId" ON "Applications"("JobId");

-- =====================================================
-- EF CORE MIGRATIONS HISTORY TABLE
-- =====================================================

CREATE TABLE "__EFMigrationsHistory" (
    "MigrationId" VARCHAR(150) PRIMARY KEY,
    "ProductVersion" VARCHAR(32) NOT NULL
);

-- Record migrations
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES
('20251123031733_InitialIdentity', '8.0.0'),
('20251123031530_AdvancedFeatures', '8.0.0'),
('20251123075729_ComprehensiveModel', '8.0.0'),
('20251123204922_MasterDataTables', '8.0.0');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Schema created successfully! Tables: %, %, %, %, %',
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'AspNet%'),
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Countries', 'States', 'Cities', 'Industries')),
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('TalentProfiles', 'BusinessProfiles', 'Jobs', 'Applications')),
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
        'total';
END $$;
