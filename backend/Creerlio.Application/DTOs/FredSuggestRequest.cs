namespace Creerlio.DTOs.Fred;

public class FredSuggestRequest
{
    public string? CurrentText { get; set; }
    public string FieldType { get; set; } = string.Empty; // "skills", "jobTitle", "industry", etc.
    public string? Context { get; set; } // Additional context for better suggestions
}

public class FredSuggestResponse
{
    public List<string> Suggestions { get; set; } = new();
    public string? Explanation { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}
