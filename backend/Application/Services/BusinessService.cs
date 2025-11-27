using Creerlio.Application.Interfaces;
using Creerlio.Domain.Entities.Business;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Creerlio.Application.Services;

public class BusinessService
{
    private readonly IBusinessRepository _repo;
    public BusinessService(IBusinessRepository repo) { _repo = repo; }

    public Task<IEnumerable<BusinessProfile>> GetAllAsync() => _repo.GetAllAsync();
    public Task<BusinessProfile?> GetByIdAsync(System.Guid id) => _repo.GetByIdAsync(id);
    public Task<BusinessProfile> CreateAsync(BusinessProfile p) => _repo.CreateAsync(p);
    public Task SaveChangesAsync() => _repo.SaveChangesAsync();
}
