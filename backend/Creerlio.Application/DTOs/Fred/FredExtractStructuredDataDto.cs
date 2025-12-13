namespace Creerlio.Application.DTOs.Fred;

public class FredExtractStructuredDataRequest
{
    public string Text { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty; // "experience", "education", "certificate", "location"
}

public class FredExtractStructuredDataResponse
{
    public Dictionary<string, object?> ExtractedData { get; set; } = new();
    public List<string> Suggestions { get; set; } = new();
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}

// Specific structured data models
public class ExtractedExperience
{
    public string? Employer { get; set; }
    public string? Role { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public List<string> Skills { get; set; } = new();
    public string? Description { get; set; }
}

public class ExtractedEducation
{
    public string? Institution { get; set; }
    public string? Degree { get; set; }
    public string? FieldOfStudy { get; set; }
    public string? Year { get; set; }
}

public class ExtractedLocation
{
    public string? PrimaryLocation { get; set; }
    public int? RadiusKm { get; set; }
    public List<string> AdditionalLocations { get; set; } = new();
}
