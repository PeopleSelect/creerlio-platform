using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Creerlio.Api.Identity;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly JwtTokenService _tokenService;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        JwtTokenService tokenService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        Console.WriteLine($"📝 Registration attempt: {req.Email}, UserType: {req.UserType}");
        
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email and password required" });

        try
        {
            var user = new ApplicationUser
            {
                UserName = req.Email,
                Email = req.Email,
                FirstName = req.FirstName ?? "",
                LastName = req.LastName ?? "",
                UserType = req.UserType ?? "Talent"
            };

            var result = await _userManager.CreateAsync(user, req.Password);

            if (!result.Succeeded)
            {
                Console.WriteLine($"❌ Registration failed: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                return BadRequest(new { message = "Registration failed", errors = result.Errors.Select(e => e.Description).ToList() });
            }

            var token = _tokenService.GenerateToken(user);

            return Ok(new
            {
                userId = user.Id,
                email = user.Email,
                userType = user.UserType,
                token
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Database error during registration: {ex.Message}");
            return StatusCode(503, new { 
                message = "Database unavailable. Registration disabled. Please use demo accounts: talent@demo.com or business@demo.com (Password123!)",
                demoAccounts = new[] {
                    new { email = "talent@demo.com", password = "Password123!", type = "Talent" },
                    new { email = "business@demo.com", password = "Password123!", type = "Business" }
                }
            });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email and password required" });

        // Demo account bypass (no database required)
        if (req.Email == "talent@demo.com" && req.Password == "Password123!")
        {
            var demoUser = new ApplicationUser
            {
                Id = "demo-talent-001",
                UserName = "talent@demo.com",
                Email = "talent@demo.com",
                FirstName = "Demo",
                LastName = "Talent",
                UserType = "Talent"
            };
            var demoToken = _tokenService.GenerateToken(demoUser);
            return Ok(new
            {
                userId = demoUser.Id,
                email = demoUser.Email,
                firstName = demoUser.FirstName,
                lastName = demoUser.LastName,
                userType = demoUser.UserType,
                token = demoToken
            });
        }

        if (req.Email == "business@demo.com" && req.Password == "Password123!")
        {
            var demoUser = new ApplicationUser
            {
                Id = "demo-business-001",
                UserName = "business@demo.com",
                Email = "business@demo.com",
                FirstName = "Demo",
                LastName = "Business",
                UserType = "Business"
            };
            var demoToken = _tokenService.GenerateToken(demoUser);
            return Ok(new
            {
                userId = demoUser.Id,
                email = demoUser.Email,
                firstName = demoUser.FirstName,
                lastName = demoUser.LastName,
                userType = demoUser.UserType,
                token = demoToken
            });
        }

        // Original database authentication (will fail if database is not available)
        try
        {
            var user = await _userManager.FindByEmailAsync(req.Email);
            if (user == null)
                return Unauthorized(new { message = "Invalid credentials. Use demo accounts: talent@demo.com or business@demo.com (Password123!)" });

            var result = await _signInManager.CheckPasswordSignInAsync(user, req.Password, false);
            if (!result.Succeeded)
                return Unauthorized(new { message = "Invalid credentials" });

            var token = _tokenService.GenerateToken(user);

            return Ok(new
            {
                userId = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                userType = user.UserType,
                token
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Database error during login: {ex.Message}");
            return StatusCode(503, new { 
                message = "Database unavailable. Please use demo accounts: talent@demo.com or business@demo.com (Password123!)",
                demoAccounts = new[] {
                    new { email = "talent@demo.com", password = "Password123!", type = "Talent" },
                    new { email = "business@demo.com", password = "Password123!", type = "Business" }
                }
            });
        }
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound();

        return Ok(new
        {
            userId = user.Id,
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName,
            userType = user.UserType
        });
    }
}

public class RegisterRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? UserType { get; set; }
}

public class LoginRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}
