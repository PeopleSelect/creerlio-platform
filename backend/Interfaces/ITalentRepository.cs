using Creerlio.Domain.Entities;

namespace Creerlio.Application.Interfaces;

public interface ITalentRepository
{
    Task<TalentProfile?> GetByIdAsync(Guid id);
    Task<TalentProfile?> GetByUserIdAsync(string userId);
    Task<List<TalentProfile>> GetAllAsync();
    Task<List<TalentProfile>> SearchAsync(string? keyword, string? location, string? status);
    Task<TalentProfile> CreateAsync(TalentProfile profile);
    Task<TalentProfile> UpdateAsync(TalentProfile profile);
    Task<bool> DeleteAsync(Guid id);
    Task SaveChangesAsync();
}
