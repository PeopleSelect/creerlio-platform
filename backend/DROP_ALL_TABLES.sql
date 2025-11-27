-- =====================================================
-- DROP ALL EXISTING TABLES
-- Run this FIRST if you need to clean up before deploying the complete schema
-- WARNING: This will DELETE ALL DATA in these tables!
-- =====================================================

-- Drop tables in reverse dependency order to avoid FK constraint violations

-- Search & Discovery
DROP TABLE IF EXISTS "SearchCriterias" CASCADE;
DROP TABLE IF EXISTS "TalentPools" CASCADE;
DROP TABLE IF EXISTS "SavedSearches" CASCADE;

-- Credential Verification
DROP TABLE IF EXISTS "VerificationSources" CASCADE;
DROP TABLE IF EXISTS "CredentialVerifications" CASCADE;

-- Electronic Footprint
DROP TABLE IF EXISTS "FootprintAlerts" CASCADE;
DROP TABLE IF EXISTS "AwardRecognitions" CASCADE;
DROP TABLE IF EXISTS "SpeakingEngagements" CASCADE;
DROP TABLE IF EXISTS "Publications" CASCADE;
DROP TABLE IF EXISTS "GitHubActivities" CASCADE;
DROP TABLE IF EXISTS "SocialMediaPosts" CASCADE;
DROP TABLE IF EXISTS "NewsMentions" CASCADE;
DROP TABLE IF EXISTS "ElectronicFootprints" CASCADE;

-- AI Matching
DROP TABLE IF EXISTS "SkillMatches" CASCADE;
DROP TABLE IF EXISTS "MatchBreakdowns" CASCADE;
DROP TABLE IF EXISTS "JobMatches" CASCADE;

-- Career Pathway Planning
DROP TABLE IF EXISTS "PathwayRecommendations" CASCADE;
DROP TABLE IF EXISTS "SkillGaps" CASCADE;
DROP TABLE IF EXISTS "SkillGapAnalyses" CASCADE;
DROP TABLE IF EXISTS "Milestones" CASCADE;
DROP TABLE IF EXISTS "PathwayResources" CASCADE;
DROP TABLE IF EXISTS "PathwaySteps" CASCADE;
DROP TABLE IF EXISTS "CareerPathways" CASCADE;

-- Business Intelligence
DROP TABLE IF EXISTS "RecruitmentAnalytics" CASCADE;
DROP TABLE IF EXISTS "OpportunityAlerts" CASCADE;
DROP TABLE IF EXISTS "BusinessIntelligenceReports" CASCADE;

-- Job Posting & ATS
DROP TABLE IF EXISTS "Interviews" CASCADE;
DROP TABLE IF EXISTS "ApplicationActivities" CASCADE;
DROP TABLE IF EXISTS "ApplicationNotes" CASCADE;
DROP TABLE IF EXISTS "Applications" CASCADE;
DROP TABLE IF EXISTS "JobPostings" CASCADE;

-- Business Profile System
DROP TABLE IF EXISTS "ReputationMetrics" CASCADE;
DROP TABLE IF EXISTS "CompetitorActivities" CASCADE;
DROP TABLE IF EXISTS "MarketIntelligences" CASCADE;
DROP TABLE IF EXISTS "TeamMemberRatings" CASCADE;
DROP TABLE IF EXISTS "SubscriptionInfos" CASCADE;
DROP TABLE IF EXISTS "BusinessVerifications" CASCADE;
DROP TABLE IF EXISTS "BrandGuidelines" CASCADE;
DROP TABLE IF EXISTS "FranchiseSettings" CASCADE;
DROP TABLE IF EXISTS "Locations" CASCADE;
DROP TABLE IF EXISTS "Addresses" CASCADE;
DROP TABLE IF EXISTS "BusinessInformation" CASCADE;
DROP TABLE IF EXISTS "BusinessProfiles" CASCADE;

-- Portfolio Templates
DROP TABLE IF EXISTS "BusinessAccesses" CASCADE;
DROP TABLE IF EXISTS "PortfolioSharings" CASCADE;
DROP TABLE IF EXISTS "PortfolioSections" CASCADE;
DROP TABLE IF EXISTS "TemplateDesigns" CASCADE;
DROP TABLE IF EXISTS "PortfolioTemplates" CASCADE;

-- Talent Profile System
DROP TABLE IF EXISTS "VerificationStatuses" CASCADE;
DROP TABLE IF EXISTS "PrivacySettings" CASCADE;
DROP TABLE IF EXISTS "CareerPreferences" CASCADE;
DROP TABLE IF EXISTS "References" CASCADE;
DROP TABLE IF EXISTS "Awards" CASCADE;
DROP TABLE IF EXISTS "PortfolioItems" CASCADE;
DROP TABLE IF EXISTS "Certifications" CASCADE;
DROP TABLE IF EXISTS "Skills" CASCADE;
DROP TABLE IF EXISTS "Educations" CASCADE;
DROP TABLE IF EXISTS "WorkExperiences" CASCADE;
DROP TABLE IF EXISTS "PersonalInformation" CASCADE;
DROP TABLE IF EXISTS "TalentProfiles" CASCADE;

-- Master Data
DROP TABLE IF EXISTS "WorkArrangements" CASCADE;
DROP TABLE IF EXISTS "EmploymentTypes" CASCADE;
DROP TABLE IF EXISTS "SkillDefinitions" CASCADE;
DROP TABLE IF EXISTS "VisaTypes" CASCADE;
DROP TABLE IF EXISTS "CredentialTypes" CASCADE;
DROP TABLE IF EXISTS "EducationLevels" CASCADE;
DROP TABLE IF EXISTS "TAFEInstitutes" CASCADE;
DROP TABLE IF EXISTS "Universities" CASCADE;
DROP TABLE IF EXISTS "JobCategories" CASCADE;
DROP TABLE IF EXISTS "Industries" CASCADE;
DROP TABLE IF EXISTS "Cities" CASCADE;
DROP TABLE IF EXISTS "States" CASCADE;
DROP TABLE IF EXISTS "Countries" CASCADE;

-- Identity Tables (if you want to recreate them)
-- CAUTION: This will DELETE ALL USERS!
DROP TABLE IF EXISTS "AspNetUserTokens" CASCADE;
DROP TABLE IF EXISTS "AspNetUserRoles" CASCADE;
DROP TABLE IF EXISTS "AspNetUserLogins" CASCADE;
DROP TABLE IF EXISTS "AspNetUserClaims" CASCADE;
DROP TABLE IF EXISTS "AspNetRoleClaims" CASCADE;
DROP TABLE IF EXISTS "AspNetUsers" CASCADE;
DROP TABLE IF EXISTS "AspNetRoles" CASCADE;

-- Verify all tables are dropped
SELECT 'Tables remaining in public schema:' as message;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- If the result shows 0 tables, you're ready to run COMPLETE_SUPABASE_SCHEMA.sql
