using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    [HttpPost("no-business-results")]
    public async Task<IActionResult> NotifyNoBusinessResults([FromBody] NoBusinessResultsNotification notification)
    {
        Console.WriteLine("=".PadRight(80, '='));
        Console.WriteLine("🔔 NO BUSINESS RESULTS NOTIFICATION");
        Console.WriteLine("=".PadRight(80, '='));
        Console.WriteLine($"📅 Timestamp: {notification.Timestamp}");
        Console.WriteLine($"👤 Talent ID: {notification.TalentId}");
        Console.WriteLine($"🔍 Search Query: {notification.SearchQuery}");
        Console.WriteLine($"📍 Location: {notification.Location} (Radius: {notification.Radius}km)");
        Console.WriteLine($"🏢 Industry: {notification.Industry}");
        Console.WriteLine($"📊 Criteria:");
        Console.WriteLine($"   - Business Sizes: {string.Join(", ", notification.Criteria.BusinessSize)}");
        Console.WriteLine($"   - Employment Types: {string.Join(", ", notification.Criteria.EmploymentTypes)}");
        Console.WriteLine($"   - Actively Hiring: {notification.Criteria.ActivelyHiring}");
        Console.WriteLine($"   - Has Positions: {notification.Criteria.HasPositions}");
        Console.WriteLine("=".PadRight(80, '='));
        Console.WriteLine();
        Console.WriteLine("📧 ACTION REQUIRED:");
        Console.WriteLine("   1. Review the search criteria above");
        Console.WriteLine("   2. Identify potential businesses in the area matching these criteria");
        Console.WriteLine("   3. Reach out to businesses not yet on the platform");
        Console.WriteLine("   4. Inform them about talent actively seeking employment with businesses like theirs");
        Console.WriteLine("=".PadRight(80, '='));

        // TODO: In production, this should:
        // 1. Save to database (NotificationLog table)
        // 2. Send email to platform admin
        // 3. Create task in CRM system
        // 4. Track conversion (when business signs up)
        // 5. Notify talent when matching business joins

        return Ok(new
        {
            message = "Notification sent successfully",
            notificationId = Guid.NewGuid().ToString(),
            status = "We'll reach out to potential businesses in your area"
        });
    }
}

public class NoBusinessResultsNotification
{
    public string SearchQuery { get; set; } = "";
    public string Location { get; set; } = "";
    public int Radius { get; set; }
    public string Industry { get; set; } = "";
    public SearchCriteria Criteria { get; set; } = new();
    public string Timestamp { get; set; } = "";
    public string TalentId { get; set; } = "";
}

public class SearchCriteria
{
    public List<string> BusinessSize { get; set; } = new();
    public List<string> EmploymentTypes { get; set; } = new();
    public bool ActivelyHiring { get; set; }
    public bool HasPositions { get; set; }
}
