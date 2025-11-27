using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Creerlio.Infrastructure.Repositories;
using Creerlio.Application.Interfaces;

namespace Creerlio.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddCreerlioInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<CreerlioDbContext>(options =>
            options.UseSqlServer(connectionString));

        services.AddScoped<ITalentRepository, TalentRepository>();

        return services;
    }
}
