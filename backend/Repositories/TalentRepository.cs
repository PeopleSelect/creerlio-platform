using Creerlio.Application.Interfaces;
using Creerlio.Domain.Entities;
using Creerlio.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Creerlio.Infrastructure.Repositories;

public class TalentRepository : ITalentRepository
{
    private readonly CreerlioDbContext _ctx;

    public TalentRepository(CreerlioDbContext ctx)
    {
        _ctx = ctx;
    }

    public async Task<TalentProfile?> GetByIdAsync(Guid id)
    {
        return await _ctx.TalentProfiles
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
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<TalentProfile?> GetByUserIdAsync(string userId)
    {
        return await _ctx.TalentProfiles
            .Include(p => p.PersonalInformation)
            .Include(p => p.WorkExperiences)
            .Include(p => p.Educations)
            .Include(p => p.Skills)
            .Include(p => p.Certifications)
            .Include(p => p.CareerPreferences)
            .FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task<List<TalentProfile>> GetAllAsync()
    {
        return await _ctx.TalentProfiles
            .Include(p => p.PersonalInformation)
            .Include(p => p.Skills)
            .Include(p => p.WorkExperiences)
            .ToListAsync();
    }

    public async Task<List<TalentProfile>> SearchAsync(string? keyword, string? location, string? status)
    {
        var query = _ctx.TalentProfiles
            .Include(p => p.PersonalInformation)
            .Include(p => p.Skills)
            .Include(p => p.WorkExperiences)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            keyword = keyword.ToLower();
            query = query.Where(p => 
                (p.PersonalInformation != null && 
                    (p.PersonalInformation.FirstName.ToLower().Contains(keyword) ||
                     p.PersonalInformation.LastName.ToLower().Contains(keyword))) ||
                (p.Headline != null && p.Headline.ToLower().Contains(keyword)) ||
                (p.Summary != null && p.Summary.ToLower().Contains(keyword)));
        }

        if (!string.IsNullOrWhiteSpace(location))
        {
            query = query.Where(p => 
                p.PersonalInformation != null &&
                (p.PersonalInformation.City.ToLower().Contains(location.ToLower()) ||
                 p.PersonalInformation.State.ToLower().Contains(location.ToLower())));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(p => p.ProfileStatus == status);
        }

        return await query.ToListAsync();
    }

    public async Task<TalentProfile> CreateAsync(TalentProfile profile)
    {
        profile.Id = Guid.NewGuid();
        profile.CreatedAt = DateTime.UtcNow;
        profile.UpdatedAt = DateTime.UtcNow;
        _ctx.TalentProfiles.Add(profile);
        return profile;
    }

    public async Task<TalentProfile> UpdateAsync(TalentProfile profile)
    {
        profile.UpdatedAt = DateTime.UtcNow;
        _ctx.TalentProfiles.Update(profile);
        return profile;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var profile = await _ctx.TalentProfiles.FindAsync(id);
        if (profile == null) return false;
        
        _ctx.TalentProfiles.Remove(profile);
        return true;
    }

    public Task SaveChangesAsync()
    {
        return _ctx.SaveChangesAsync();
    }
}
