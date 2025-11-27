namespace Creerlio.Application.DTOs.Intelligence;

public class IntelligenceEventDto
{
    public int Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public List<string> SourceUrls { get; set; } = new();
    public int VerificationCount { get; set; }
    public double ConfidenceScore { get; set; }
    public DateTime FirstDetectedAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
}

public class BusinessAlertDto
{
    public int Id { get; set; }
    public int BusinessId { get; set; }
    public IntelligenceEventDto? Event { get; set; }
    public int ImpactScore { get; set; }
    public List<string> RelevanceReasons { get; set; } = new();
    public List<string> RecommendedActions { get; set; } = new();
    public DateTime SentAt { get; set; }
    public DateTime? OpenedAt { get; set; }
    public bool? IsHelpful { get; set; }
}

public class GetAlertsRequest
{
    public int BusinessId { get; set; }
    public DateTime? Since { get; set; }
    public string? EventType { get; set; }
    public int? MinImpactScore { get; set; }
    public int PageSize { get; set; } = 20;
    public int Page { get; set; } = 1;
}

public class GetAlertsResponse
{
    public List<BusinessAlertDto> Alerts { get; set; } = new();
    public int TotalCount { get; set; }
    public int UnreadCount { get; set; }
}

public class UpdatePreferencesRequest
{
    public int BusinessId { get; set; }
    public string NotificationFrequency { get; set; } = "daily";
    public List<string> DeliveryChannels { get; set; } = new();
    public int LocationRadiusKm { get; set; } = 10;
    public List<string> CategoriesEnabled { get; set; } = new();
    public int MinimumImpactScore { get; set; } = 50;
    public List<string> IndustryTags { get; set; } = new();
}

public class MarkAlertFeedbackRequest
{
    public int AlertId { get; set; }
    public bool IsHelpful { get; set; }
}
