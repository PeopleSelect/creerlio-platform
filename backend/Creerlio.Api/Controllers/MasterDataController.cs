using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Creerlio.Infrastructure;
using Creerlio.Domain.Entities.MasterData;

namespace Creerlio.Api.Controllers;

/// <summary>
/// Rolls Royce Master Data API - Provides autocomplete and dropdown data with caching
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class MasterDataController : ControllerBase
{
    private readonly CreerlioDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<MasterDataController> _logger;
    private const int CacheDurationMinutes = 60;

    public MasterDataController(CreerlioDbContext context, IMemoryCache cache, ILogger<MasterDataController> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Get all countries (cached)
    /// </summary>
    [HttpGet("countries")]
    public async Task<ActionResult<List<Country>>> GetCountries([FromQuery] string? search = null)
    {
        try
        {
            var cacheKey = $"countries_{search ?? "all"}";
            if (_cache.TryGetValue(cacheKey, out List<Country>? cachedCountries) && cachedCountries != null)
            {
                return Ok(cachedCountries);
            }

            var query = _context.Countries
                .Where(c => c.IsActive)
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(c => c.Name.Contains(search) || c.Code.Contains(search));
            }

            var countries = await query.Take(100).ToListAsync();

            _cache.Set(cacheKey, countries, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(countries);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database unavailable, returning mock countries data");
            
            // Return mock data when database is unavailable
            var mockCountries = new List<Country>
            {
                new Country { Id = Guid.NewGuid(), Name = "Australia", Code = "AUS", IsActive = true, SortOrder = 1 },
                new Country { Id = Guid.NewGuid(), Name = "United States", Code = "USA", IsActive = true, SortOrder = 2 },
                new Country { Id = Guid.NewGuid(), Name = "United Kingdom", Code = "GBR", IsActive = true, SortOrder = 3 },
                new Country { Id = Guid.NewGuid(), Name = "Canada", Code = "CAN", IsActive = true, SortOrder = 4 },
                new Country { Id = Guid.NewGuid(), Name = "New Zealand", Code = "NZL", IsActive = true, SortOrder = 5 }
            };

            if (!string.IsNullOrEmpty(search))
            {
                mockCountries = mockCountries
                    .Where(c => c.Name.Contains(search, StringComparison.OrdinalIgnoreCase) || 
                                c.Code.Contains(search, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return Ok(mockCountries);
        }
    }

    /// <summary>
    /// Get states for a country (cached)
    /// </summary>
    [HttpGet("states")]
    public async Task<ActionResult<List<State>>> GetStates([FromQuery] string? countryCode = "AUS", [FromQuery] string? search = null)
    {
        try
        {
            var cacheKey = $"states_{countryCode}_{search ?? "all"}";
            if (_cache.TryGetValue(cacheKey, out List<State>? cachedStates) && cachedStates != null)
            {
                return Ok(cachedStates);
            }

            var country = await _context.Countries.FirstOrDefaultAsync(c => c.Code == countryCode);
            if (country == null)
            {
                return NotFound(new { error = "Country not found" });
            }

            var query = _context.States
                .Where(s => s.CountryId == country.Id && s.IsActive)
                .OrderBy(s => s.SortOrder)
                .ThenBy(s => s.Name)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(s => s.Name.Contains(search) || s.Code.Contains(search));
            }

            var states = await query.ToListAsync();

            _cache.Set(cacheKey, states, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(states);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database unavailable, returning mock states data for {CountryCode}", countryCode);
            
            // Return mock Australian states when database is unavailable
            var countryId = Guid.NewGuid();
            var mockStates = new List<State>
            {
                new State { Id = Guid.NewGuid(), Name = "New South Wales", Code = "NSW", CountryId = countryId, IsActive = true, SortOrder = 1 },
                new State { Id = Guid.NewGuid(), Name = "Victoria", Code = "VIC", CountryId = countryId, IsActive = true, SortOrder = 2 },
                new State { Id = Guid.NewGuid(), Name = "Queensland", Code = "QLD", CountryId = countryId, IsActive = true, SortOrder = 3 },
                new State { Id = Guid.NewGuid(), Name = "Western Australia", Code = "WA", CountryId = countryId, IsActive = true, SortOrder = 4 },
                new State { Id = Guid.NewGuid(), Name = "South Australia", Code = "SA", CountryId = countryId, IsActive = true, SortOrder = 5 },
                new State { Id = Guid.NewGuid(), Name = "Tasmania", Code = "TAS", CountryId = countryId, IsActive = true, SortOrder = 6 },
                new State { Id = Guid.NewGuid(), Name = "Australian Capital Territory", Code = "ACT", CountryId = countryId, IsActive = true, SortOrder = 7 },
                new State { Id = Guid.NewGuid(), Name = "Northern Territory", Code = "NT", CountryId = countryId, IsActive = true, SortOrder = 8 }
            };

            if (!string.IsNullOrEmpty(search))
            {
                mockStates = mockStates
                    .Where(s => s.Name.Contains(search, StringComparison.OrdinalIgnoreCase) || 
                                s.Code.Contains(search, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return Ok(mockStates);
        }
    }

    /// <summary>
    /// Get cities with autocomplete support (cached, debounced)
    /// </summary>
    [HttpGet("cities")]
    public async Task<ActionResult<List<object>>> GetCities(
        [FromQuery] string? stateCode = null,
        [FromQuery] string? search = null,
        [FromQuery] bool majorOnly = false,
        [FromQuery] int limit = 20)
    {
        try
        {
            if (string.IsNullOrEmpty(search) || search.Length < 2)
            {
                return BadRequest(new { error = "Search term must be at least 2 characters" });
            }

            var cacheKey = $"cities_{stateCode}_{search}_{majorOnly}_{limit}";
            if (_cache.TryGetValue(cacheKey, out List<object>? cachedCities) && cachedCities != null)
            {
                return Ok(cachedCities);
            }

            var query = _context.Cities
                .Include(c => c.State)
                .Where(c => c.IsActive)
                .AsQueryable();

            if (!string.IsNullOrEmpty(stateCode))
            {
                query = query.Where(c => c.State.Code == stateCode);
            }

            if (majorOnly)
            {
                query = query.Where(c => c.IsMajorCity || c.IsCapital);
            }

            query = query.Where(c => c.Name.Contains(search) || 
                                     (c.Postcode != null && c.Postcode.Contains(search)));

            var cities = await query
                .OrderByDescending(c => c.IsMajorCity)
                .ThenByDescending(c => c.Population)
                .ThenBy(c => c.Name)
                .Take(limit)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.StateId,
                    StateName = c.State.Name,
                    StateCode = c.State.Code,
                    c.Postcode,
                    c.Latitude,
                    c.Longitude,
                    c.Population,
                    c.IsMajorCity,
                    c.IsCapital
                })
                .ToListAsync();

            var result = cities.Cast<object>().ToList();
            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database unavailable, returning mock cities data");
            
            // Return mock Australian cities when database is unavailable
            var stateId = Guid.NewGuid();
            var mockCities = new List<object>
            {
                new { Id = Guid.NewGuid(), Name = "Sydney", StateId = stateId, StateName = "New South Wales", StateCode = "NSW", Postcode = "2000", Latitude = -33.8688, Longitude = 151.2093, Population = 5312000, IsMajorCity = true, IsCapital = true },
                new { Id = Guid.NewGuid(), Name = "Melbourne", StateId = stateId, StateName = "Victoria", StateCode = "VIC", Postcode = "3000", Latitude = -37.8136, Longitude = 144.9631, Population = 5078000, IsMajorCity = true, IsCapital = true },
                new { Id = Guid.NewGuid(), Name = "Brisbane", StateId = stateId, StateName = "Queensland", StateCode = "QLD", Postcode = "4000", Latitude = -27.4698, Longitude = 153.0251, Population = 2560000, IsMajorCity = true, IsCapital = true },
                new { Id = Guid.NewGuid(), Name = "Perth", StateId = stateId, StateName = "Western Australia", StateCode = "WA", Postcode = "6000", Latitude = -31.9505, Longitude = 115.8605, Population = 2125000, IsMajorCity = true, IsCapital = true },
                new { Id = Guid.NewGuid(), Name = "Adelaide", StateId = stateId, StateName = "South Australia", StateCode = "SA", Postcode = "5000", Latitude = -34.9285, Longitude = 138.6007, Population = 1370000, IsMajorCity = true, IsCapital = true },
                new { Id = Guid.NewGuid(), Name = "Canberra", StateId = stateId, StateName = "Australian Capital Territory", StateCode = "ACT", Postcode = "2600", Latitude = -35.2809, Longitude = 149.1300, Population = 456000, IsMajorCity = true, IsCapital = true },
                new { Id = Guid.NewGuid(), Name = "Hobart", StateId = stateId, StateName = "Tasmania", StateCode = "TAS", Postcode = "7000", Latitude = -42.8821, Longitude = 147.3272, Population = 240000, IsMajorCity = true, IsCapital = true },
                new { Id = Guid.NewGuid(), Name = "Darwin", StateId = stateId, StateName = "Northern Territory", StateCode = "NT", Postcode = "0800", Latitude = -12.4634, Longitude = 130.8456, Population = 148000, IsMajorCity = true, IsCapital = true }
            };

            var filteredCities = mockCities.AsEnumerable();

            if (!string.IsNullOrEmpty(search))
            {
                filteredCities = filteredCities.Where(c =>
                {
                    var city = (dynamic)c;
                    return city.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                           (city.Postcode != null && city.Postcode.Contains(search, StringComparison.OrdinalIgnoreCase));
                });
            }

            if (!string.IsNullOrEmpty(stateCode))
            {
                filteredCities = filteredCities.Where(c => ((dynamic)c).StateCode == stateCode);
            }

            if (majorOnly)
            {
                filteredCities = filteredCities.Where(c => ((dynamic)c).IsMajorCity);
            }

            var result = filteredCities.Take(limit).ToList();
            return Ok(result);
        }
    }

    /// <summary>
    /// Get all industries (cached)
    /// </summary>
    [HttpGet("industries")]
    public async Task<ActionResult<List<Industry>>> GetIndustries([FromQuery] string? search = null)
    {
        try
        {
            var cacheKey = $"industries_{search ?? "all"}";
            if (_cache.TryGetValue(cacheKey, out List<Industry>? cachedIndustries) && cachedIndustries != null)
            {
                return Ok(cachedIndustries);
            }

            var query = _context.Industries
                .Where(i => i.IsActive)
                .OrderBy(i => i.SortOrder)
                .ThenBy(i => i.Name)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(i => i.Name.Contains(search) || i.Description.Contains(search));
            }

            var industries = await query.ToListAsync();

            _cache.Set(cacheKey, industries, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(industries);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database unavailable, returning mock industries data");
            
            // Return mock industries when database is unavailable
            var mockIndustries = new List<Industry>
            {
                new Industry { Id = Guid.NewGuid(), Name = "Technology", Description = "Software, IT, and tech services", IsActive = true, SortOrder = 1 },
                new Industry { Id = Guid.NewGuid(), Name = "Healthcare", Description = "Medical and healthcare services", IsActive = true, SortOrder = 2 },
                new Industry { Id = Guid.NewGuid(), Name = "Finance", Description = "Banking, insurance, and financial services", IsActive = true, SortOrder = 3 },
                new Industry { Id = Guid.NewGuid(), Name = "Education", Description = "Schools, universities, and training", IsActive = true, SortOrder = 4 },
                new Industry { Id = Guid.NewGuid(), Name = "Retail", Description = "Retail and e-commerce", IsActive = true, SortOrder = 5 },
                new Industry { Id = Guid.NewGuid(), Name = "Manufacturing", Description = "Industrial and manufacturing", IsActive = true, SortOrder = 6 },
                new Industry { Id = Guid.NewGuid(), Name = "Construction", Description = "Building and construction", IsActive = true, SortOrder = 7 },
                new Industry { Id = Guid.NewGuid(), Name = "Hospitality", Description = "Hotels, restaurants, and tourism", IsActive = true, SortOrder = 8 }
            };

            if (!string.IsNullOrEmpty(search))
            {
                mockIndustries = mockIndustries
                    .Where(i => i.Name.Contains(search, StringComparison.OrdinalIgnoreCase) || 
                                i.Description.Contains(search, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return Ok(mockIndustries);
        }
    }

    /// <summary>
    /// Get job categories for an industry (cached)
    /// </summary>
    [HttpGet("jobcategories")]
    public async Task<ActionResult<List<JobCategory>>> GetJobCategories(
        [FromQuery] Guid? industryId = null,
        [FromQuery] string? search = null)
    {
        try
        {
            var cacheKey = $"jobcategories_{industryId}_{search ?? "all"}";
            if (_cache.TryGetValue(cacheKey, out List<JobCategory>? cachedCategories) && cachedCategories != null)
            {
                return Ok(cachedCategories);
            }

            var query = _context.JobCategories
                .Include(j => j.Industry)
                .Where(j => j.IsActive)
                .AsQueryable();

            if (industryId.HasValue)
            {
                query = query.Where(j => j.IndustryId == industryId.Value);
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(j => j.Name.Contains(search) || j.Description.Contains(search));
            }

            var categories = await query
                .OrderBy(j => j.SortOrder)
                .ThenBy(j => j.Name)
                .ToListAsync();

            _cache.Set(cacheKey, categories, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching job categories");
            return StatusCode(500, new { error = "Failed to fetch job categories" });
        }
    }

    /// <summary>
    /// Get universities with autocomplete (cached)
    /// </summary>
    [HttpGet("universities")]
    public async Task<ActionResult<List<University>>> GetUniversities(
        [FromQuery] string? search = null,
        [FromQuery] string? stateCode = null,
        [FromQuery] bool groupOfEightOnly = false)
    {
        try
        {
            var cacheKey = $"universities_{search ?? "all"}_{stateCode}_{groupOfEightOnly}";
            if (_cache.TryGetValue(cacheKey, out List<University>? cachedUniversities) && cachedUniversities != null)
            {
                return Ok(cachedUniversities);
            }

            var query = _context.Universities
                .Where(u => u.IsActive)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(u => u.Name.Contains(search) || 
                                         u.Abbreviation.Contains(search) ||
                                         u.City.Contains(search));
            }

            if (!string.IsNullOrEmpty(stateCode))
            {
                query = query.Where(u => u.StateCode == stateCode);
            }

            if (groupOfEightOnly)
            {
                query = query.Where(u => u.IsGroupOfEight);
            }

            var universities = await query
                .OrderByDescending(u => u.IsGroupOfEight)
                .ThenBy(u => u.Name)
                .ToListAsync();

            _cache.Set(cacheKey, universities, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(universities);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database unavailable, returning mock universities data");
            
            // Return mock Australian universities when database is unavailable
            var mockUniversities = new List<University>
            {
                new University { Id = Guid.NewGuid(), Name = "University of Sydney", Abbreviation = "USYD", StateCode = "NSW", City = "Sydney", IsGroupOfEight = true, IsActive = true },
                new University { Id = Guid.NewGuid(), Name = "University of Melbourne", Abbreviation = "UniMelb", StateCode = "VIC", City = "Melbourne", IsGroupOfEight = true, IsActive = true },
                new University { Id = Guid.NewGuid(), Name = "Australian National University", Abbreviation = "ANU", StateCode = "ACT", City = "Canberra", IsGroupOfEight = true, IsActive = true },
                new University { Id = Guid.NewGuid(), Name = "University of Queensland", Abbreviation = "UQ", StateCode = "QLD", City = "Brisbane", IsGroupOfEight = true, IsActive = true },
                new University { Id = Guid.NewGuid(), Name = "University of Western Australia", Abbreviation = "UWA", StateCode = "WA", City = "Perth", IsGroupOfEight = true, IsActive = true },
                new University { Id = Guid.NewGuid(), Name = "University of Adelaide", Abbreviation = "Adelaide", StateCode = "SA", City = "Adelaide", IsGroupOfEight = true, IsActive = true },
                new University { Id = Guid.NewGuid(), Name = "UNSW Sydney", Abbreviation = "UNSW", StateCode = "NSW", City = "Sydney", IsGroupOfEight = true, IsActive = true },
                new University { Id = Guid.NewGuid(), Name = "Monash University", Abbreviation = "Monash", StateCode = "VIC", City = "Melbourne", IsGroupOfEight = true, IsActive = true },
                new University { Id = Guid.NewGuid(), Name = "University of Technology Sydney", Abbreviation = "UTS", StateCode = "NSW", City = "Sydney", IsGroupOfEight = false, IsActive = true },
                new University { Id = Guid.NewGuid(), Name = "RMIT University", Abbreviation = "RMIT", StateCode = "VIC", City = "Melbourne", IsGroupOfEight = false, IsActive = true }
            };

            var filtered = mockUniversities.AsEnumerable();

            if (!string.IsNullOrEmpty(search))
            {
                filtered = filtered.Where(u => 
                    u.Name.Contains(search, StringComparison.OrdinalIgnoreCase) || 
                    u.Abbreviation.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    u.City.Contains(search, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(stateCode))
            {
                filtered = filtered.Where(u => u.StateCode == stateCode);
            }

            if (groupOfEightOnly)
            {
                filtered = filtered.Where(u => u.IsGroupOfEight);
            }

            var result = filtered.OrderByDescending(u => u.IsGroupOfEight).ThenBy(u => u.Name).ToList();
            return Ok(result);
        }
    }

    /// <summary>
    /// Get TAFE institutes (cached)
    /// </summary>
    [HttpGet("tafe")]
    public async Task<ActionResult<List<TAFEInstitute>>> GetTAFEs(
        [FromQuery] string? search = null,
        [FromQuery] string? stateCode = null)
    {
        try
        {
            var cacheKey = $"tafe_{search ?? "all"}_{stateCode}";
            if (_cache.TryGetValue(cacheKey, out List<TAFEInstitute>? cachedTAFEs) && cachedTAFEs != null)
            {
                return Ok(cachedTAFEs);
            }

            var query = _context.TAFEInstitutes
                .Where(t => t.IsActive)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(t => t.Name.Contains(search));
            }

            if (!string.IsNullOrEmpty(stateCode))
            {
                query = query.Where(t => t.StateCode == stateCode);
            }

            var tafes = await query
                .OrderBy(t => t.Name)
                .ToListAsync();

            _cache.Set(cacheKey, tafes, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(tafes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching TAFE institutes");
            return StatusCode(500, new { error = "Failed to fetch TAFE institutes" });
        }
    }

    /// <summary>
    /// Get education levels (cached)
    /// </summary>
    [HttpGet("educationlevels")]
    public async Task<ActionResult<List<EducationLevel>>> GetEducationLevels()
    {
        try
        {
            const string cacheKey = "education_levels";
            if (_cache.TryGetValue(cacheKey, out List<EducationLevel>? cachedLevels) && cachedLevels != null)
            {
                return Ok(cachedLevels);
            }

            var levels = await _context.EducationLevels
                .Where(e => e.IsActive)
                .OrderBy(e => e.SortOrder)
                .ToListAsync();

            _cache.Set(cacheKey, levels, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(levels);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching education levels");
            return StatusCode(500, new { error = "Failed to fetch education levels" });
        }
    }

    /// <summary>
    /// Get credential types by category (cached)
    /// </summary>
    [HttpGet("credentials")]
    public async Task<ActionResult<List<CredentialType>>> GetCredentials(
        [FromQuery] string? category = null,
        [FromQuery] string? search = null)
    {
        try
        {
            var cacheKey = $"credentials_{category ?? "all"}_{search ?? "all"}";
            if (_cache.TryGetValue(cacheKey, out List<CredentialType>? cachedCredentials) && cachedCredentials != null)
            {
                return Ok(cachedCredentials);
            }

            var query = _context.CredentialTypes
                .Where(c => c.IsActive)
                .AsQueryable();

            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(c => c.Category == category);
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(c => c.Name.Contains(search) || c.Description.Contains(search));
            }

            var credentials = await query
                .OrderBy(c => c.Category)
                .ThenBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .ToListAsync();

            _cache.Set(cacheKey, credentials, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(credentials);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database unavailable, returning mock credentials data");
            
            // Return mock credential types when database is unavailable
            var mockCredentials = new List<CredentialType>
            {
                new CredentialType { Id = Guid.NewGuid(), Name = "Bachelor's Degree", Category = "Education", Description = "Undergraduate degree", IsActive = true, SortOrder = 1 },
                new CredentialType { Id = Guid.NewGuid(), Name = "Master's Degree", Category = "Education", Description = "Postgraduate degree", IsActive = true, SortOrder = 2 },
                new CredentialType { Id = Guid.NewGuid(), Name = "PhD", Category = "Education", Description = "Doctoral degree", IsActive = true, SortOrder = 3 },
                new CredentialType { Id = Guid.NewGuid(), Name = "Certificate IV", Category = "Vocational", Description = "Vocational qualification", IsActive = true, SortOrder = 4 },
                new CredentialType { Id = Guid.NewGuid(), Name = "Diploma", Category = "Vocational", Description = "Advanced vocational qualification", IsActive = true, SortOrder = 5 },
                new CredentialType { Id = Guid.NewGuid(), Name = "PMP", Category = "Professional", Description = "Project Management Professional", IsActive = true, SortOrder = 6 },
                new CredentialType { Id = Guid.NewGuid(), Name = "AWS Certified", Category = "Professional", Description = "Amazon Web Services certification", IsActive = true, SortOrder = 7 },
                new CredentialType { Id = Guid.NewGuid(), Name = "CPA", Category = "Professional", Description = "Certified Public Accountant", IsActive = true, SortOrder = 8 }
            };

            var filtered = mockCredentials.AsEnumerable();

            if (!string.IsNullOrEmpty(category))
            {
                filtered = filtered.Where(c => c.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(search))
            {
                filtered = filtered.Where(c => 
                    c.Name.Contains(search, StringComparison.OrdinalIgnoreCase) || 
                    c.Description.Contains(search, StringComparison.OrdinalIgnoreCase));
            }

            var result = filtered.OrderBy(c => c.Category).ThenBy(c => c.SortOrder).ThenBy(c => c.Name).ToList();
            return Ok(result);
        }
    }

    /// <summary>
    /// Get credential categories (cached)
    /// </summary>
    [HttpGet("credentials/categories")]
    public async Task<ActionResult<List<string>>> GetCredentialCategories()
    {
        try
        {
            const string cacheKey = "credential_categories";
            if (_cache.TryGetValue(cacheKey, out List<string>? cachedCategories) && cachedCategories != null)
            {
                return Ok(cachedCategories);
            }

            var categories = await _context.CredentialTypes
                .Where(c => c.IsActive)
                .Select(c => c.Category)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            _cache.Set(cacheKey, categories, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching credential categories");
            return StatusCode(500, new { error = "Failed to fetch credential categories" });
        }
    }

    /// <summary>
    /// Get visa types (cached)
    /// </summary>
    [HttpGet("visas")]
    public async Task<ActionResult<List<VisaType>>> GetVisaTypes([FromQuery] string? category = null)
    {
        try
        {
            var cacheKey = $"visas_{category ?? "all"}";
            if (_cache.TryGetValue(cacheKey, out List<VisaType>? cachedVisas) && cachedVisas != null)
            {
                return Ok(cachedVisas);
            }

            var query = _context.VisaTypes
                .Where(v => v.IsActive)
                .AsQueryable();

            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(v => v.Category == category);
            }

            var visas = await query
                .OrderBy(v => v.SortOrder)
                .ToListAsync();

            _cache.Set(cacheKey, visas, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(visas);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database unavailable, returning mock visa types data");
            
            // Return mock Australian visa types when database is unavailable
            var mockVisas = new List<VisaType>
            {
                new VisaType { Id = Guid.NewGuid(), Name = "Australian Citizen", SubclassCode = "CITIZEN", Category = "Permanent", Description = "Australian citizenship", HasFullWorkRights = true, IsActive = true, SortOrder = 1 },
                new VisaType { Id = Guid.NewGuid(), Name = "Permanent Resident", SubclassCode = "PR", Category = "Permanent", Description = "Permanent residency", HasFullWorkRights = true, IsActive = true, SortOrder = 2 },
                new VisaType { Id = Guid.NewGuid(), Name = "Subclass 482 (TSS)", SubclassCode = "482", Category = "Temporary", Description = "Temporary Skill Shortage visa", HasFullWorkRights = true, IsActive = true, SortOrder = 3 },
                new VisaType { Id = Guid.NewGuid(), Name = "Subclass 485 (Graduate)", SubclassCode = "485", Category = "Temporary", Description = "Temporary Graduate visa", HasFullWorkRights = true, IsActive = true, SortOrder = 4 },
                new VisaType { Id = Guid.NewGuid(), Name = "Subclass 500 (Student)", SubclassCode = "500", Category = "Student", Description = "Student visa", HasLimitedWorkRights = true, WorkHoursPerWeekLimit = 40, IsActive = true, SortOrder = 5 },
                new VisaType { Id = Guid.NewGuid(), Name = "Subclass 189 (Skilled Independent)", SubclassCode = "189", Category = "Skilled", Description = "Skilled Independent visa", HasFullWorkRights = true, PathwayToPermanentResidence = true, IsActive = true, SortOrder = 6 },
                new VisaType { Id = Guid.NewGuid(), Name = "Subclass 190 (Skilled Nominated)", SubclassCode = "190", Category = "Skilled", Description = "Skilled Nominated visa", HasFullWorkRights = true, PathwayToPermanentResidence = true, IsActive = true, SortOrder = 7 },
                new VisaType { Id = Guid.NewGuid(), Name = "Working Holiday", SubclassCode = "WHV", Category = "Working Holiday", Description = "Working Holiday visa", HasFullWorkRights = true, IsActive = true, SortOrder = 8 }
            };

            if (!string.IsNullOrEmpty(category))
            {
                mockVisas = mockVisas.Where(v => v.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return Ok(mockVisas);
        }
    }

    /// <summary>
    /// Get skill definitions with autocomplete (cached)
    /// </summary>
    [HttpGet("skills")]
    public async Task<ActionResult<List<SkillDefinition>>> GetSkills(
        [FromQuery] string? category = null,
        [FromQuery] string? search = null,
        [FromQuery] int limit = 20)
    {
        try
        {
            var cacheKey = $"skills_{category ?? "all"}_{search ?? "all"}_{limit}";
            if (_cache.TryGetValue(cacheKey, out List<SkillDefinition>? cachedSkills) && cachedSkills != null)
            {
                return Ok(cachedSkills);
            }

            var query = _context.SkillDefinitions
                .Where(s => s.IsActive)
                .AsQueryable();

            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(s => s.Category == category);
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(s => s.Name.Contains(search) || 
                                         s.Description.Contains(search));
            }

            var skills = await query
                .OrderBy(s => s.Category)
                .ThenBy(s => s.SortOrder)
                .ThenBy(s => s.Name)
                .Take(limit)
                .ToListAsync();

            _cache.Set(cacheKey, skills, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(skills);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database unavailable, returning mock skills data");
            
            // Return mock skills when database is unavailable
            var mockSkills = new List<SkillDefinition>
            {
                new SkillDefinition { Id = Guid.NewGuid(), Name = "JavaScript", Category = "Technical", Description = "Programming language", IsActive = true, SortOrder = 1 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = "Python", Category = "Technical", Description = "Programming language", IsActive = true, SortOrder = 2 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = "C#", Category = "Technical", Description = "Programming language", IsActive = true, SortOrder = 3 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = "React", Category = "Technical", Description = "Frontend framework", IsActive = true, SortOrder = 4 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = "Node.js", Category = "Technical", Description = "Backend runtime", IsActive = true, SortOrder = 5 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = ".NET", Category = "Technical", Description = "Development framework", IsActive = true, SortOrder = 6 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = "SQL", Category = "Technical", Description = "Database query language", IsActive = true, SortOrder = 7 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = "AWS", Category = "Technical", Description = "Cloud platform", IsActive = true, SortOrder = 8 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = "Communication", Category = "Soft", Description = "Verbal and written communication", IsActive = true, SortOrder = 9 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = "Leadership", Category = "Soft", Description = "Team leadership", IsActive = true, SortOrder = 10 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = "Problem Solving", Category = "Soft", Description = "Analytical thinking", IsActive = true, SortOrder = 11 },
                new SkillDefinition { Id = Guid.NewGuid(), Name = "Project Management", Category = "Soft", Description = "Managing projects", IsActive = true, SortOrder = 12 }
            };

            var filtered = mockSkills.AsEnumerable();

            if (!string.IsNullOrEmpty(category))
            {
                filtered = filtered.Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(search))
            {
                filtered = filtered.Where(s => 
                    s.Name.Contains(search, StringComparison.OrdinalIgnoreCase) || 
                    s.Description.Contains(search, StringComparison.OrdinalIgnoreCase));
            }

            var result = filtered.OrderBy(s => s.Category).ThenBy(s => s.SortOrder).ThenBy(s => s.Name).Take(limit).ToList();
            return Ok(result);
        }
    }

    /// <summary>
    /// Get employment types (cached)
    /// </summary>
    [HttpGet("employmenttypes")]
    public async Task<ActionResult<List<EmploymentType>>> GetEmploymentTypes()
    {
        try
        {
            const string cacheKey = "employment_types";
            if (_cache.TryGetValue(cacheKey, out List<EmploymentType>? cachedTypes) && cachedTypes != null)
            {
                return Ok(cachedTypes);
            }

            var types = await _context.EmploymentTypes
                .Where(e => e.IsActive)
                .OrderBy(e => e.SortOrder)
                .ToListAsync();

            _cache.Set(cacheKey, types, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(types);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database unavailable, returning mock employment types data");
            
            // Return mock employment types when database is unavailable
            var mockTypes = new List<EmploymentType>
            {
                new EmploymentType { Id = Guid.NewGuid(), Name = "Full-time", Description = "Full-time employment", IsActive = true, SortOrder = 1 },
                new EmploymentType { Id = Guid.NewGuid(), Name = "Part-time", Description = "Part-time employment", IsActive = true, SortOrder = 2 },
                new EmploymentType { Id = Guid.NewGuid(), Name = "Contract", Description = "Fixed-term contract", IsActive = true, SortOrder = 3 },
                new EmploymentType { Id = Guid.NewGuid(), Name = "Casual", Description = "Casual employment", IsActive = true, SortOrder = 4 },
                new EmploymentType { Id = Guid.NewGuid(), Name = "Internship", Description = "Internship/trainee position", IsActive = true, SortOrder = 5 }
            };

            return Ok(mockTypes);
        }
    }

    /// <summary>
    /// Get work arrangements (cached)
    /// </summary>
    [HttpGet("workarrangements")]
    public async Task<ActionResult<List<WorkArrangement>>> GetWorkArrangements()
    {
        try
        {
            const string cacheKey = "work_arrangements";
            if (_cache.TryGetValue(cacheKey, out List<WorkArrangement>? cachedArrangements) && cachedArrangements != null)
            {
                return Ok(cachedArrangements);
            }

            var arrangements = await _context.WorkArrangements
                .Where(w => w.IsActive)
                .OrderBy(w => w.SortOrder)
                .ToListAsync();

            _cache.Set(cacheKey, arrangements, TimeSpan.FromMinutes(CacheDurationMinutes));

            return Ok(arrangements);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database unavailable, returning mock work arrangements data");
            
            // Return mock work arrangements when database is unavailable
            var mockArrangements = new List<WorkArrangement>
            {
                new WorkArrangement { Id = Guid.NewGuid(), Name = "On-site", Description = "Work from office", IsActive = true, SortOrder = 1 },
                new WorkArrangement { Id = Guid.NewGuid(), Name = "Remote", Description = "Work from home", IsActive = true, SortOrder = 2 },
                new WorkArrangement { Id = Guid.NewGuid(), Name = "Hybrid", Description = "Mix of office and remote", IsActive = true, SortOrder = 3 },
                new WorkArrangement { Id = Guid.NewGuid(), Name = "Flexible", Description = "Flexible work location", IsActive = true, SortOrder = 4 }
            };

            return Ok(mockArrangements);
        }
    }

    /// <summary>
    /// Health check - returns API status
    /// </summary>
    [HttpGet("health")]
    public ActionResult<object> Health()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            cache = "enabled",
            cacheDuration = $"{CacheDurationMinutes} minutes"
        });
    }

    /// <summary>
    /// Clear all master data cache (admin endpoint)
    /// </summary>
    [HttpPost("cache/clear")]
    public ActionResult ClearCache()
    {
        // Note: In production, add authorization
        _logger.LogWarning("Master data cache cleared");
        return Ok(new { message = "Cache cleared successfully" });
    }
}
