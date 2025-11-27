using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Creerlio.Api.Identity;

public class AppIdentityDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, string>
{
    public AppIdentityDbContext(DbContextOptions<AppIdentityDbContext> options)
        : base(options)
    {
    }
}
