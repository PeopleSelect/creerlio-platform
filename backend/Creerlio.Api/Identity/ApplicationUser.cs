using Microsoft.AspNetCore.Identity;

namespace Creerlio.Api.Identity;

public class ApplicationUser : IdentityUser
{
    public string UserType { get; set; } = "talent";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
}
