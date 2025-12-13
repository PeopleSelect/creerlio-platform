using Microsoft.AspNetCore.Identity;

namespace Creerlio.Api.Identity;

public class ApplicationRole : IdentityRole
{
    public ApplicationRole() : base() {}
    public ApplicationRole(string roleName) : base(roleName) {}
}
