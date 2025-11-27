namespace Creerlio.DTOs.Fred;

public class FredSpeechToTextRequest
{
    public string AudioData { get; set; } = string.Empty; // Base64 encoded audio
    public string? FieldContext { get; set; } // What field is being filled (e.g., "experience", "education")
}

public class FredSpeechToTextResponse
{
    public string TranscribedText { get; set; } = string.Empty;
    public string CleanedText { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}
