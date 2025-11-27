using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/saved-locations")]
public class SavedLocationsController : ControllerBase
{
    private readonly IMemoryCache _cache;
    private const string CacheKeyPrefix = "saved_locations_";

    public SavedLocationsController(IMemoryCache cache)
    {
        _cache = cache;
    }

    [HttpGet("user/{userId}")]
    public IActionResult GetUserLocations(string userId)
    {
        var cacheKey = $"{CacheKeyPrefix}{userId}";
        if (_cache.TryGetValue(cacheKey, out List<SavedLocation>? locations))
        {
            return Ok(locations ?? new List<SavedLocation>());
        }
        return Ok(new List<SavedLocation>());
    }

    [HttpPost]
    public IActionResult SaveLocation([FromBody] SavedLocation location)
    {
        if (string.IsNullOrEmpty(location.UserId) || string.IsNullOrEmpty(location.Name))
        {
            return BadRequest("UserId and Name are required");
        }

        location.Id = Guid.NewGuid().ToString();
        location.CreatedAt = DateTime.UtcNow;

        var cacheKey = $"{CacheKeyPrefix}{location.UserId}";
        var locations = _cache.GetOrCreate(cacheKey, entry =>
        {
            entry.SetAbsoluteExpiration(TimeSpan.FromDays(365));
            return new List<SavedLocation>();
        }) ?? new List<SavedLocation>();

        locations.Add(location);
        _cache.Set(cacheKey, locations, TimeSpan.FromDays(365));

        return Ok(location);
    }

    [HttpPut("{id}")]
    public IActionResult UpdateLocation(string id, [FromBody] SavedLocation updatedLocation)
    {
        var cacheKey = $"{CacheKeyPrefix}{updatedLocation.UserId}";
        if (_cache.TryGetValue(cacheKey, out List<SavedLocation>? locations) && locations != null)
        {
            var location = locations.FirstOrDefault(l => l.Id == id);
            if (location != null)
            {
                location.Name = updatedLocation.Name;
                location.Address = updatedLocation.Address;
                location.Latitude = updatedLocation.Latitude;
                location.Longitude = updatedLocation.Longitude;
                location.LocationType = updatedLocation.LocationType;
                location.Notes = updatedLocation.Notes;
                location.IsFavorite = updatedLocation.IsFavorite;

                _cache.Set(cacheKey, locations, TimeSpan.FromDays(365));
                return Ok(location);
            }
        }
        return NotFound();
    }

    [HttpDelete("{userId}/{id}")]
    public IActionResult DeleteLocation(string userId, string id)
    {
        var cacheKey = $"{CacheKeyPrefix}{userId}";
        if (_cache.TryGetValue(cacheKey, out List<SavedLocation>? locations) && locations != null)
        {
            var location = locations.FirstOrDefault(l => l.Id == id);
            if (location != null)
            {
                locations.Remove(location);
                _cache.Set(cacheKey, locations, TimeSpan.FromDays(365));
                return NoContent();
            }
        }
        return NotFound();
    }

    [HttpPost("{userId}/{id}/toggle-favorite")]
    public IActionResult ToggleFavorite(string userId, string id)
    {
        var cacheKey = $"{CacheKeyPrefix}{userId}";
        if (_cache.TryGetValue(cacheKey, out List<SavedLocation>? locations) && locations != null)
        {
            var location = locations.FirstOrDefault(l => l.Id == id);
            if (location != null)
            {
                location.IsFavorite = !location.IsFavorite;
                _cache.Set(cacheKey, locations, TimeSpan.FromDays(365));
                return Ok(location);
            }
        }
        return NotFound();
    }
}

public class SavedLocation
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string LocationType { get; set; } = "custom"; // home, work, favorite, custom
    public string? Notes { get; set; }
    public bool IsFavorite { get; set; }
    public DateTime CreatedAt { get; set; }
}
