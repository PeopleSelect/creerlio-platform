using Creerlio.Domain.Entities;
using Creerlio.Infrastructure;
using Creerlio.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Creerlio.Repositories;

public class BusinessRepository : IBusinessRepository
{
    private readonly CreerlioDbContext _ctx;

    public BusinessRepository(CreerlioDbContext ctx)
    {
        _ctx = ctx;
    }

    public async Task<List<BusinessProfile>> GetAllProfilesAsync()
    {
        return await _ctx.BusinessProfiles
            .Include(b => b.BusinessInfo)
            .Include(b => b.Locations)
            .ToListAsync();
    }

    public async Task<BusinessProfile?> GetByIdAsync(Guid id)
    {
        return await _ctx.BusinessProfiles
            .Include(b => b.BusinessInfo)
            .Include(b => b.Locations)
            .Include(b => b.FranchiseSettings)
            .ThenInclude(f => f.BrandGuidelines)
            .Include(b => b.Verification)
            .Include(b => b.Subscription)
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    public async Task<BusinessProfile?> GetByUserIdAsync(string userId)
    {
        return await _ctx.BusinessProfiles
            .Include(b => b.BusinessInfo)
            .Include(b => b.Locations)
            .FirstOrDefaultAsync(b => b.UserId == userId);
    }

    public async Task<BusinessProfile> CreateProfileAsync(BusinessProfile profile)
    {
        profile.Id = Guid.NewGuid();
        profile.CreatedAt = DateTime.UtcNow;
        profile.UpdatedAt = DateTime.UtcNow;
        _ctx.BusinessProfiles.Add(profile);
        await _ctx.SaveChangesAsync();
        return profile;
    }

    public async Task<BusinessProfile> UpdateProfileAsync(BusinessProfile profile)
    {
        profile.UpdatedAt = DateTime.UtcNow;
        _ctx.BusinessProfiles.Update(profile);
        await _ctx.SaveChangesAsync();
        return profile;
    }

    public async Task<JobPosting> CreateRoleAsync(JobPosting jobPosting)
    {
        jobPosting.Id = Guid.NewGuid();
        jobPosting.PublishedAt = DateTime.UtcNow;
        jobPosting.UpdatedAt = DateTime.UtcNow;
        _ctx.JobPostings.Add(jobPosting);
        await _ctx.SaveChangesAsync();
        return jobPosting;
    }

    public async Task<List<JobPosting>> GetRolesByBusinessIdAsync(Guid businessId)
    {
        return await _ctx.JobPostings
            .Where(j => j.BusinessProfileId == businessId)
            .ToListAsync();
    }

    public async Task<List<JobPosting>> SearchRolesAsync(string? keyword, string? location)
    {
        var query = _ctx.JobPostings
            .Where(j => j.Status == "Published")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            keyword = keyword.ToLower();
            query = query.Where(j =>
                j.Title.ToLower().Contains(keyword) ||
                j.Description.ToLower().Contains(keyword) ||
                (j.Category != null && j.Category.ToLower().Contains(keyword)));
        }

        if (!string.IsNullOrWhiteSpace(location))
        {
            query = query.Where(j => 
                j.JobLocation != null && (j.JobLocation.City.ToLower().Contains(location.ToLower()) || j.JobLocation.State.ToLower().Contains(location.ToLower())));
        }

        return await query.ToListAsync();
    }
}
