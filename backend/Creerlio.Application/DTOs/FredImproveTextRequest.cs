namespace Creerlio.DTOs.Fred;

public class FredImproveTextRequest
{
    public string Text { get; set; } = string.Empty;
    public string? FieldContext { get; set; } // What field is being improved
    public string Tone { get; set; } = "professional"; // professional, friendly, concise
}

public class FredImproveTextResponse
{
    public string OriginalText { get; set; } = string.Empty;
    public string ImprovedText { get; set; } = string.Empty;
    public List<string> Improvements { get; set; } = new();
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}
