using Microsoft.AspNetCore.Mvc;
using Creerlio.Application.Interfaces;
using Creerlio.Application.DTOs.Fred;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FredController : ControllerBase
{
    private readonly IFredAIService _fredService;
    private readonly ILogger<FredController> _logger;

    public FredController(IFredAIService fredService, ILogger<FredController> logger)
    {
        _fredService = fredService;
        _logger = logger;
    }

    [HttpPost("speech-to-text")]
    public async Task<ActionResult<FredSpeechToTextResponse>> SpeechToText([FromBody] FredSpeechToTextRequest request)
    {
        _logger.LogInformation("Fred: Processing speech-to-text request for field: {FieldContext}", request.FieldContext);
        
        var result = await _fredService.SpeechToTextAsync(request);
        
        if (!result.Success)
        {
            _logger.LogError("Fred: Speech-to-text failed: {Error}", result.ErrorMessage);
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("improve-text")]
    public async Task<ActionResult<FredImproveTextResponse>> ImproveText([FromBody] FredImproveTextRequest request)
    {
        _logger.LogInformation("Fred: Improving text for field: {FieldContext}, Tone: {Tone}", 
            request.FieldContext, request.Tone);
        
        var result = await _fredService.ImproveTextAsync(request);
        
        if (!result.Success)
        {
            _logger.LogError("Fred: Text improvement failed: {Error}", result.ErrorMessage);
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("extract-structured-data")]
    public async Task<ActionResult<FredExtractStructuredDataResponse>> ExtractStructuredData(
        [FromBody] FredExtractStructuredDataRequest request)
    {
        _logger.LogInformation("Fred: Extracting structured data of type: {DataType}", request.DataType);
        
        var result = await _fredService.ExtractStructuredDataAsync(request);
        
        if (!result.Success)
        {
            _logger.LogError("Fred: Data extraction failed: {Error}", result.ErrorMessage);
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("suggest")]
    public async Task<ActionResult<FredSuggestResponse>> GetSuggestions([FromBody] FredSuggestRequest request)
    {
        _logger.LogInformation("Fred: Getting suggestions for field: {FieldType}", request.FieldType);
        
        var result = await _fredService.GetSuggestionsAsync(request);
        
        if (!result.Success)
        {
            _logger.LogError("Fred: Suggestion generation failed: {Error}", result.ErrorMessage);
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "Fred AI Assistant is ready", timestamp = DateTime.UtcNow });
    }
}
