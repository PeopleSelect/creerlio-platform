using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace Creerlio.Api.Identity;

public static class IdentityServiceExtensions
{
    public static IServiceCollection AddCreerlioIdentity(
        this IServiceCollection services,
        IConfiguration config)
    {
        services.AddDbContext<AppIdentityDbContext>(options =>
            options.UseSqlite(config.GetConnectionString("DefaultConnection")));

        services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
        {
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<AppIdentityDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped<JwtTokenService>();

        return services;
    }
}
