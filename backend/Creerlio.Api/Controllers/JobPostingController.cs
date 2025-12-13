using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Creerlio.Infrastructure;
using Creerlio.Domain.Entities;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobPostingController : ControllerBase
{
    private readonly CreerlioDbContext _context;

    public JobPostingController(CreerlioDbContext context)
    {
        _context = context;
    }

    // ==================== GET ALL JOBS FOR BUSINESS ====================
    [HttpGet("business/{businessUserId}")]
    public async Task<IActionResult> GetBusinessJobs(string businessUserId)
    {
        var businessProfile = await _context.BusinessProfiles
            .FirstOrDefaultAsync(b => b.UserId == businessUserId);

        if (businessProfile == null)
            return NotFound(new { message = "Business profile not found" });

        var jobs = await _context.JobPostings
            .Where(j => j.BusinessProfileId == businessProfile.Id)
            .OrderByDescending(j => j.CreatedAt)
            .Select(j => new
            {
                j.Id,
                j.Title,
                j.Status,
                j.EmploymentType,
                j.WorkModel,
                j.ExperienceLevel,
                j.MinSalary,
                j.MaxSalary,
                j.SalaryCurrency,
                ApplicationCount = _context.Applications.Count(a => a.JobPostingId == j.Id),
                j.ViewCount,
                j.PublishedAt,
                j.CreatedAt,
                Location = j.JobLocation != null ? j.JobLocation.City : "Not specified"
            })
            .ToListAsync();

        return Ok(jobs);
    }

    // ==================== GET SINGLE JOB ====================
    [HttpGet("{jobId}")]
    public async Task<IActionResult> GetJob(Guid jobId)
    {
        var job = await _context.JobPostings
            .Where(j => j.Id == jobId)
            .Select(j => new
            {
                j.Id,
                j.BusinessProfileId,
                j.Title,
                j.Description,
                j.Responsibilities,
                j.Requirements,
                j.PreferredQualifications,
                j.EmploymentType,
                j.WorkModel,
                j.ExperienceLevel,
                Location = j.JobLocation,
                j.MinSalary,
                j.MaxSalary,
                j.SalaryCurrency,
                j.SalaryPeriod,
                j.ShowSalary,
                j.Benefits,
                j.RequiredSkills,
                j.PreferredSkills,
                j.Category,
                j.Industry,
                j.Status,
                ApplicationCount = _context.Applications.Count(a => a.JobPostingId == j.Id),
                j.ViewCount,
                j.AcceptApplications,
                j.ApplicationMethod,
                j.ExternalApplicationUrl,
                j.PublishedAt,
                j.CreatedAt,
                j.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (job == null)
            return NotFound(new { message = "Job posting not found" });

        return Ok(job);
    }

    // ==================== CREATE JOB ====================
    [HttpPost]
    public async Task<IActionResult> CreateJob([FromBody] CreateJobRequest request)
    {
        var businessProfile = await _context.BusinessProfiles
            .FirstOrDefaultAsync(b => b.UserId == request.BusinessUserId);

        if (businessProfile == null)
            return NotFound(new { message = "Business profile not found" });

        var job = new JobPosting
        {
            Id = Guid.NewGuid(),
            BusinessProfileId = businessProfile.Id,
            Title = request.Title,
            Description = request.Description ?? string.Empty,
            Responsibilities = request.Responsibilities ?? new List<string>(),
            Requirements = request.Requirements ?? new List<string>(),
            PreferredQualifications = request.PreferredQualifications ?? new List<string>(),
            EmploymentType = request.EmploymentType ?? "Full-time",
            WorkModel = request.WorkModel ?? "Office",
            ExperienceLevel = request.ExperienceLevel ?? "Mid-Level",
            JobLocation = request.Location,
            MinSalary = request.MinSalary,
            MaxSalary = request.MaxSalary,
            SalaryCurrency = request.SalaryCurrency ?? "AUD",
            SalaryPeriod = request.SalaryPeriod ?? "Year",
            ShowSalary = request.ShowSalary,
            Benefits = request.Benefits ?? new List<string>(),
            RequiredSkills = request.RequiredSkills ?? new List<string>(),
            PreferredSkills = request.PreferredSkills ?? new List<string>(),
            Category = request.Category ?? string.Empty,
            Industry = request.Industry ?? string.Empty,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            AcceptApplications = true,
            ApplicationMethod = "Platform"
        };

        _context.JobPostings.Add(job);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            jobId = job.Id,
            message = "Job posting created successfully",
            status = job.Status
        });
    }

    // ==================== UPDATE JOB ====================
    [HttpPut("{jobId}")]
    public async Task<IActionResult> UpdateJob(Guid jobId, [FromBody] UpdateJobRequest request)
    {
        var job = await _context.JobPostings.FindAsync(jobId);
        if (job == null)
            return NotFound(new { message = "Job posting not found" });

        job.Title = request.Title ?? job.Title;
        job.Description = request.Description ?? job.Description;
        job.Responsibilities = request.Responsibilities ?? job.Responsibilities;
        job.Requirements = request.Requirements ?? job.Requirements;
        job.PreferredQualifications = request.PreferredQualifications ?? job.PreferredQualifications;
        job.EmploymentType = request.EmploymentType ?? job.EmploymentType;
        job.WorkModel = request.WorkModel ?? job.WorkModel;
        job.ExperienceLevel = request.ExperienceLevel ?? job.ExperienceLevel;
        
        if (request.Location != null)
            job.JobLocation = request.Location;
        
        if (request.MinSalary.HasValue)
            job.MinSalary = request.MinSalary;
        if (request.MaxSalary.HasValue)
            job.MaxSalary = request.MaxSalary;
        
        job.ShowSalary = request.ShowSalary;
        job.Benefits = request.Benefits ?? job.Benefits;
        job.RequiredSkills = request.RequiredSkills ?? job.RequiredSkills;
        job.PreferredSkills = request.PreferredSkills ?? job.PreferredSkills;
        job.Category = request.Category ?? job.Category;
        job.Industry = request.Industry ?? job.Industry;
        job.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Job posting updated successfully" });
    }

    // ==================== PUBLISH JOB ====================
    [HttpPut("{jobId}/publish")]
    public async Task<IActionResult> PublishJob(Guid jobId)
    {
        var job = await _context.JobPostings.FindAsync(jobId);
        if (job == null)
            return NotFound(new { message = "Job posting not found" });

        job.Status = "Published";
        job.PublishedAt = DateTime.UtcNow;
        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Job posting published successfully", status = "Published" });
    }

    // ==================== CLOSE JOB ====================
    [HttpPut("{jobId}/close")]
    public async Task<IActionResult> CloseJob(Guid jobId)
    {
        var job = await _context.JobPostings.FindAsync(jobId);
        if (job == null)
            return NotFound(new { message = "Job posting not found" });

        job.Status = "Closed";
        job.ClosedAt = DateTime.UtcNow;
        job.AcceptApplications = false;
        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Job posting closed successfully", status = "Closed" });
    }

    // ==================== DELETE JOB ====================
    [HttpDelete("{jobId}")]
    public async Task<IActionResult> DeleteJob(Guid jobId)
    {
        var job = await _context.JobPostings.FindAsync(jobId);
        if (job == null)
            return NotFound(new { message = "Job posting not found" });

        _context.JobPostings.Remove(job);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Job posting deleted successfully" });
    }

    // ==================== GET APPLICATIONS FOR JOB ====================
    [HttpGet("{jobId}/applications")]
    public async Task<IActionResult> GetJobApplications(Guid jobId)
    {
        var applications = await _context.Applications
            .Where(a => a.JobPostingId == jobId)
            .Include(a => a.Notes)
            .Include(a => a.Interviews)
            .OrderByDescending(a => a.AppliedAt)
            .Select(a => new
            {
                a.Id,
                a.TalentProfileId,
                a.Status,
                a.Stage,
                a.AIMatchScore,
                a.AppliedAt,
                a.Rating,
                Tags = a.Tags,
                InterviewCount = a.Interviews.Count,
                NoteCount = a.Notes.Count
            })
            .ToListAsync();

        return Ok(applications);
    }

    // ==================== SEARCH PUBLISHED JOBS (For Talent) ====================
    [HttpGet("search")]
    public async Task<IActionResult> SearchJobs(
        [FromQuery] string? keyword,
        [FromQuery] string? location,
        [FromQuery] string? employmentType,
        [FromQuery] string? workModel,
        [FromQuery] string? industry,
        [FromQuery] decimal? minSalary,
        [FromQuery] int? maxResults = 50)
    {
        var query = _context.JobPostings
            .Where(j => j.Status == "Published" && j.AcceptApplications);

        if (!string.IsNullOrEmpty(keyword))
        {
            var lowerKeyword = keyword.ToLower();
            query = query.Where(j =>
                j.Title.ToLower().Contains(lowerKeyword) ||
                j.Description.ToLower().Contains(lowerKeyword));
        }

        if (!string.IsNullOrEmpty(location))
        {
            query = query.Where(j => j.JobLocation != null && j.JobLocation.City.ToLower().Contains(location.ToLower()));
        }

        if (!string.IsNullOrEmpty(employmentType))
        {
            query = query.Where(j => j.EmploymentType == employmentType);
        }

        if (!string.IsNullOrEmpty(workModel))
        {
            query = query.Where(j => j.WorkModel == workModel);
        }

        if (!string.IsNullOrEmpty(industry))
        {
            query = query.Where(j => j.Industry == industry);
        }

        if (minSalary.HasValue)
        {
            query = query.Where(j => j.MinSalary >= minSalary.Value);
        }

        var jobs = await query
            .OrderByDescending(j => j.PublishedAt)
            .Take(maxResults.Value)
            .Select(j => new
            {
                j.Id,
                j.Title,
                j.Description,
                j.EmploymentType,
                j.WorkModel,
                j.ExperienceLevel,
                j.MinSalary,
                j.MaxSalary,
                j.SalaryCurrency,
                j.ShowSalary,
                Location = j.JobLocation != null ? j.JobLocation.City : "Not specified",
                j.RequiredSkills,
                j.PublishedAt,
                ApplicationCount = _context.Applications.Count(a => a.JobPostingId == j.Id)
            })
            .ToListAsync();

        return Ok(jobs);
    }
}

public class CreateJobRequest
{
    public string BusinessUserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string>? Responsibilities { get; set; }
    public List<string>? Requirements { get; set; }
    public List<string>? PreferredQualifications { get; set; }
    public string? EmploymentType { get; set; }
    public string? WorkModel { get; set; }
    public string? ExperienceLevel { get; set; }
    public Address? Location { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public string? SalaryCurrency { get; set; }
    public string? SalaryPeriod { get; set; }
    public bool ShowSalary { get; set; }
    public List<string>? Benefits { get; set; }
    public List<string>? RequiredSkills { get; set; }
    public List<string>? PreferredSkills { get; set; }
    public string? Category { get; set; }
    public string? Industry { get; set; }
}

public class UpdateJobRequest : CreateJobRequest { }
