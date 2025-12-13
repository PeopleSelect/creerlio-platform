using Creerlio.Domain.Entities;

namespace Creerlio.Application.Interfaces
{
    public interface IBusinessRepository
    {
        Task<List<BusinessProfile>> GetAllProfilesAsync();
        Task<BusinessProfile?> GetByIdAsync(Guid id);
        Task<BusinessProfile?> GetByUserIdAsync(string userId);
        Task<BusinessProfile> CreateProfileAsync(BusinessProfile profile);
        Task<BusinessProfile> UpdateProfileAsync(BusinessProfile profile);
        Task<JobPosting> CreateRoleAsync(JobPosting jobPosting);
        Task<List<JobPosting>> GetRolesByBusinessIdAsync(Guid businessId);
        Task<List<JobPosting>> SearchRolesAsync(string? keyword, string? location);
    }
}
