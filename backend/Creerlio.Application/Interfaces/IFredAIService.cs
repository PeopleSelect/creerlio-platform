using Creerlio.Application.DTOs.Fred;

namespace Creerlio.Application.Interfaces;

public interface IFredAIService
{
    Task<FredSpeechToTextResponse> SpeechToTextAsync(FredSpeechToTextRequest request);
    Task<FredImproveTextResponse> ImproveTextAsync(FredImproveTextRequest request);
    Task<FredExtractStructuredDataResponse> ExtractStructuredDataAsync(FredExtractStructuredDataRequest request);
    Task<FredSuggestResponse> GetSuggestionsAsync(FredSuggestRequest request);
}
