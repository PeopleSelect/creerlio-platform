using MediatR;
using Creerlio.Application.DTOs.Talent;

namespace Creerlio.Application.Commands.Talent;

public record CreateTalentProfileCommand(
    string FirstName,
    string LastName,
    string Headline,
    string Summary,
    string Location,
    string Status
) : IRequest<TalentProfileDto>;
