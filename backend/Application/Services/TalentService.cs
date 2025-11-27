using Creerlio.Application.Interfaces;
using Creerlio.Domain.Entities.Talent;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Creerlio.Application.Services;

public class TalentService
{
    private readonly ITalentRepository _repo;
    public TalentService(ITalentRepository repo) { _repo = repo; }

    public Task<TalentProfile?> GetByIdAsync(System.Guid id) => _repo.GetByIdAsync(id);
    public Task<TalentProfile> CreateAsync(TalentProfile p) => _repo.CreateAsync(p);
    public Task SaveChangesAsync() => _repo.SaveChangesAsync();
}
