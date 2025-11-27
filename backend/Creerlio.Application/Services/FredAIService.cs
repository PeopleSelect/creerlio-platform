using Creerlio.Application.Interfaces;
using Creerlio.Application.DTOs.Fred;
using Microsoft.Extensions.Configuration;
using System.Text;
using System.Text.Json;

namespace Creerlio.Application.Services;

public class FredAIService : IFredAIService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly string? _openAiApiKey;

    public FredAIService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _openAiApiKey = _configuration["OpenAI:ApiKey"];
    }

    public async Task<FredSpeechToTextResponse> SpeechToTextAsync(FredSpeechToTextRequest request)
    {
        try
        {
            // For now, return a mock response
            // TODO: Integrate with OpenAI Whisper or Azure Speech Services
            return new FredSpeechToTextResponse
            {
                TranscribedText = "Sample transcribed text from audio",
                CleanedText = "Sample transcribed text from audio",
                Success = true
            };
        }
        catch (Exception ex)
        {
            return new FredSpeechToTextResponse
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<FredImproveTextResponse> ImproveTextAsync(FredImproveTextRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(_openAiApiKey))
            {
                // Return mock response if no API key configured
                return GenerateMockImprovement(request.Text, request.FieldContext);
            }

            var prompt = BuildImproveTextPrompt(request.Text, request.FieldContext, request.Tone);
            var improvedText = await CallOpenAIAsync(prompt);

            return new FredImproveTextResponse
            {
                OriginalText = request.Text,
                ImprovedText = improvedText,
                Improvements = new List<string> { "Grammar improved", "Professional tone enhanced", "Clarity improved" },
                Success = true
            };
        }
        catch (Exception ex)
        {
            return new FredImproveTextResponse
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<FredExtractStructuredDataResponse> ExtractStructuredDataAsync(FredExtractStructuredDataRequest request)
    {
        try
        {
            var prompt = BuildExtractionPrompt(request.Text, request.DataType);
            var extractedJson = await CallOpenAIAsync(prompt);

            // Parse the JSON response
            var extractedData = JsonSerializer.Deserialize<Dictionary<string, object?>>(extractedJson) 
                ?? new Dictionary<string, object?>();

            return new FredExtractStructuredDataResponse
            {
                ExtractedData = extractedData,
                Suggestions = new List<string> { "Consider adding more details", "Verify dates" },
                Success = true
            };
        }
        catch (Exception ex)
        {
            return new FredExtractStructuredDataResponse
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<FredSuggestResponse> GetSuggestionsAsync(FredSuggestRequest request)
    {
        try
        {
            var suggestions = GenerateMockSuggestions(request.FieldType, request.CurrentText);

            return new FredSuggestResponse
            {
                Suggestions = suggestions,
                Explanation = $"Suggestions based on {request.FieldType}",
                Success = true
            };
        }
        catch (Exception ex)
        {
            return new FredSuggestResponse
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    // Helper methods
    private string BuildImproveTextPrompt(string text, string? fieldContext, string tone)
    {
        var context = fieldContext ?? "general text";
        return $@"Improve the following {context} to sound more {tone}. Keep the original meaning but enhance clarity and professionalism:

{text}

Return only the improved text without any explanations.";
    }

    private string BuildExtractionPrompt(string text, string dataType)
    {
        return $@"Extract structured {dataType} data from the following text and return it as JSON:

{text}

Return only valid JSON without any markdown formatting or explanations.";
    }

    private async Task<string> CallOpenAIAsync(string prompt)
    {
        if (string.IsNullOrWhiteSpace(_openAiApiKey))
        {
            return "Mock AI response - OpenAI API key not configured";
        }

        try
        {
            var requestBody = new
            {
                model = "gpt-4",
                messages = new[]
                {
                    new { role = "system", content = "You are Fred, a helpful AI assistant for the Creerlio platform." },
                    new { role = "user", content = prompt }
                },
                temperature = 0.7
            };

            var content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json"
            );

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_openAiApiKey}");

            var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(responseJson);

            return result.GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? string.Empty;
        }
        catch (Exception)
        {
            return "Error calling OpenAI API";
        }
    }

    private FredImproveTextResponse GenerateMockImprovement(string text, string? fieldContext)
    {
        // Simple mock improvement logic
        var improved = text.Trim();
        
        // Capitalize first letter
        if (improved.Length > 0)
        {
            improved = char.ToUpper(improved[0]) + improved.Substring(1);
        }

        // Add period if missing
        if (!improved.EndsWith(".") && !improved.EndsWith("!") && !improved.EndsWith("?"))
        {
            improved += ".";
        }

        return new FredImproveTextResponse
        {
            OriginalText = text,
            ImprovedText = improved,
            Improvements = new List<string> { "Capitalization corrected", "Punctuation added" },
            Success = true
        };
    }

    private List<string> GenerateMockSuggestions(string fieldType, string? currentText)
    {
        return fieldType.ToLower() switch
        {
            "skills" => new List<string> { "Communication", "Leadership", "Problem Solving", "Time Management", "Teamwork" },
            "jobtitle" => new List<string> { "Project Manager", "Software Developer", "Business Analyst", "Sales Manager", "Marketing Specialist" },
            "industry" => new List<string> { "Technology", "Healthcare", "Finance", "Education", "Retail" },
            "location" => new List<string> { "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide" },
            _ => new List<string> { "Suggestion 1", "Suggestion 2", "Suggestion 3" }
        };
    }
}
