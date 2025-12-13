namespace Creerlio.Domain.Entities;

public class IntelligenceEvent
{
    public int Id { get; set; }
    public string EventType { get; set; } = string.Empty; // DA, Employment, Industry, Grant, Competitor
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
    public Dictionary<string, string> Metadata { get; set; } = new();
}

public class BusinessAlert
{
    public int Id { get; set; }
    public int BusinessId { get; set; }
    public int EventId { get; set; }
    public IntelligenceEvent? Event { get; set; }
    public int ImpactScore { get; set; } // 0-100
    public List<string> RelevanceReasons { get; set; } = new();
    public List<string> RecommendedActions { get; set; } = new();
    public DateTime SentAt { get; set; }
    public DateTime? OpenedAt { get; set; }
    public bool? IsHelpful { get; set; }
}

public class BusinessIntelligencePreferences
{
    public int Id { get; set; }
    public int BusinessId { get; set; }
    public string NotificationFrequency { get; set; } = "daily"; // daily, weekly, instant
    public List<string> DeliveryChannels { get; set; } = new() { "email" }; // email, sms, app
    public int LocationRadiusKm { get; set; } = 10;
    public List<string> CategoriesEnabled { get; set; } = new();
    public int MinimumImpactScore { get; set; } = 50;
    public List<string> IndustryTags { get; set; } = new();
}
