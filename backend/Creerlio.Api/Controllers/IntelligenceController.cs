using Microsoft.AspNetCore.Mvc;
using Creerlio.Application.DTOs.Intelligence;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IntelligenceController : ControllerBase
{
    private readonly ILogger<IntelligenceController> _logger;

    public IntelligenceController(ILogger<IntelligenceController> logger)
    {
        _logger = logger;
    }

    [HttpPost("alerts")]
    public IActionResult GetAlerts([FromBody] GetAlertsRequest request)
    {
        _logger.LogInformation("Getting alerts for business: {BusinessId}", request.BusinessId);

        // Mock data for now
        var mockAlerts = new List<BusinessAlertDto>
        {
            new BusinessAlertDto
            {
                Id = 1,
                BusinessId = request.BusinessId,
                ImpactScore = 85,
                Event = new IntelligenceEventDto
                {
                    Id = 1,
                    EventType = "Development",
                    Title = "New Housing Development Approved in Parramatta",
                    Description = "A 500-unit residential development has been approved by Parramatta Council, expected to bring 1,200+ new residents to the area.",
                    Location = "Parramatta, NSW",
                    Latitude = -33.8150,
                    Longitude = 151.0010,
                    SourceUrls = new List<string> { "https://planning.nsw.gov.au", "https://parramatta.nsw.gov.au" },
                    VerificationCount = 3,
                    ConfidenceScore = 0.92,
                    FirstDetectedAt = DateTime.UtcNow.AddDays(-2),
                    VerifiedAt = DateTime.UtcNow.AddDays(-1)
                },
                RelevanceReasons = new List<string> 
                { 
                    "Within 5km of your business location",
                    "Matches your target customer demographic",
                    "Estimated 1,200+ potential customers"
                },
                RecommendedActions = new List<string>
                {
                    "Consider opening a satellite location nearby",
                    "Launch targeted marketing campaign for new residents",
                    "Partner with real estate agents in the area"
                },
                SentAt = DateTime.UtcNow.AddHours(-6),
                OpenedAt = null,
                IsHelpful = null
            },
            new BusinessAlertDto
            {
                Id = 2,
                BusinessId = request.BusinessId,
                ImpactScore = 72,
                Event = new IntelligenceEventDto
                {
                    Id = 2,
                    EventType = "Employment",
                    Title = "Major Retailer Announces Closure - 150 Staff Affected",
                    Description = "BigBox Retail closing Westmead store, 150 employees being made redundant. Closure date: End of next month.",
                    Location = "Westmead, NSW",
                    Latitude = -33.8076,
                    Longitude = 150.9876,
                    SourceUrls = new List<string> { "https://news.com.au", "https://fairwork.gov.au" },
                    VerificationCount = 4,
                    ConfidenceScore = 0.88,
                    FirstDetectedAt = DateTime.UtcNow.AddDays(-1),
                    VerifiedAt = DateTime.UtcNow.AddHours(-12)
                },
                RelevanceReasons = new List<string>
                {
                    "Potential talent pool in your industry",
                    "Within your hiring radius",
                    "Skills match your requirements"
                },
                RecommendedActions = new List<string>
                {
                    "Post job opportunities targeting these workers",
                    "Attend job transition events",
                    "Contact staff directly via LinkedIn"
                },
                SentAt = DateTime.UtcNow.AddHours(-3),
                OpenedAt = null,
                IsHelpful = null
            },
            new BusinessAlertDto
            {
                Id = 3,
                BusinessId = request.BusinessId,
                ImpactScore = 68,
                Event = new IntelligenceEventDto
                {
                    Id = 3,
                    EventType = "Grant",
                    Title = "NSW Government Small Business Support Grant Now Open",
                    Description = "$10,000-$50,000 grants available for businesses implementing new technology or expanding operations.",
                    Location = "NSW",
                    SourceUrls = new List<string> { "https://business.nsw.gov.au" },
                    VerificationCount = 2,
                    ConfidenceScore = 0.95,
                    FirstDetectedAt = DateTime.UtcNow.AddHours(-18),
                    VerifiedAt = DateTime.UtcNow.AddHours(-16)
                },
                RelevanceReasons = new List<string>
                {
                    "Your business qualifies based on size and industry",
                    "Applications close in 3 weeks"
                },
                RecommendedActions = new List<string>
                {
                    "Review eligibility criteria",
                    "Prepare application documents",
                    "Consider expansion plans to maximize grant value"
                },
                SentAt = DateTime.UtcNow.AddHours(-1),
                OpenedAt = null,
                IsHelpful = null
            }
        };

        var response = new GetAlertsResponse
        {
            Alerts = mockAlerts,
            TotalCount = mockAlerts.Count,
            UnreadCount = mockAlerts.Count(a => a.OpenedAt == null)
        };

        return Ok(response);
    }

    [HttpPut("alerts/{alertId}/feedback")]
    public IActionResult MarkAlertFeedback(int alertId, [FromBody] MarkAlertFeedbackRequest request)
    {
        _logger.LogInformation("Marking alert {AlertId} as {Helpful}", alertId, request.IsHelpful ? "helpful" : "not helpful");
        
        // In real implementation, update database
        return Ok(new { success = true, message = "Feedback recorded" });
    }

    [HttpGet("preferences/{businessId}")]
    public IActionResult GetPreferences(int businessId)
    {
        _logger.LogInformation("Getting intelligence preferences for business: {BusinessId}", businessId);

        // Mock preferences
        var preferences = new UpdatePreferencesRequest
        {
            BusinessId = businessId,
            NotificationFrequency = "daily",
            DeliveryChannels = new List<string> { "email", "app" },
            LocationRadiusKm = 10,
            CategoriesEnabled = new List<string> { "Development", "Employment", "Grant", "Industry" },
            MinimumImpactScore = 60,
            IndustryTags = new List<string> { "Retail", "Hospitality", "Technology" }
        };

        return Ok(preferences);
    }

    [HttpPut("preferences")]
    public IActionResult UpdatePreferences([FromBody] UpdatePreferencesRequest request)
    {
        _logger.LogInformation("Updating intelligence preferences for business: {BusinessId}", request.BusinessId);
        
        // In real implementation, update database
        return Ok(new { success = true, message = "Preferences updated" });
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "Business Intelligence Feed is ready", timestamp = DateTime.UtcNow });
    }
}
