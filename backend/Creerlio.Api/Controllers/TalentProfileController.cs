using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Creerlio.Infrastructure;
using Creerlio.Domain.Entities;
using System.Text.Json;

namespace Creerlio.Api.Controllers
{
    [ApiController]
    [Route("api/talent")]
    public class TalentProfileController : ControllerBase
    {
        private readonly CreerlioDbContext _context;
        private readonly ILogger<TalentProfileController> _logger;
        private readonly IWebHostEnvironment _environment;

        public TalentProfileController(
            CreerlioDbContext context, 
            ILogger<TalentProfileController> logger,
            IWebHostEnvironment environment)
        {
            _context = context;
            _logger = logger;
            _environment = environment;
        }

        // ==================== PROFILE OPERATIONS ====================

        [HttpGet("profile/{userId}")]
        public async Task<IActionResult> GetProfile(string userId)
        {
            var profile = await _context.TalentProfiles
                .Include(p => p.PersonalInformation)
                .Include(p => p.WorkExperiences)
                .Include(p => p.Educations)
                .Include(p => p.Skills)
                .Include(p => p.Certifications)
                .Include(p => p.PortfolioItems)
                .Include(p => p.Awards)
                .Include(p => p.References)
                .Include(p => p.CareerPreferences)
                .Include(p => p.PrivacySettings)
                .Include(p => p.VerificationStatus)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            return Ok(profile);
        }

        [HttpPost("profile")]
        public async Task<IActionResult> CreateProfile([FromBody] CreateProfileRequest request)
        {
            // Check if profile already exists
            var existingProfile = await _context.TalentProfiles
                .FirstOrDefaultAsync(p => p.UserId == request.UserId);

            if (existingProfile != null)
            {
                return Conflict(new { message = "Profile already exists" });
            }

            var profile = new TalentProfile
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId,
                Headline = request.Headline ?? string.Empty,
                Summary = request.Summary ?? string.Empty,
                ProfileImageUrl = string.Empty,
                ProfileStatus = "Active",
                IsPublic = true,
                Slug = GenerateSlug(request.FirstName, request.LastName),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PersonalInformation = new PersonalInformation
                {
                    Id = Guid.NewGuid(),
                    FirstName = request.FirstName ?? string.Empty,
                    LastName = request.LastName ?? string.Empty,
                    Email = request.Email ?? string.Empty,
                    Phone = request.Phone ?? string.Empty,
                    City = request.City ?? string.Empty,
                    State = request.State ?? string.Empty,
                    Country = request.Country ?? "Australia",
                    PostalCode = request.PostalCode ?? string.Empty
                },
                PrivacySettings = new PrivacySettings
                {
                    Id = Guid.NewGuid(),
                    ShowEmail = true,
                    ShowPhone = false,
                    ShowLocation = true,
                    AllowContactFromRecruiters = true,
                    ShowProfileInSearch = true
                },
                VerificationStatus = new VerificationStatus
                {
                    Id = Guid.NewGuid(),
                    EmailVerified = false,
                    PhoneVerified = false,
                    IdentityVerified = false,
                    BackgroundCheckCompleted = false,
                    VerificationScore = 0
                }
            };

            _context.TalentProfiles.Add(profile);
            await _context.SaveChangesAsync();

            return Ok(profile);
        }

        [HttpPut("profile/{userId}")]
        public async Task<IActionResult> UpdateProfile(string userId, [FromBody] UpdateProfileRequest request)
        {
            var profile = await _context.TalentProfiles
                .Include(p => p.PersonalInformation)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            profile.Headline = request.Headline ?? profile.Headline;
            profile.Summary = request.Summary ?? profile.Summary;
            profile.UpdatedAt = DateTime.UtcNow;

            if (profile.PersonalInformation != null && request.PersonalInfo != null)
            {
                profile.PersonalInformation.FirstName = request.PersonalInfo.FirstName ?? profile.PersonalInformation.FirstName;
                profile.PersonalInformation.LastName = request.PersonalInfo.LastName ?? profile.PersonalInformation.LastName;
                profile.PersonalInformation.Phone = request.PersonalInfo.Phone ?? profile.PersonalInformation.Phone;
                profile.PersonalInformation.City = request.PersonalInfo.City ?? profile.PersonalInformation.City;
                profile.PersonalInformation.State = request.PersonalInfo.State ?? profile.PersonalInformation.State;
                profile.PersonalInformation.PostalCode = request.PersonalInfo.PostalCode ?? profile.PersonalInformation.PostalCode;
                profile.PersonalInformation.LinkedInUrl = request.PersonalInfo.LinkedInUrl ?? profile.PersonalInformation.LinkedInUrl;
                profile.PersonalInformation.GitHubUrl = request.PersonalInfo.GitHubUrl ?? profile.PersonalInformation.GitHubUrl;
                profile.PersonalInformation.WebsiteUrl = request.PersonalInfo.WebsiteUrl ?? profile.PersonalInformation.WebsiteUrl;
            }

            await _context.SaveChangesAsync();

            return Ok(profile);
        }

        // ==================== PHOTO UPLOAD ====================

        [HttpPost("profile/{userId}/photo")]
        public async Task<IActionResult> UploadPhoto(string userId, [FromForm] IFormFile photo)
        {
            var profile = await _context.TalentProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            if (photo == null || photo.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded" });
            }

            // Validate file type
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
            var fileExtension = Path.GetExtension(photo.FileName).ToLowerInvariant();
            
            if (!allowedExtensions.Contains(fileExtension))
            {
                return BadRequest(new { message = "Invalid file type. Please upload JPG, PNG, or GIF" });
            }

            // Validate file size (5MB max)
            if (photo.Length > 5 * 1024 * 1024)
            {
                return BadRequest(new { message = "File too large. Maximum size is 5MB" });
            }

            try
            {
                // Create uploads directory if it doesn't exist
                var uploadsPath = Path.Combine(_environment.ContentRootPath, "uploads", "profiles");
                Directory.CreateDirectory(uploadsPath);

                // Generate unique filename
                var fileName = $"{userId}_{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Delete old photo if exists
                if (!string.IsNullOrEmpty(profile.ProfileImageUrl))
                {
                    var oldFilePath = Path.Combine(_environment.ContentRootPath, profile.ProfileImageUrl.TrimStart('/'));
                    if (System.IO.File.Exists(oldFilePath))
                    {
                        System.IO.File.Delete(oldFilePath);
                    }
                }

                // Save file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await photo.CopyToAsync(stream);
                }

                // Update profile
                profile.ProfileImageUrl = $"/uploads/profiles/{fileName}";
                profile.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(new { photoUrl = profile.ProfileImageUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error uploading photo: {ex.Message}");
                return StatusCode(500, new { message = "Error uploading photo" });
            }
        }

        [HttpDelete("profile/{userId}/photo")]
        public async Task<IActionResult> DeletePhoto(string userId)
        {
            var profile = await _context.TalentProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            if (!string.IsNullOrEmpty(profile.ProfileImageUrl))
            {
                var filePath = Path.Combine(_environment.ContentRootPath, profile.ProfileImageUrl.TrimStart('/'));
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
            }

            profile.ProfileImageUrl = string.Empty;
            profile.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Photo deleted successfully" });
        }

        // ==================== EXPERIENCE OPERATIONS ====================

        [HttpGet("profile/{userId}/experience")]
        public async Task<IActionResult> GetExperience(string userId)
        {
            var profile = await _context.TalentProfiles
                .Include(p => p.WorkExperiences)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            return Ok(profile.WorkExperiences.OrderByDescending(e => e.StartDate));
        }

        [HttpPost("profile/{userId}/experience")]
        public async Task<IActionResult> AddExperience(string userId, [FromBody] WorkExperienceRequest request)
        {
            var profile = await _context.TalentProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            var experience = new WorkExperience
            {
                Id = Guid.NewGuid(),
                TalentProfileId = profile.Id,
                Company = request.Company ?? string.Empty,
                Title = request.Title ?? string.Empty,
                Description = request.Description ?? string.Empty,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                IsCurrentRole = request.IsCurrentRole,
                Location = request.Location ?? string.Empty,
                EmploymentType = request.EmploymentType ?? string.Empty,
                Achievements = request.Achievements ?? new List<string>(),
                Technologies = request.Technologies ?? new List<string>()
            };

            _context.WorkExperiences.Add(experience);
            await _context.SaveChangesAsync();

            return Ok(experience);
        }

        [HttpPut("experience/{experienceId}")]
        public async Task<IActionResult> UpdateExperience(Guid experienceId, [FromBody] WorkExperienceRequest request)
        {
            var experience = await _context.WorkExperiences.FindAsync(experienceId);

            if (experience == null)
            {
                return NotFound(new { message = "Experience not found" });
            }

            experience.Company = request.Company ?? experience.Company;
            experience.Title = request.Title ?? experience.Title;
            experience.Description = request.Description ?? experience.Description;
            experience.StartDate = request.StartDate;
            experience.EndDate = request.EndDate;
            experience.IsCurrentRole = request.IsCurrentRole;
            experience.Location = request.Location ?? experience.Location;
            experience.EmploymentType = request.EmploymentType ?? experience.EmploymentType;
            experience.Achievements = request.Achievements ?? experience.Achievements;
            experience.Technologies = request.Technologies ?? experience.Technologies;

            await _context.SaveChangesAsync();

            return Ok(experience);
        }

        [HttpDelete("experience/{experienceId}")]
        public async Task<IActionResult> DeleteExperience(Guid experienceId)
        {
            var experience = await _context.WorkExperiences.FindAsync(experienceId);

            if (experience == null)
            {
                return NotFound(new { message = "Experience not found" });
            }

            _context.WorkExperiences.Remove(experience);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Experience deleted successfully" });
        }

        // ==================== EDUCATION OPERATIONS ====================

        [HttpGet("profile/{userId}/education")]
        public async Task<IActionResult> GetEducation(string userId)
        {
            var profile = await _context.TalentProfiles
                .Include(p => p.Educations)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            return Ok(profile.Educations.OrderByDescending(e => e.StartDate));
        }

        [HttpPost("profile/{userId}/education")]
        public async Task<IActionResult> AddEducation(string userId, [FromBody] EducationRequest request)
        {
            var profile = await _context.TalentProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            var education = new Education
            {
                Id = Guid.NewGuid(),
                TalentProfileId = profile.Id,
                Institution = request.Institution ?? string.Empty,
                Degree = request.Degree ?? string.Empty,
                Field = request.Field ?? string.Empty,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                GPA = request.GPA,
                Description = request.Description ?? string.Empty,
                Honors = request.Honors ?? new List<string>()
            };

            _context.Educations.Add(education);
            await _context.SaveChangesAsync();

            return Ok(education);
        }

        [HttpPut("education/{educationId}")]
        public async Task<IActionResult> UpdateEducation(Guid educationId, [FromBody] EducationRequest request)
        {
            var education = await _context.Educations.FindAsync(educationId);

            if (education == null)
            {
                return NotFound(new { message = "Education not found" });
            }

            education.Institution = request.Institution ?? education.Institution;
            education.Degree = request.Degree ?? education.Degree;
            education.Field = request.Field ?? education.Field;
            education.StartDate = request.StartDate;
            education.EndDate = request.EndDate;
            education.GPA = request.GPA;
            education.Description = request.Description ?? education.Description;
            education.Honors = request.Honors ?? education.Honors;

            await _context.SaveChangesAsync();

            return Ok(education);
        }

        [HttpDelete("education/{educationId}")]
        public async Task<IActionResult> DeleteEducation(Guid educationId)
        {
            var education = await _context.Educations.FindAsync(educationId);

            if (education == null)
            {
                return NotFound(new { message = "Education not found" });
            }

            _context.Educations.Remove(education);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Education deleted successfully" });
        }

        // ==================== SKILLS OPERATIONS ====================

        [HttpGet("profile/{userId}/skills")]
        public async Task<IActionResult> GetSkills(string userId)
        {
            var profile = await _context.TalentProfiles
                .Include(p => p.Skills)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            return Ok(profile.Skills.OrderByDescending(s => s.ProficiencyLevel));
        }

        [HttpPost("profile/{userId}/skills")]
        public async Task<IActionResult> AddSkill(string userId, [FromBody] SkillRequest request)
        {
            var profile = await _context.TalentProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            var skill = new Skill
            {
                Id = Guid.NewGuid(),
                TalentProfileId = profile.Id,
                Name = request.Name ?? string.Empty,
                Category = request.Category ?? string.Empty,
                ProficiencyLevel = request.ProficiencyLevel,
                YearsOfExperience = request.YearsOfExperience,
                EndorsementCount = 0,
                LastUsed = DateTime.UtcNow
            };

            _context.Skills.Add(skill);
            await _context.SaveChangesAsync();

            return Ok(skill);
        }

        [HttpPut("skills/{skillId}")]
        public async Task<IActionResult> UpdateSkill(Guid skillId, [FromBody] SkillRequest request)
        {
            var skill = await _context.Skills.FindAsync(skillId);

            if (skill == null)
            {
                return NotFound(new { message = "Skill not found" });
            }

            skill.Name = request.Name ?? skill.Name;
            skill.Category = request.Category ?? skill.Category;
            skill.ProficiencyLevel = request.ProficiencyLevel;
            skill.YearsOfExperience = request.YearsOfExperience;

            await _context.SaveChangesAsync();

            return Ok(skill);
        }

        [HttpDelete("skills/{skillId}")]
        public async Task<IActionResult> DeleteSkill(Guid skillId)
        {
            var skill = await _context.Skills.FindAsync(skillId);

            if (skill == null)
            {
                return NotFound(new { message = "Skill not found" });
            }

            _context.Skills.Remove(skill);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Skill deleted successfully" });
        }

        // ==================== CERTIFICATIONS OPERATIONS ====================

        [HttpGet("profile/{userId}/certifications")]
        public async Task<IActionResult> GetCertifications(string userId)
        {
            var profile = await _context.TalentProfiles
                .Include(p => p.Certifications)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            return Ok(profile.Certifications.OrderByDescending(c => c.IssueDate));
        }

        [HttpPost("profile/{userId}/certifications")]
        public async Task<IActionResult> AddCertification(string userId, [FromBody] CertificationRequest request)
        {
            var profile = await _context.TalentProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            var certification = new Certification
            {
                Id = Guid.NewGuid(),
                TalentProfileId = profile.Id,
                Name = request.Name ?? string.Empty,
                IssuingOrganization = request.IssuingOrganization ?? string.Empty,
                IssueDate = request.IssueDate,
                ExpiryDate = request.ExpiryDate,
                CredentialId = request.CredentialId ?? string.Empty,
                CredentialUrl = request.CredentialUrl ?? string.Empty,
                IsVerified = false
            };

            _context.Certifications.Add(certification);
            await _context.SaveChangesAsync();

            return Ok(certification);
        }

        [HttpPut("certifications/{certificationId}")]
        public async Task<IActionResult> UpdateCertification(Guid certificationId, [FromBody] CertificationRequest request)
        {
            var certification = await _context.Certifications.FindAsync(certificationId);

            if (certification == null)
            {
                return NotFound(new { message = "Certification not found" });
            }

            certification.Name = request.Name ?? certification.Name;
            certification.IssuingOrganization = request.IssuingOrganization ?? certification.IssuingOrganization;
            certification.IssueDate = request.IssueDate;
            certification.ExpiryDate = request.ExpiryDate;
            certification.CredentialId = request.CredentialId ?? certification.CredentialId;
            certification.CredentialUrl = request.CredentialUrl ?? certification.CredentialUrl;

            await _context.SaveChangesAsync();

            return Ok(certification);
        }

        [HttpDelete("certifications/{certificationId}")]
        public async Task<IActionResult> DeleteCertification(Guid certificationId)
        {
            var certification = await _context.Certifications.FindAsync(certificationId);

            if (certification == null)
            {
                return NotFound(new { message = "Certification not found" });
            }

            _context.Certifications.Remove(certification);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Certification deleted successfully" });
        }

        // ==================== AWARDS OPERATIONS ====================

        [HttpGet("profile/{userId}/awards")]
        public async Task<IActionResult> GetAwards(string userId)
        {
            var profile = await _context.TalentProfiles
                .Include(p => p.Awards)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            return Ok(profile.Awards.OrderByDescending(a => a.DateReceived));
        }

        [HttpPost("profile/{userId}/awards")]
        public async Task<IActionResult> AddAward(string userId, [FromBody] AwardRequest request)
        {
            var profile = await _context.TalentProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(new { message = "Profile not found" });
            }

            var award = new Award
            {
                Id = Guid.NewGuid(),
                TalentProfileId = profile.Id,
                Title = request.Title ?? string.Empty,
                Issuer = request.Issuer ?? string.Empty,
                DateReceived = request.DateReceived,
                Description = request.Description ?? string.Empty
            };

            _context.Awards.Add(award);
            await _context.SaveChangesAsync();

            return Ok(award);
        }

        [HttpPut("awards/{awardId}")]
        public async Task<IActionResult> UpdateAward(Guid awardId, [FromBody] AwardRequest request)
        {
            var award = await _context.Awards.FindAsync(awardId);

            if (award == null)
            {
                return NotFound(new { message = "Award not found" });
            }

            award.Title = request.Title ?? award.Title;
            award.Issuer = request.Issuer ?? award.Issuer;
            award.DateReceived = request.DateReceived;
            award.Description = request.Description ?? award.Description;

            await _context.SaveChangesAsync();

            return Ok(award);
        }

        [HttpDelete("awards/{awardId}")]
        public async Task<IActionResult> DeleteAward(Guid awardId)
        {
            var award = await _context.Awards.FindAsync(awardId);

            if (award == null)
            {
                return NotFound(new { message = "Award not found" });
            }

            _context.Awards.Remove(award);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Award deleted successfully" });
        }

        // ==================== HELPER METHODS ====================

        private string GenerateSlug(string firstName, string lastName)
        {
            var slug = $"{firstName}-{lastName}".ToLower()
                .Replace(" ", "-")
                .Replace(".", "")
                .Replace("'", "");
            
            var random = new Random().Next(1000, 9999);
            return $"{slug}-{random}";
        }
    }

    // ==================== REQUEST MODELS ====================

    public class CreateProfileRequest
    {
        public string UserId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? PostalCode { get; set; }
        public string? Headline { get; set; }
        public string? Summary { get; set; }
    }

    public class UpdateProfileRequest
    {
        public string? Headline { get; set; }
        public string? Summary { get; set; }
        public PersonalInfoRequest? PersonalInfo { get; set; }
    }

    public class PersonalInfoRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Phone { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? PostalCode { get; set; }
        public string? LinkedInUrl { get; set; }
        public string? GitHubUrl { get; set; }
        public string? WebsiteUrl { get; set; }
    }

    public class WorkExperienceRequest
    {
        public string? Company { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsCurrentRole { get; set; }
        public string? Location { get; set; }
        public string? EmploymentType { get; set; }
        public List<string>? Achievements { get; set; }
        public List<string>? Technologies { get; set; }
    }

    public class EducationRequest
    {
        public string? Institution { get; set; }
        public string? Degree { get; set; }
        public string? Field { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public double? GPA { get; set; }
        public string? Description { get; set; }
        public List<string>? Honors { get; set; }
    }

    public class SkillRequest
    {
        public string? Name { get; set; }
        public string? Category { get; set; }
        public int ProficiencyLevel { get; set; }
        public double YearsOfExperience { get; set; }
    }

    public class CertificationRequest
    {
        public string? Name { get; set; }
        public string? IssuingOrganization { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? CredentialId { get; set; }
        public string? CredentialUrl { get; set; }
    }

    public class AwardRequest
    {
        public string? Title { get; set; }
        public string? Issuer { get; set; }
        public DateTime DateReceived { get; set; }
        public string? Description { get; set; }
    }
}
