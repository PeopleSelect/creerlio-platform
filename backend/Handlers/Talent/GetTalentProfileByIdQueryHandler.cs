using MediatR;
using Creerlio.Application.DTOs.Talent;
using Creerlio.Application.Interfaces;
using Creerlio.Application.Queries.Talent;

namespace Creerlio.Application.Handlers.Talent;

public class GetTalentProfileByIdQueryHandler : IRequestHandler<GetTalentProfileByIdQuery, TalentProfileDto?>
{
    private readonly ITalentRepository _repo;

    public GetTalentProfileByIdQueryHandler(ITalentRepository repo)
    {
        _repo = repo;
    }

    public async Task<TalentProfileDto?> Handle(GetTalentProfileByIdQuery request, CancellationToken cancellationToken)
    {
        var profile = await _repo.GetByIdAsync(request.Id);

        if (profile == null)
            return null;

        return new TalentProfileDto
        {
            Id = profile.Id,
            FirstName = profile.FirstName,
            LastName = profile.LastName,
            Headline = profile.Headline,
            Summary = profile.Summary,
            Location = profile.Location,
            Status = profile.Status
        };
    }
}
