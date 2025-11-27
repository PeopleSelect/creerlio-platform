using MediatR;
using Creerlio.Application.Commands.Talent;
using Creerlio.Application.DTOs.Talent;
using Creerlio.Application.Interfaces;
using Creerlio.Domain.Entities.Talent;

namespace Creerlio.Application.Handlers.Talent;

public class CreateTalentProfileCommandHandler : IRequestHandler<CreateTalentProfileCommand, TalentProfileDto>
{
    private readonly ITalentRepository _repo;

    public CreateTalentProfileCommandHandler(ITalentRepository repo)
    {
        _repo = repo;
    }

    public async Task<TalentProfileDto> Handle(CreateTalentProfileCommand request, CancellationToken cancellationToken)
    {
        var profile = new TalentProfile
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Headline = request.Headline,
            Summary = request.Summary,
            Location = request.Location,
            Status = request.Status
        };

        var created = await _repo.CreateAsync(profile);
        await _repo.SaveChangesAsync();

        return new TalentProfileDto
        {
            Id = created.Id,
            FirstName = created.FirstName,
            LastName = created.LastName,
            Headline = created.Headline,
            Summary = created.Summary,
            Location = created.Location,
            Status = created.Status
        };
    }
}
