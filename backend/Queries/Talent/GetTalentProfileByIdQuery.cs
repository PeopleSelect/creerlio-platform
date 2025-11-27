using MediatR;
using Creerlio.Application.DTOs.Talent;

namespace Creerlio.Application.Queries.Talent;

public record GetTalentProfileByIdQuery(Guid Id) : IRequest<TalentProfileDto>;
