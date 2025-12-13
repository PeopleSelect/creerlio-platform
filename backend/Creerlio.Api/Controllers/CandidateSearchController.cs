using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Creerlio.Infrastructure;
using Creerlio.Domain.Entities;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CandidateSearchController : ControllerBase
{
    private readonly CreerlioDbContext _context;

    public CandidateSearchController(CreerlioDbContext context)
    {
        _context = context;
    }

    // ==================== SEARCH CANDIDATES ====================
    [HttpPost("search")]
    public async Task<IActionResult> SearchCandidates([FromBody] CandidateSearchRequest request)
    {
        var query = _context.TalentProfiles
            .Include(t => t.PersonalInformation)
            .Include(t => t.WorkExperiences)
            .Include(t => t.Skills)
            .Include(t => t.Educations)
            .AsQueryable();

        // Keyword search (title, skills, description)
        if (!string.IsNullOrEmpty(request.Keyword))
        {
            var lowerKeyword = request.Keyword.ToLower();
            query = query.Where(t =>
                t.WorkExperiences.Any(w => w.Title.ToLower().Contains(lowerKeyword)) ||
                t.Skills.Any(s => s.Name.ToLower().Contains(lowerKeyword)));
        }

        // Skills filter
        if (request.Skills != null && request.Skills.Any())
        {
            foreach (var skill in request.Skills)
            {
                var lowerSkill = skill.ToLower();
                query = query.Where(t => t.Skills.Any(s => s.Name.ToLower().Contains(lowerSkill)));
            }
        }

        // Experience level filter
        if (request.MinYearsExperience.HasValue)
        {
            query = query.Where(t => t.WorkExperiences.Sum(w =>
                (w.EndDate ?? DateTime.UtcNow).Year - w.StartDate.Year) >= request.MinYearsExperience.Value);
        }

        // Location filter
        if (!string.IsNullOrEmpty(request.Location))
        {
            var lowerLocation = request.Location.ToLower();
            query = query.Where(t => t.PersonalInformation != null &&
                t.PersonalInformation.City != null &&
                t.PersonalInformation.City.ToLower().Contains(lowerLocation));
        }

        // Education level filter
        if (!string.IsNullOrEmpty(request.EducationLevel))
        {
            query = query.Where(t => t.Educations.Any(e => 
                e.Degree != null && e.Degree.Contains(request.EducationLevel)));
        }

        // Get results
        var candidates = await query
            .Take(request.MaxResults ?? 50)
            .Select(t => new
            {
                t.Id,
                t.UserId,
                Name = t.PersonalInformation != null ? 
                    t.PersonalInformation.FirstName + " " + t.PersonalInformation.LastName : "Unknown",
                Email = t.PersonalInformation != null ? t.PersonalInformation.Email : "",
                Photo = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
                Title = t.WorkExperiences.OrderByDescending(w => w.StartDate).FirstOrDefault()!.Title ?? "Not specified",
                Company = t.WorkExperiences.OrderByDescending(w => w.StartDate).FirstOrDefault()!.Company ?? "",
                Location = t.PersonalInformation != null ? t.PersonalInformation.City : "Not specified",
                YearsExperience = t.WorkExperiences.Sum(w => 
                    (w.EndDate ?? DateTime.UtcNow).Year - w.StartDate.Year),
                Skills = t.Skills.Select(s => s.Name).ToList(),
                HighestEducation = t.Educations
                    .OrderByDescending(e => e.StartDate)
                    .Select(e => e.Degree)
                    .FirstOrDefault() ?? "Not specified",
                MatchScore = CalculateMatchScore(t, request) // Calculated match score
            })
            .OrderByDescending(c => c.MatchScore)
            .ToListAsync();

        return Ok(candidates);
    }

    // ==================== GET CANDIDATE DETAILS ====================
    [HttpGet("{talentProfileId}")]
    public async Task<IActionResult> GetCandidateDetails(Guid talentProfileId)
    {
        var candidate = await _context.TalentProfiles
            .Where(t => t.Id == talentProfileId)
            .Include(t => t.PersonalInformation)
            .Include(t => t.WorkExperiences)
            .Include(t => t.Skills)
            .Include(t => t.Educations)
            .Include(t => t.Certifications)
            .Include(t => t.Awards)
            .Include(t => t.PortfolioItems)
            .Select(t => new
            {
                t.Id,
                t.UserId,
                PersonalInfo = t.PersonalInformation != null ? new
                {
                    t.PersonalInformation.FirstName,
                    t.PersonalInformation.LastName,
                    t.PersonalInformation.Email,
                    t.PersonalInformation.Phone,
                    t.PersonalInformation.City,
                    t.PersonalInformation.State,
                    t.PersonalInformation.Country,
                    t.PersonalInformation.LinkedInUrl,
                    t.PersonalInformation.WebsiteUrl
                } : null,
                WorkExperiences = t.WorkExperiences.OrderByDescending(w => w.StartDate).Select(w => new
                {
                    w.Id,
                    w.Title,
                    w.Company,
                    w.StartDate,
                    w.EndDate,
                    w.IsCurrentRole,
                    w.Description
                }).ToList(),
                Skills = t.Skills.Select(s => new
                {
                    s.Id,
                    Name = s.Name,
                    s.Category,
                    s.ProficiencyLevel,
                    YearsOfExperience = s.YearsOfExperience
                }).ToList(),
                Educations = t.Educations.OrderByDescending(e => e.StartDate).Select(e => new
                {
                    e.Id,
                    e.Institution,
                    e.Degree,
                    e.Field,
                    e.StartDate,
                    e.EndDate,
                    e.GPA
                }).ToList(),
                Certifications = t.Certifications.Select(c => new
                {
                    c.Id,
                    c.Name,
                    Issuer = c.IssuingOrganization,
                    c.IssueDate,
                    c.ExpiryDate,
                    c.CredentialId,
                    VerificationUrl = c.CredentialUrl
                }).ToList(),
                Awards = t.Awards.Select(a => new
                {
                    a.Id,
                    a.Title,
                    a.Issuer,
                    a.DateReceived,
                    a.Description
                }).ToList(),
                PortfolioItems = t.PortfolioItems.Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Description,
                    p.Images,
                    DemoUrl = p.Url,
                    p.Technologies
                }).ToList()
            })
            .FirstOrDefaultAsync();

        if (candidate == null)
            return NotFound(new { message = "Candidate not found" });

        return Ok(candidate);
    }

    // ==================== GET APPLICATIONS FOR CANDIDATE ====================
    [HttpGet("{talentProfileId}/applications")]
    public async Task<IActionResult> GetCandidateApplications(Guid talentProfileId)
    {
        var applications = await _context.Applications
            .Where(a => a.TalentProfileId == talentProfileId)
            .Include(a => a.Notes)
            .Include(a => a.Interviews)
            .OrderByDescending(a => a.AppliedAt)
            .Select(a => new
            {
                a.Id,
                a.JobPostingId,
                JobTitle = _context.JobPostings
                    .Where(j => j.Id == a.JobPostingId)
                    .Select(j => j.Title)
                    .FirstOrDefault(),
                a.Status,
                a.Stage,
                a.AIMatchScore,
                a.AppliedAt,
                a.Rating,
                InterviewCount = a.Interviews.Count
            })
            .ToListAsync();

        return Ok(applications);
    }

    // ==================== SAVE CANDIDATE TO TALENT POOL ====================
    [HttpPost("save-candidate")]
    public async Task<IActionResult> SaveCandidate([FromBody] SaveCandidateRequest request)
    {
        var talentPool = await _context.TalentPools
            .FirstOrDefaultAsync(tp => tp.Id == request.TalentPoolId);

        if (talentPool == null)
        {
            // Create new talent pool if it doesn't exist
            talentPool = new TalentPool
            {
                Id = Guid.NewGuid(),
                Name = request.PoolName ?? "Saved Candidates",
                TalentProfileIds = new List<Guid> { request.TalentProfileId },
                CreatedAt = DateTime.UtcNow
            };
            _context.TalentPools.Add(talentPool);
        }
        else
        {
            if (!talentPool.TalentProfileIds.Contains(request.TalentProfileId))
            {
                talentPool.TalentProfileIds.Add(request.TalentProfileId);
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Candidate saved to talent pool", poolId = talentPool.Id });
    }

    // ==================== HELPER: CALCULATE MATCH SCORE ====================
    private static int CalculateMatchScore(TalentProfile talent, CandidateSearchRequest request)
    {
        int score = 50; // Base score

        // Keyword match in title
        if (!string.IsNullOrEmpty(request.Keyword))
        {
            var lowerKeyword = request.Keyword.ToLower();
            if (talent.WorkExperiences.Any(w => w.Title.ToLower().Contains(lowerKeyword)))
                score += 20;
        }

        // Skills match
        if (request.Skills != null && request.Skills.Any())
        {
            var matchingSkills = talent.Skills.Count(s =>
                request.Skills.Any(rs => s.Name.ToLower().Contains(rs.ToLower())));
            score += Math.Min(matchingSkills * 10, 30);
        }

        // Experience level match
        if (request.MinYearsExperience.HasValue)
        {
            var yearsExp = talent.WorkExperiences.Sum(w =>
                (w.EndDate ?? DateTime.UtcNow).Year - w.StartDate.Year);
            if (yearsExp >= request.MinYearsExperience.Value)
                score += 15;
        }

        // Location match
        if (!string.IsNullOrEmpty(request.Location) &&
            talent.PersonalInformation != null &&
            talent.PersonalInformation.City != null &&
            talent.PersonalInformation.City.ToLower().Contains(request.Location.ToLower()))
        {
            score += 10;
        }

        return Math.Min(score, 100); // Cap at 100
    }
}

public class CandidateSearchRequest
{
    public string? Keyword { get; set; }
    public List<string>? Skills { get; set; }
    public int? MinYearsExperience { get; set; }
    public string? Location { get; set; }
    public string? EducationLevel { get; set; }
    public string? Status { get; set; } // All, Interviewing, Shortlisted, etc.
    public int? MaxResults { get; set; } = 50;
}

public class SaveCandidateRequest
{
    public Guid TalentProfileId { get; set; }
    public Guid TalentPoolId { get; set; }
    public string? PoolName { get; set; }
}
