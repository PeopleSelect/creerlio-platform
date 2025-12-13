using Microsoft.EntityFrameworkCore;
using Creerlio.Domain.Entities;
using Creerlio.Infrastructure;

namespace Creerlio.Api;

public static class SeedDemoData
{
    public static async Task Initialize(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CreerlioDbContext>();

        // Check if already seeded
        if (await context.BusinessProfiles.AnyAsync())
        {
            Console.WriteLine("⚠️  Demo data already exists, skipping seeding.");
            return;
        }

        Console.WriteLine("🌱 Seeding demo data...");

        // Create 5 Business Profiles
        var businesses = new List<BusinessProfile>
        {
            new BusinessProfile
            {
                Id = Guid.NewGuid(),
                UserId = "business-user-1",
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow,
                BusinessType = "Single",
                BusinessInfo = new BusinessInformation
                {
                    Id = Guid.NewGuid(),
                    LegalName = "TechCorp Australia Pty Ltd",
                    TradingName = "TechCorp",
                    ABN = "12 345 678 901",
                    Industry = "Technology",
                    Industries = new List<string> { "Software Development", "Cloud Computing", "AI/ML" },
                    CompanySize = "51-200",
                    EmployeeCount = 120,
                    Description = "Leading technology company specializing in cloud solutions and AI-powered applications.",
                    Mission = "Empowering businesses through innovative technology solutions.",
                    Values = new List<string> { "Innovation", "Integrity", "Customer Focus", "Collaboration" },
                    WebsiteUrl = "https://techcorp.example.com",
                    LinkedInUrl = "https://linkedin.com/company/techcorp",
                    FoundedDate = new DateTime(2015, 3, 15),
                    PrimaryEmail = "hr@techcorp.example.com",
                    PrimaryPhone = "+61 2 9876 5432",
                    HeadOfficeAddress = new Address
                    {
                        Id = Guid.NewGuid(),
                        Street = "123 Tech Street",
                        City = "Sydney",
                        State = "NSW",
                        PostalCode = "2000",
                        Country = "Australia",
                        Latitude = -33.8688,
                        Longitude = 151.2093
                    }
                },
                Locations = new List<Location>
                {
                    new Location
                    {
                        Id = Guid.NewGuid(),
                        Name = "Sydney HQ",
                        Type = "Office",
                        IsPrimary = true,
                        IsActive = true,
                        CanPostJobs = true,
                        Phone = "+61 2 9876 5432",
                        Email = "sydney@techcorp.example.com",
                        Address = new Address
                        {
                            Id = Guid.NewGuid(),
                            Street = "123 Tech Street",
                            City = "Sydney",
                            State = "NSW",
                            PostalCode = "2000",
                            Country = "Australia",
                            Latitude = -33.8688,
                            Longitude = 151.2093
                        }
                    }
                },
                Verification = new BusinessVerification
                {
                    Id = Guid.NewGuid(),
                    ABNVerified = true,
                    EmailVerified = true,
                    PhoneVerified = true,
                    VerifiedDate = DateTime.UtcNow.AddDays(-25),
                    VerificationStatus = "Verified"
                },
                Subscription = new SubscriptionInfo
                {
                    Id = Guid.NewGuid(),
                    PlanType = "Professional",
                    IsActive = true,
                    JobPostingLimit = 50,
                    JobPostingUsed = 3,
                    CanAccessAdvancedSearch = true,
                    CanAccessAnalytics = true,
                    TeamMemberLimit = 10
                }
            },
            new BusinessProfile
            {
                Id = Guid.NewGuid(),
                UserId = "business-user-2",
                CreatedAt = DateTime.UtcNow.AddDays(-45),
                UpdatedAt = DateTime.UtcNow,
                BusinessType = "Single",
                BusinessInfo = new BusinessInformation
                {
                    Id = Guid.NewGuid(),
                    LegalName = "HealthPlus Medical Group",
                    TradingName = "HealthPlus",
                    ABN = "23 456 789 012",
                    Industry = "Healthcare",
                    Industries = new List<string> { "Healthcare", "Medical Services" },
                    CompanySize = "11-50",
                    EmployeeCount = 35,
                    Description = "Comprehensive healthcare services with a focus on patient-centered care.",
                    Mission = "Delivering exceptional healthcare to improve lives.",
                    Values = new List<string> { "Compassion", "Excellence", "Integrity" },
                    WebsiteUrl = "https://healthplus.example.com",
                    FoundedDate = new DateTime(2010, 6, 20),
                    PrimaryEmail = "careers@healthplus.example.com",
                    PrimaryPhone = "+61 3 8765 4321",
                    HeadOfficeAddress = new Address
                    {
                        Id = Guid.NewGuid(),
                        Street = "456 Medical Avenue",
                        City = "Melbourne",
                        State = "VIC",
                        PostalCode = "3000",
                        Country = "Australia",
                        Latitude = -37.8136,
                        Longitude = 144.9631
                    }
                },
                Locations = new List<Location>
                {
                    new Location
                    {
                        Id = Guid.NewGuid(),
                        Name = "Melbourne Clinic",
                        Type = "Office",
                        IsPrimary = true,
                        IsActive = true,
                        CanPostJobs = true,
                        Phone = "+61 3 8765 4321",
                        Email = "melbourne@healthplus.example.com",
                        Address = new Address
                        {
                            Id = Guid.NewGuid(),
                            Street = "456 Medical Avenue",
                            City = "Melbourne",
                            State = "VIC",
                            PostalCode = "3000",
                            Country = "Australia",
                            Latitude = -37.8136,
                            Longitude = 144.9631
                        }
                    }
                },
                Verification = new BusinessVerification
                {
                    Id = Guid.NewGuid(),
                    ABNVerified = true,
                    EmailVerified = true,
                    PhoneVerified = true,
                    VerifiedDate = DateTime.UtcNow.AddDays(-40),
                    VerificationStatus = "Verified"
                },
                Subscription = new SubscriptionInfo
                {
                    Id = Guid.NewGuid(),
                    PlanType = "Basic",
                    IsActive = true,
                    JobPostingLimit = 10,
                    JobPostingUsed = 2,
                    CanAccessAdvancedSearch = false,
                    CanAccessAnalytics = true,
                    TeamMemberLimit = 3
                }
            },
            new BusinessProfile
            {
                Id = Guid.NewGuid(),
                UserId = "business-user-3",
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow,
                BusinessType = "Single",
                BusinessInfo = new BusinessInformation
                {
                    Id = Guid.NewGuid(),
                    LegalName = "BuildRight Construction",
                    TradingName = "BuildRight",
                    ABN = "34 567 890 123",
                    Industry = "Construction",
                    Industries = new List<string> { "Construction", "Engineering" },
                    CompanySize = "201-500",
                    EmployeeCount = 280,
                    Description = "Premier construction company delivering quality projects across Australia.",
                    Mission = "Building tomorrow's infrastructure today.",
                    Values = new List<string> { "Safety", "Quality", "Sustainability" },
                    WebsiteUrl = "https://buildright.example.com",
                    FoundedDate = new DateTime(2005, 1, 10),
                    PrimaryEmail = "hr@buildright.example.com",
                    PrimaryPhone = "+61 7 7654 3210",
                    HeadOfficeAddress = new Address
                    {
                        Id = Guid.NewGuid(),
                        Street = "789 Builder Road",
                        City = "Brisbane",
                        State = "QLD",
                        PostalCode = "4000",
                        Country = "Australia",
                        Latitude = -27.4698,
                        Longitude = 153.0251
                    }
                },
                Locations = new List<Location>
                {
                    new Location
                    {
                        Id = Guid.NewGuid(),
                        Name = "Brisbane Office",
                        Type = "Office",
                        IsPrimary = true,
                        IsActive = true,
                        CanPostJobs = true,
                        Phone = "+61 7 7654 3210",
                        Email = "brisbane@buildright.example.com",
                        Address = new Address
                        {
                            Id = Guid.NewGuid(),
                            Street = "789 Builder Road",
                            City = "Brisbane",
                            State = "QLD",
                            PostalCode = "4000",
                            Country = "Australia",
                            Latitude = -27.4698,
                            Longitude = 153.0251
                        }
                    }
                },
                Verification = new BusinessVerification
                {
                    Id = Guid.NewGuid(),
                    ABNVerified = true,
                    EmailVerified = true,
                    PhoneVerified = true,
                    VerifiedDate = DateTime.UtcNow.AddDays(-15),
                    VerificationStatus = "Verified"
                },
                Subscription = new SubscriptionInfo
                {
                    Id = Guid.NewGuid(),
                    PlanType = "Enterprise",
                    IsActive = true,
                    JobPostingLimit = 999,
                    JobPostingUsed = 5,
                    CanAccessAdvancedSearch = true,
                    CanAccessAnalytics = true,
                    CanAccessBusinessIntelligence = true,
                    TeamMemberLimit = 50
                }
            },
            new BusinessProfile
            {
                Id = Guid.NewGuid(),
                UserId = "business-user-4",
                CreatedAt = DateTime.UtcNow.AddDays(-60),
                UpdatedAt = DateTime.UtcNow,
                BusinessType = "Single",
                BusinessInfo = new BusinessInformation
                {
                    Id = Guid.NewGuid(),
                    LegalName = "RetailHub Stores Pty Ltd",
                    TradingName = "RetailHub",
                    ABN = "45 678 901 234",
                    Industry = "Retail",
                    Industries = new List<string> { "Retail", "E-commerce" },
                    CompanySize = "51-200",
                    EmployeeCount = 95,
                    Description = "Modern retail chain with both physical stores and online presence.",
                    Mission = "Making shopping easy and enjoyable for everyone.",
                    Values = new List<string> { "Customer First", "Innovation", "Teamwork" },
                    WebsiteUrl = "https://retailhub.example.com",
                    FoundedDate = new DateTime(2012, 8, 5),
                    PrimaryEmail = "jobs@retailhub.example.com",
                    PrimaryPhone = "+61 8 6543 2109",
                    HeadOfficeAddress = new Address
                    {
                        Id = Guid.NewGuid(),
                        Street = "321 Retail Plaza",
                        City = "Perth",
                        State = "WA",
                        PostalCode = "6000",
                        Country = "Australia",
                        Latitude = -31.9505,
                        Longitude = 115.8605
                    }
                },
                Locations = new List<Location>
                {
                    new Location
                    {
                        Id = Guid.NewGuid(),
                        Name = "Perth Flagship Store",
                        Type = "Store",
                        IsPrimary = true,
                        IsActive = true,
                        CanPostJobs = true,
                        Phone = "+61 8 6543 2109",
                        Email = "perth@retailhub.example.com",
                        Address = new Address
                        {
                            Id = Guid.NewGuid(),
                            Street = "321 Retail Plaza",
                            City = "Perth",
                            State = "WA",
                            PostalCode = "6000",
                            Country = "Australia",
                            Latitude = -31.9505,
                            Longitude = 115.8605
                        }
                    }
                },
                Verification = new BusinessVerification
                {
                    Id = Guid.NewGuid(),
                    ABNVerified = true,
                    EmailVerified = true,
                    PhoneVerified = false,
                    VerifiedDate = DateTime.UtcNow.AddDays(-55),
                    VerificationStatus = "Verified"
                },
                Subscription = new SubscriptionInfo
                {
                    Id = Guid.NewGuid(),
                    PlanType = "Professional",
                    IsActive = true,
                    JobPostingLimit = 50,
                    JobPostingUsed = 4,
                    CanAccessAdvancedSearch = true,
                    CanAccessAnalytics = true,
                    TeamMemberLimit = 10
                }
            },
            new BusinessProfile
            {
                Id = Guid.NewGuid(),
                UserId = "business-user-5",
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow,
                BusinessType = "Single",
                BusinessInfo = new BusinessInformation
                {
                    Id = Guid.NewGuid(),
                    LegalName = "EduLearn Institute",
                    TradingName = "EduLearn",
                    ABN = "56 789 012 345",
                    Industry = "Education",
                    Industries = new List<string> { "Education", "Training" },
                    CompanySize = "11-50",
                    EmployeeCount = 42,
                    Description = "Modern educational institute offering courses and professional training.",
                    Mission = "Empowering learners through quality education.",
                    Values = new List<string> { "Excellence", "Accessibility", "Innovation" },
                    WebsiteUrl = "https://edulearn.example.com",
                    FoundedDate = new DateTime(2018, 2, 14),
                    PrimaryEmail = "hr@edulearn.example.com",
                    PrimaryPhone = "+61 2 5432 1098",
                    HeadOfficeAddress = new Address
                    {
                        Id = Guid.NewGuid(),
                        Street = "654 Education Lane",
                        City = "Canberra",
                        State = "ACT",
                        PostalCode = "2600",
                        Country = "Australia",
                        Latitude = -35.2809,
                        Longitude = 149.1300
                    }
                },
                Locations = new List<Location>
                {
                    new Location
                    {
                        Id = Guid.NewGuid(),
                        Name = "Canberra Campus",
                        Type = "Office",
                        IsPrimary = true,
                        IsActive = true,
                        CanPostJobs = true,
                        Phone = "+61 2 5432 1098",
                        Email = "canberra@edulearn.example.com",
                        Address = new Address
                        {
                            Id = Guid.NewGuid(),
                            Street = "654 Education Lane",
                            City = "Canberra",
                            State = "ACT",
                            PostalCode = "2600",
                            Country = "Australia",
                            Latitude = -35.2809,
                            Longitude = 149.1300
                        }
                    }
                },
                Verification = new BusinessVerification
                {
                    Id = Guid.NewGuid(),
                    ABNVerified = true,
                    EmailVerified = true,
                    PhoneVerified = true,
                    VerifiedDate = DateTime.UtcNow.AddDays(-10),
                    VerificationStatus = "Verified"
                },
                Subscription = new SubscriptionInfo
                {
                    Id = Guid.NewGuid(),
                    PlanType = "Basic",
                    IsActive = true,
                    JobPostingLimit = 10,
                    JobPostingUsed = 1,
                    CanAccessAdvancedSearch = false,
                    CanAccessAnalytics = true,
                    TeamMemberLimit = 3
                }
            }
        };

        await context.BusinessProfiles.AddRangeAsync(businesses);
        await context.SaveChangesAsync();
        Console.WriteLine($"✅ Created {businesses.Count} business profiles");

        // Create 5 Talent Profiles
        var talents = new List<TalentProfile>
        {
            new TalentProfile
            {
                Id = Guid.NewGuid(),
                UserId = "talent-user-1",
                CreatedAt = DateTime.UtcNow.AddDays(-50),
                UpdatedAt = DateTime.UtcNow,
                Headline = "Senior Full Stack Developer | React, Node.js, AWS",
                Summary = "Experienced software engineer with 8+ years building scalable web applications. Passionate about clean code and modern architectures.",
                ProfileStatus = "Active",
                IsPublic = true,
                Slug = "sarah-johnson",
                PersonalInformation = new PersonalInformation
                {
                    Id = Guid.NewGuid(),
                    FirstName = "Sarah",
                    LastName = "Johnson",
                    Email = "sarah.johnson@example.com",
                    Phone = "+61 412 345 678",
                    City = "Sydney",
                    State = "NSW",
                    Country = "Australia",
                    PostalCode = "2000",
                    LinkedInUrl = "https://linkedin.com/in/sarahjohnson",
                    GitHubUrl = "https://github.com/sarahjohnson"
                },
                WorkExperiences = new List<WorkExperience>
                {
                    new WorkExperience
                    {
                        Id = Guid.NewGuid(),
                        Company = "Tech Solutions Inc",
                        Title = "Senior Full Stack Developer",
                        Description = "Lead developer for cloud-based SaaS platform",
                        StartDate = new DateTime(2020, 1, 15),
                        IsCurrentRole = true,
                        Location = "Sydney, NSW",
                        EmploymentType = "Full-time",
                        Technologies = new List<string> { "React", "Node.js", "AWS", "PostgreSQL" }
                    }
                },
                Skills = new List<Skill>
                {
                    new Skill { Id = Guid.NewGuid(), Name = "React", Category = "Technical", ProficiencyLevel = 5, YearsOfExperience = 6 },
                    new Skill { Id = Guid.NewGuid(), Name = "Node.js", Category = "Technical", ProficiencyLevel = 5, YearsOfExperience = 7 },
                    new Skill { Id = Guid.NewGuid(), Name = "AWS", Category = "Technical", ProficiencyLevel = 4, YearsOfExperience = 5 }
                },
                CareerPreferences = new CareerPreferences
                {
                    Id = Guid.NewGuid(),
                    PreferredRoles = new List<string> { "Senior Developer", "Tech Lead", "Engineering Manager" },
                    PreferredIndustries = new List<string> { "Technology", "Fintech" },
                    PreferredLocations = new List<string> { "Sydney", "Melbourne" },
                    WorkModel = "Hybrid",
                    PreferredEmploymentTypes = new List<string> { "Full-time", "Contract" },
                    ExpectedSalary = 150000,
                    Currency = "AUD",
                    OpenToRemote = true,
                    NoticePeriod = "4 weeks"
                },
                VerificationStatus = new VerificationStatus
                {
                    Id = Guid.NewGuid(),
                    EmailVerified = true,
                    PhoneVerified = true,
                    VerificationScore = 85
                }
            },
            new TalentProfile
            {
                Id = Guid.NewGuid(),
                UserId = "talent-user-2",
                CreatedAt = DateTime.UtcNow.AddDays(-40),
                UpdatedAt = DateTime.UtcNow,
                Headline = "Registered Nurse | ICU Specialist",
                Summary = "Dedicated healthcare professional with 5 years ICU experience. Committed to patient care excellence.",
                ProfileStatus = "Active",
                IsPublic = true,
                Slug = "michael-chen",
                PersonalInformation = new PersonalInformation
                {
                    Id = Guid.NewGuid(),
                    FirstName = "Michael",
                    LastName = "Chen",
                    Email = "michael.chen@example.com",
                    Phone = "+61 423 456 789",
                    City = "Melbourne",
                    State = "VIC",
                    Country = "Australia",
                    PostalCode = "3000"
                },
                WorkExperiences = new List<WorkExperience>
                {
                    new WorkExperience
                    {
                        Id = Guid.NewGuid(),
                        Company = "Royal Melbourne Hospital",
                        Title = "ICU Registered Nurse",
                        Description = "Providing critical care to ICU patients",
                        StartDate = new DateTime(2019, 6, 1),
                        IsCurrentRole = true,
                        Location = "Melbourne, VIC",
                        EmploymentType = "Full-time"
                    }
                },
                Skills = new List<Skill>
                {
                    new Skill { Id = Guid.NewGuid(), Name = "Critical Care", Category = "Technical", ProficiencyLevel = 5, YearsOfExperience = 5 },
                    new Skill { Id = Guid.NewGuid(), Name = "Patient Assessment", Category = "Technical", ProficiencyLevel = 5, YearsOfExperience = 5 },
                    new Skill { Id = Guid.NewGuid(), Name = "Emergency Response", Category = "Technical", ProficiencyLevel = 4, YearsOfExperience = 5 }
                },
                Certifications = new List<Certification>
                {
                    new Certification
                    {
                        Id = Guid.NewGuid(),
                        Name = "AHPRA Registration",
                        IssuingOrganization = "AHPRA",
                        IssueDate = new DateTime(2018, 12, 1),
                        IsVerified = true
                    }
                },
                CareerPreferences = new CareerPreferences
                {
                    Id = Guid.NewGuid(),
                    PreferredRoles = new List<string> { "ICU Nurse", "Clinical Nurse Specialist" },
                    PreferredIndustries = new List<string> { "Healthcare" },
                    PreferredLocations = new List<string> { "Melbourne" },
                    WorkModel = "Office",
                    PreferredEmploymentTypes = new List<string> { "Full-time", "Part-time" },
                    ExpectedSalary = 85000,
                    Currency = "AUD",
                    OpenToRemote = false
                },
                VerificationStatus = new VerificationStatus
                {
                    Id = Guid.NewGuid(),
                    EmailVerified = true,
                    PhoneVerified = true,
                    BackgroundCheckCompleted = true,
                    VerificationScore = 95
                }
            },
            new TalentProfile
            {
                Id = Guid.NewGuid(),
                UserId = "talent-user-3",
                CreatedAt = DateTime.UtcNow.AddDays(-25),
                UpdatedAt = DateTime.UtcNow,
                Headline = "Civil Engineer | Infrastructure Projects",
                Summary = "Licensed civil engineer with expertise in large-scale infrastructure development.",
                ProfileStatus = "Active",
                IsPublic = true,
                Slug = "emma-williams",
                PersonalInformation = new PersonalInformation
                {
                    Id = Guid.NewGuid(),
                    FirstName = "Emma",
                    LastName = "Williams",
                    Email = "emma.williams@example.com",
                    Phone = "+61 434 567 890",
                    City = "Brisbane",
                    State = "QLD",
                    Country = "Australia",
                    PostalCode = "4000"
                },
                WorkExperiences = new List<WorkExperience>
                {
                    new WorkExperience
                    {
                        Id = Guid.NewGuid(),
                        Company = "Queensland Infrastructure",
                        Title = "Senior Civil Engineer",
                        Description = "Lead engineer for major bridge and highway projects",
                        StartDate = new DateTime(2018, 3, 1),
                        IsCurrentRole = true,
                        Location = "Brisbane, QLD",
                        EmploymentType = "Full-time"
                    }
                },
                Skills = new List<Skill>
                {
                    new Skill { Id = Guid.NewGuid(), Name = "AutoCAD", Category = "Technical", ProficiencyLevel = 5, YearsOfExperience = 7 },
                    new Skill { Id = Guid.NewGuid(), Name = "Structural Analysis", Category = "Technical", ProficiencyLevel = 5, YearsOfExperience = 7 },
                    new Skill { Id = Guid.NewGuid(), Name = "Project Management", Category = "Soft", ProficiencyLevel = 4, YearsOfExperience = 5 }
                },
                Educations = new List<Education>
                {
                    new Education
                    {
                        Id = Guid.NewGuid(),
                        Institution = "University of Queensland",
                        Degree = "Bachelor of Engineering",
                        Field = "Civil Engineering",
                        StartDate = new DateTime(2011, 2, 1),
                        EndDate = new DateTime(2014, 11, 30)
                    }
                },
                CareerPreferences = new CareerPreferences
                {
                    Id = Guid.NewGuid(),
                    PreferredRoles = new List<string> { "Senior Engineer", "Project Manager" },
                    PreferredIndustries = new List<string> { "Construction", "Engineering" },
                    PreferredLocations = new List<string> { "Brisbane", "Gold Coast" },
                    WorkModel = "Office",
                    PreferredEmploymentTypes = new List<string> { "Full-time" },
                    ExpectedSalary = 120000,
                    Currency = "AUD",
                    OpenToRemote = false
                },
                VerificationStatus = new VerificationStatus
                {
                    Id = Guid.NewGuid(),
                    EmailVerified = true,
                    PhoneVerified = true,
                    IdentityVerified = true,
                    VerificationScore = 90
                }
            },
            new TalentProfile
            {
                Id = Guid.NewGuid(),
                UserId = "talent-user-4",
                CreatedAt = DateTime.UtcNow.AddDays(-35),
                UpdatedAt = DateTime.UtcNow,
                Headline = "Store Manager | Retail Operations Expert",
                Summary = "Results-driven retail manager with 10 years experience in multi-store operations.",
                ProfileStatus = "Active",
                IsPublic = true,
                Slug = "james-taylor",
                PersonalInformation = new PersonalInformation
                {
                    Id = Guid.NewGuid(),
                    FirstName = "James",
                    LastName = "Taylor",
                    Email = "james.taylor@example.com",
                    Phone = "+61 445 678 901",
                    City = "Perth",
                    State = "WA",
                    Country = "Australia",
                    PostalCode = "6000"
                },
                WorkExperiences = new List<WorkExperience>
                {
                    new WorkExperience
                    {
                        Id = Guid.NewGuid(),
                        Company = "RetailPro Stores",
                        Title = "Store Manager",
                        Description = "Managing flagship store operations and team of 25 staff",
                        StartDate = new DateTime(2021, 1, 15),
                        IsCurrentRole = true,
                        Location = "Perth, WA",
                        EmploymentType = "Full-time"
                    }
                },
                Skills = new List<Skill>
                {
                    new Skill { Id = Guid.NewGuid(), Name = "Retail Operations", Category = "Technical", ProficiencyLevel = 5, YearsOfExperience = 10 },
                    new Skill { Id = Guid.NewGuid(), Name = "Team Leadership", Category = "Soft", ProficiencyLevel = 5, YearsOfExperience = 8 },
                    new Skill { Id = Guid.NewGuid(), Name = "Customer Service", Category = "Soft", ProficiencyLevel = 5, YearsOfExperience = 10 }
                },
                CareerPreferences = new CareerPreferences
                {
                    Id = Guid.NewGuid(),
                    PreferredRoles = new List<string> { "Store Manager", "Regional Manager", "Operations Manager" },
                    PreferredIndustries = new List<string> { "Retail", "E-commerce" },
                    PreferredLocations = new List<string> { "Perth" },
                    WorkModel = "Office",
                    PreferredEmploymentTypes = new List<string> { "Full-time" },
                    ExpectedSalary = 95000,
                    Currency = "AUD",
                    OpenToRemote = false
                },
                VerificationStatus = new VerificationStatus
                {
                    Id = Guid.NewGuid(),
                    EmailVerified = true,
                    PhoneVerified = true,
                    VerificationScore = 80
                }
            },
            new TalentProfile
            {
                Id = Guid.NewGuid(),
                UserId = "talent-user-5",
                CreatedAt = DateTime.UtcNow.AddDays(-18),
                UpdatedAt = DateTime.UtcNow,
                Headline = "Education Coordinator | Curriculum Development",
                Summary = "Passionate educator with expertise in curriculum design and student engagement.",
                ProfileStatus = "Active",
                IsPublic = true,
                Slug = "olivia-martinez",
                PersonalInformation = new PersonalInformation
                {
                    Id = Guid.NewGuid(),
                    FirstName = "Olivia",
                    LastName = "Martinez",
                    Email = "olivia.martinez@example.com",
                    Phone = "+61 456 789 012",
                    City = "Canberra",
                    State = "ACT",
                    Country = "Australia",
                    PostalCode = "2600"
                },
                WorkExperiences = new List<WorkExperience>
                {
                    new WorkExperience
                    {
                        Id = Guid.NewGuid(),
                        Company = "Canberra Learning Centre",
                        Title = "Education Coordinator",
                        Description = "Developing and implementing educational programs",
                        StartDate = new DateTime(2020, 7, 1),
                        IsCurrentRole = true,
                        Location = "Canberra, ACT",
                        EmploymentType = "Full-time"
                    }
                },
                Skills = new List<Skill>
                {
                    new Skill { Id = Guid.NewGuid(), Name = "Curriculum Development", Category = "Technical", ProficiencyLevel = 5, YearsOfExperience = 6 },
                    new Skill { Id = Guid.NewGuid(), Name = "Educational Technology", Category = "Technical", ProficiencyLevel = 4, YearsOfExperience = 4 },
                    new Skill { Id = Guid.NewGuid(), Name = "Student Engagement", Category = "Soft", ProficiencyLevel = 5, YearsOfExperience = 6 }
                },
                Educations = new List<Education>
                {
                    new Education
                    {
                        Id = Guid.NewGuid(),
                        Institution = "Australian National University",
                        Degree = "Master of Education",
                        Field = "Curriculum Studies",
                        StartDate = new DateTime(2016, 2, 1),
                        EndDate = new DateTime(2017, 11, 30)
                    }
                },
                CareerPreferences = new CareerPreferences
                {
                    Id = Guid.NewGuid(),
                    PreferredRoles = new List<string> { "Education Coordinator", "Curriculum Designer", "Program Manager" },
                    PreferredIndustries = new List<string> { "Education", "Training" },
                    PreferredLocations = new List<string> { "Canberra", "Sydney" },
                    WorkModel = "Hybrid",
                    PreferredEmploymentTypes = new List<string> { "Full-time" },
                    ExpectedSalary = 85000,
                    Currency = "AUD",
                    OpenToRemote = true
                },
                VerificationStatus = new VerificationStatus
                {
                    Id = Guid.NewGuid(),
                    EmailVerified = true,
                    PhoneVerified = true,
                    VerificationScore = 85
                }
            }
        };

        await context.TalentProfiles.AddRangeAsync(talents);
        await context.SaveChangesAsync();
        Console.WriteLine($"✅ Created {talents.Count} talent profiles");

        Console.WriteLine("🎉 Demo data seeding completed successfully!");
    }
}
