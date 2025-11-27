using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/map")]
public class MapIntelligenceController : ControllerBase
{
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<MapIntelligenceController> _logger;

    public MapIntelligenceController(
        IMemoryCache cache,
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<MapIntelligenceController> logger)
    {
        _cache = cache;
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Calculate route with travel time, distance, and estimated costs including tolls
    /// </summary>
    [HttpPost("route")]
    public async Task<ActionResult<RouteResponse>> CalculateRoute([FromBody] RouteRequest request)
    {
        _logger.LogInformation("Calculating route from {Origin} to {Destination}", request.Origin, request.Destination);

        var cacheKey = $"route_{request.Origin.Latitude}_{request.Origin.Longitude}_{request.Destination.Latitude}_{request.Destination.Longitude}_{request.TravelMode}";
        
        if (_cache.TryGetValue(cacheKey, out RouteResponse? cached) && cached != null)
        {
            return Ok(cached);
        }

        var mapboxToken = _configuration["Mapbox:AccessToken"];
        
        // Call Mapbox Directions API
        var url = $"https://api.mapbox.com/directions/v5/mapbox/{request.TravelMode}/{request.Origin.Longitude},{request.Origin.Latitude};{request.Destination.Longitude},{request.Destination.Latitude}?geometries=geojson&steps=true&annotations=distance,duration&access_token={mapboxToken}";

        try
        {
            var response = await _httpClient.GetAsync(url);
            var jsonString = await response.Content.ReadAsStringAsync();
            var mapboxResponse = JsonSerializer.Deserialize<JsonElement>(jsonString);

            if (!mapboxResponse.TryGetProperty("routes", out var routes) || routes.GetArrayLength() == 0)
            {
                return NotFound(new { error = "No route found" });
            }

            var route = routes[0];
            var distance = route.GetProperty("distance").GetDouble() / 1000; // meters to km
            var duration = route.GetProperty("duration").GetDouble() / 60; // seconds to minutes
            var geometry = route.GetProperty("geometry");

            // Estimate costs
            var fuelCost = CalculateFuelCost(distance, request.TravelMode);
            var tollCost = await EstimateTollCosts(request.Origin, request.Destination);
            var parkingCost = request.TravelMode == "driving" ? 20.0 : 0; // Daily parking estimate
            var publicTransportCost = request.TravelMode != "driving" ? CalculatePublicTransportCost(distance) : 0;

            var routeResponse = new RouteResponse
            {
                Distance = Math.Round(distance, 2),
                Duration = Math.Round(duration, 2),
                Geometry = geometry,
                FuelCost = Math.Round(fuelCost, 2),
                TollCost = Math.Round(tollCost, 2),
                ParkingCost = parkingCost,
                PublicTransportCost = Math.Round(publicTransportCost, 2),
                TotalCost = Math.Round(fuelCost + tollCost + parkingCost + publicTransportCost, 2),
                TravelMode = request.TravelMode
            };

            _cache.Set(cacheKey, routeResponse, TimeSpan.FromHours(6));

            return Ok(routeResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating route");
            
            // Return mock data if API fails
            return Ok(new RouteResponse
            {
                Distance = 15.5,
                Duration = 25.0,
                FuelCost = 3.50,
                TollCost = 5.00,
                ParkingCost = 20.00,
                PublicTransportCost = 0,
                TotalCost = 28.50,
                TravelMode = request.TravelMode,
                Geometry = null
            });
        }
    }

    /// <summary>
    /// Find schools within specified radius with travel time estimates
    /// </summary>
    [HttpPost("schools")]
    public async Task<ActionResult<List<SchoolResult>>> FindSchools([FromBody] SchoolSearchRequest request)
    {
        _logger.LogInformation("Finding schools within {Radius}km of ({Lat}, {Lng})", 
            request.RadiusKm, request.Location.Latitude, request.Location.Longitude);

        var cacheKey = $"schools_{request.Location.Latitude}_{request.Location.Longitude}_{request.RadiusKm}_{request.SchoolType}";
        
        if (_cache.TryGetValue(cacheKey, out List<SchoolResult>? cached) && cached != null)
        {
            return Ok(cached);
        }

        // Generate mock school data for Australian cities
        var schools = GenerateMockSchools(request.Location, request.RadiusKm, request.SchoolType);

        // Calculate travel times for each school
        foreach (var school in schools)
        {
            school.TravelTimeDriving = CalculateTravelTime(request.Location, school.Location, "driving");
            school.TravelTimePublicTransport = CalculateTravelTime(request.Location, school.Location, "transit");
            school.TravelTimeWalking = CalculateTravelTime(request.Location, school.Location, "walking");
        }

        _cache.Set(cacheKey, schools, TimeSpan.FromHours(24));

        return Ok(schools);
    }

    /// <summary>
    /// Find rental and sale properties in area with pricing
    /// </summary>
    [HttpPost("properties")]
    public async Task<ActionResult<PropertySearchResponse>> FindProperties([FromBody] PropertySearchRequest request)
    {
        _logger.LogInformation("Finding properties in {Suburb}, {State}", request.Suburb, request.State);

        var cacheKey = $"properties_{request.Suburb}_{request.State}_{request.PropertyType}_{request.Bedrooms}";
        
        if (_cache.TryGetValue(cacheKey, out PropertySearchResponse? cached) && cached != null)
        {
            return Ok(cached);
        }

        var properties = GenerateMockProperties(request);
        var medianPrices = CalculateMedianPrices(properties);
        var agents = GetLocalRealEstateAgents(request.Suburb, request.State);

        var response = new PropertySearchResponse
        {
            Properties = properties,
            MedianPrices = medianPrices,
            Agents = agents,
            TotalResults = properties.Count
        };

        _cache.Set(cacheKey, response, TimeSpan.FromHours(6));

        return Ok(response);
    }

    /// <summary>
    /// Get comprehensive relocation information for an area
    /// </summary>
    [HttpGet("relocation-info")]
    public async Task<ActionResult<RelocationInfo>> GetRelocationInfo(
        [FromQuery] string suburb,
        [FromQuery] string state,
        [FromQuery] double latitude,
        [FromQuery] double longitude)
    {
        _logger.LogInformation("Getting relocation info for {Suburb}, {State}", suburb, state);

        var cacheKey = $"relocation_{suburb}_{state}";
        
        if (_cache.TryGetValue(cacheKey, out RelocationInfo? cached) && cached != null)
        {
            return Ok(cached);
        }

        var info = new RelocationInfo
        {
            Suburb = suburb,
            State = state,
            MovingCompanies = GetMovingCompanies(suburb, state),
            UtilityProviders = GetUtilityProviders(state),
            LocalServices = GetLocalServices(latitude, longitude),
            SchoolEnrollment = GetSchoolEnrollmentInfo(suburb, state),
            PublicTransport = GetPublicTransportInfo(latitude, longitude),
            Demographics = GetDemographics(suburb, state)
        };

        _cache.Set(cacheKey, info, TimeSpan.FromDays(7));

        return Ok(info);
    }

    /// <summary>
    /// Search for businesses (both platform and external)
    /// </summary>
    [HttpPost("businesses-comprehensive")]
    public async Task<ActionResult<ComprehensiveBusinessSearchResponse>> SearchBusinessesComprehensive(
        [FromBody] ComprehensiveBusinessSearchRequest request)
    {
        _logger.LogInformation("Comprehensive business search: {Query} near ({Lat}, {Lng})", 
            request.Query, request.Location.Latitude, request.Location.Longitude);

        // Get platform businesses
        var platformBusinesses = await GetPlatformBusinesses(request);

        // Get external businesses (Google Places, Yelp, etc.)
        var externalBusinesses = await GetExternalBusinesses(request);

        return Ok(new ComprehensiveBusinessSearchResponse
        {
            PlatformBusinesses = platformBusinesses,
            ExternalBusinesses = externalBusinesses,
            TotalResults = platformBusinesses.Count + externalBusinesses.Count
        });
    }

    // Helper methods

    private double CalculateFuelCost(double distanceKm, string travelMode)
    {
        if (travelMode != "driving") return 0;
        
        const double fuelPricePerLiter = 1.85; // AUD
        const double averageConsumption = 8.5; // L/100km
        return (distanceKm * averageConsumption / 100) * fuelPricePerLiter;
    }

    private async Task<double> EstimateTollCosts(LocationPoint origin, LocationPoint destination)
    {
        // Mock toll estimation - in production, integrate with toll road APIs
        var distance = CalculateDistance(origin, destination);
        
        // Sydney has more tolls
        if (IsInSydney(origin) || IsInSydney(destination))
        {
            return distance > 20 ? 10.0 : distance > 10 ? 5.0 : 0;
        }
        
        return 0;
    }

    private double CalculatePublicTransportCost(double distanceKm)
    {
        // Opal card pricing (Sydney example)
        if (distanceKm <= 10) return 3.61;
        if (distanceKm <= 20) return 4.71;
        if (distanceKm <= 35) return 5.74;
        if (distanceKm <= 65) return 7.38;
        return 8.97;
    }

    private List<SchoolResult> GenerateMockSchools(LocationPoint location, double radiusKm, string? schoolType)
    {
        var random = new Random(location.Latitude.GetHashCode());
        var schools = new List<SchoolResult>();

        var schoolTypes = new[] { "Primary", "Secondary", "High School", "Private", "Public" };
        var schoolNames = new[] { "St Mary's", "Riverside", "Parkside", "Mountain View", "Central", "North", "South", "East", "West" };

        for (int i = 0; i < 10; i++)
        {
            var angle = random.NextDouble() * Math.PI * 2;
            var distance = random.NextDouble() * radiusKm;
            var latOffset = distance * Math.Cos(angle) / 111.0; // Rough km to degrees
            var lngOffset = distance * Math.Sin(angle) / (111.0 * Math.Cos(location.Latitude * Math.PI / 180));

            schools.Add(new SchoolResult
            {
                Id = Guid.NewGuid().ToString(),
                Name = $"{schoolNames[random.Next(schoolNames.Length)]} {schoolTypes[random.Next(schoolTypes.Length)]} School",
                Type = schoolTypes[random.Next(schoolTypes.Length)],
                Location = new LocationPoint
                {
                    Latitude = location.Latitude + latOffset,
                    Longitude = location.Longitude + lngOffset
                },
                Distance = Math.Round(distance, 2),
                Rating = Math.Round(3.5 + random.NextDouble() * 1.5, 1),
                StudentCount = random.Next(200, 1200),
                IsPublic = random.Next(0, 2) == 0,
                Fees = random.Next(0, 2) == 0 ? null : $"${random.Next(5000, 25000)}/year",
                Website = $"https://www.{schoolNames[random.Next(schoolNames.Length)].ToLower()}school.edu.au"
            });
        }

        return schools.OrderBy(s => s.Distance).ToList();
    }

    private double CalculateTravelTime(LocationPoint origin, LocationPoint destination, string mode)
    {
        var distance = CalculateDistance(origin, destination);
        
        return mode switch
        {
            "driving" => distance / 50 * 60, // 50 km/h average, result in minutes
            "transit" => distance / 35 * 60, // 35 km/h average
            "walking" => distance / 5 * 60,  // 5 km/h average
            _ => distance / 40 * 60
        };
    }

    private double CalculateDistance(LocationPoint p1, LocationPoint p2)
    {
        const double R = 6371; // Earth's radius in km
        var dLat = (p2.Latitude - p1.Latitude) * Math.PI / 180;
        var dLon = (p2.Longitude - p1.Longitude) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(p1.Latitude * Math.PI / 180) * Math.Cos(p2.Latitude * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private bool IsInSydney(LocationPoint location)
    {
        return location.Latitude >= -34.2 && location.Latitude <= -33.5 &&
               location.Longitude >= 150.5 && location.Longitude <= 151.5;
    }

    private List<PropertyResult> GenerateMockProperties(PropertySearchRequest request)
    {
        var random = new Random();
        var properties = new List<PropertyResult>();

        // Get approximate coordinates for suburb (Sydney as default)
        var baseCoords = GetSuburbCoordinates(request.Suburb, request.State);

        for (int i = 0; i < 20; i++)
        {
            var bedrooms = request.Bedrooms ?? random.Next(1, 5);
            var basePrice = request.PropertyType == "rent" ? 400 : 600000;
            var price = basePrice + (bedrooms * (request.PropertyType == "rent" ? 150 : 200000));

            // Generate property location within suburb (scatter properties within ~5km radius)
            var angle = random.NextDouble() * Math.PI * 2;
            var distance = random.NextDouble() * 5; // 5km radius
            var latOffset = distance * Math.Cos(angle) / 111.0;
            var lngOffset = distance * Math.Sin(angle) / (111.0 * Math.Cos(baseCoords.Latitude * Math.PI / 180));

            properties.Add(new PropertyResult
            {
                Id = Guid.NewGuid().ToString(),
                Address = $"{random.Next(1, 200)} {GetRandomStreetName()}",
                Suburb = request.Suburb,
                State = request.State,
                PropertyType = request.PropertyType,
                Bedrooms = bedrooms,
                Bathrooms = random.Next(1, 4),
                Parking = random.Next(0, 3),
                Price = price + random.Next(-50000, 50000),
                PriceText = request.PropertyType == "rent" ? $"${price}/week" : $"${price:N0}",
                Description = "Modern property in great location with excellent amenities nearby.",
                Image = $"https://images.unsplash.com/photo-{1558036117}-15d82a90b9b1?w=800",
                ListingUrl = $"https://www.domain.com.au/property-{i}",
                Location = new LocationPoint
                {
                    Latitude = baseCoords.Latitude + latOffset,
                    Longitude = baseCoords.Longitude + lngOffset
                }
            });
        }

        return properties;
    }

    private Dictionary<string, double> CalculateMedianPrices(List<PropertyResult> properties)
    {
        var grouped = properties.GroupBy(p => p.Bedrooms).OrderBy(g => g.Key);
        var medians = new Dictionary<string, double>();

        foreach (var group in grouped)
        {
            var prices = group.Select(p => (double)p.Price).OrderBy(p => p).ToList();
            var median = prices.Count % 2 == 0
                ? (prices[prices.Count / 2 - 1] + prices[prices.Count / 2]) / 2
                : prices[prices.Count / 2];
            
            medians[$"{group.Key}bed"] = Math.Round(median, 0);
        }

        return medians;
    }

    private List<RealEstateAgent> GetLocalRealEstateAgents(string suburb, string state)
    {
        return new List<RealEstateAgent>
        {
            new() { Name = "Ray White", Phone = "1300 RAY WHITE", Website = "https://www.raywhite.com", Specialty = "Residential & Commercial" },
            new() { Name = "LJ Hooker", Phone = "13 00 54", Website = "https://www.ljhooker.com.au", Specialty = "Property Management" },
            new() { Name = "Century 21", Phone = "1300 885 210", Website = "https://www.century21.com.au", Specialty = "Sales & Leasing" },
            new() { Name = "Harcourts", Phone = "1300 622 683", Website = "https://www.harcourts.com.au", Specialty = "Residential Sales" }
        };
    }

    private List<ServiceProvider> GetMovingCompanies(string suburb, string state)
    {
        return new List<ServiceProvider>
        {
            new() { Name = "Two Men and a Truck", Phone = "1800 810 873", Website = "https://www.twomen.com.au", Category = "Removalists" },
            new() { Name = "Brilliant Removals", Phone = "1300 000 000", Website = "https://www.brilliantremovals.com.au", Category = "Removalists" },
            new() { Name = "Allied Pickfords", Phone = "131 420", Website = "https://www.alliedpickfords.com.au", Category = "Removalists" }
        };
    }

    private List<ServiceProvider> GetUtilityProviders(string state)
    {
        return new List<ServiceProvider>
        {
            new() { Name = "AGL", Phone = "131 245", Website = "https://www.agl.com.au", Category = "Electricity & Gas" },
            new() { Name = "Origin Energy", Phone = "13 24 61", Website = "https://www.originenergy.com.au", Category = "Electricity & Gas" },
            new() { Name = "Sydney Water", Phone = "13 20 92", Website = "https://www.sydneywater.com.au", Category = "Water" },
            new() { Name = "Telstra", Phone = "13 22 00", Website = "https://www.telstra.com.au", Category = "Internet & Phone" }
        };
    }

    private List<LocalService> GetLocalServices(double latitude, double longitude)
    {
        return new List<LocalService>
        {
            new() { Name = "Local Medical Centre", Category = "Healthcare", Distance = 0.5, Address = "123 Main St" },
            new() { Name = "Shopping Centre", Category = "Retail", Distance = 1.2, Address = "456 High St" },
            new() { Name = "Train Station", Category = "Transport", Distance = 0.8, Address = "Railway Pde" },
            new() { Name = "Public Library", Category = "Community", Distance = 1.5, Address = "789 Park Ave" }
        };
    }

    private SchoolEnrollmentInfo GetSchoolEnrollmentInfo(string suburb, string state)
    {
        return new SchoolEnrollmentInfo
        {
            EnrollmentProcess = "Contact school directly for enrollment",
            RequiredDocuments = new List<string> { "Birth Certificate", "Proof of Address", "Immunization Records" },
            CatchmentUrl = $"https://education.nsw.gov.au/school-finder",
            DeadlinePeriod = "Applications open Term 4 (October) for following year"
        };
    }

    private TransportInfo GetPublicTransportInfo(double latitude, double longitude)
    {
        return new TransportInfo
        {
            NearestStation = "Central Station",
            StationDistance = 1.2,
            BusRoutes = new List<string> { "M10", "M20", "370", "372" },
            TrainLines = new List<string> { "T1 North Shore", "T2 Inner West" },
            TransportUrl = "https://transportnsw.info"
        };
    }

    private Demographics GetDemographics(string suburb, string state)
    {
        return new Demographics
        {
            Population = 25000,
            MedianAge = 35,
            MedianHouseholdIncome = 85000,
            UnemploymentRate = 4.5,
            AverageFamilySize = 2.7
        };
    }

    private async Task<List<BusinessMarker>> GetPlatformBusinesses(ComprehensiveBusinessSearchRequest request)
    {
        // This would query your actual business database
        return new List<BusinessMarker>();
    }

    private async Task<List<ExternalBusiness>> GetExternalBusinesses(ComprehensiveBusinessSearchRequest request)
    {
        // This would call Google Places or similar API
        return new List<ExternalBusiness>();
    }

    private string GetRandomStreetName()
    {
        var streets = new[] { "Main St", "High St", "George St", "Elizabeth St", "York St", "Park Ave", "Railway Pde" };
        return streets[new Random().Next(streets.Length)];
    }

    private LocationPoint GetSuburbCoordinates(string suburb, string state)
    {
        // Return approximate coordinates for major Australian suburbs
        var coords = (suburb.ToLower(), state.ToUpper()) switch
        {
            ("sydney", "NSW") or ("", "NSW") => new LocationPoint { Latitude = -33.8688, Longitude = 151.2093 },
            ("melbourne", "VIC") or ("", "VIC") => new LocationPoint { Latitude = -37.8136, Longitude = 144.9631 },
            ("brisbane", "QLD") or ("", "QLD") => new LocationPoint { Latitude = -27.4698, Longitude = 153.0251 },
            ("perth", "WA") or ("", "WA") => new LocationPoint { Latitude = -31.9505, Longitude = 115.8605 },
            ("adelaide", "SA") or ("", "SA") => new LocationPoint { Latitude = -34.9285, Longitude = 138.6007 },
            ("gold coast", "QLD") => new LocationPoint { Latitude = -28.0167, Longitude = 153.4000 },
            ("canberra", "ACT") or ("", "ACT") => new LocationPoint { Latitude = -35.2809, Longitude = 149.1300 },
            ("hobart", "TAS") or ("", "TAS") => new LocationPoint { Latitude = -42.8821, Longitude = 147.3272 },
            _ => new LocationPoint { Latitude = -33.8688, Longitude = 151.2093 }
        };
        return coords;
    }
}

// Request/Response Models

public class RouteRequest
{
    public LocationPoint Origin { get; set; } = new();
    public LocationPoint Destination { get; set; } = new();
    public string TravelMode { get; set; } = "driving"; // driving, walking, cycling, transit
}

public class RouteResponse
{
    public double Distance { get; set; } // km
    public double Duration { get; set; } // minutes
    public JsonElement? Geometry { get; set; }
    public double FuelCost { get; set; }
    public double TollCost { get; set; }
    public double ParkingCost { get; set; }
    public double PublicTransportCost { get; set; }
    public double TotalCost { get; set; }
    public string TravelMode { get; set; } = "";
}

public class SchoolSearchRequest
{
    public LocationPoint Location { get; set; } = new();
    public double RadiusKm { get; set; } = 5;
    public string? SchoolType { get; set; } // Primary, Secondary, etc
}

public class SchoolResult
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public LocationPoint Location { get; set; } = new();
    public double Distance { get; set; }
    public double TravelTimeDriving { get; set; }
    public double TravelTimePublicTransport { get; set; }
    public double TravelTimeWalking { get; set; }
    public double Rating { get; set; }
    public int StudentCount { get; set; }
    public bool IsPublic { get; set; }
    public string? Fees { get; set; }
    public string? Website { get; set; }
}

public class PropertySearchRequest
{
    public string Suburb { get; set; } = "";
    public string State { get; set; } = "";
    public string PropertyType { get; set; } = "rent"; // rent or sale
    public int? Bedrooms { get; set; }
    public int? MinPrice { get; set; }
    public int? MaxPrice { get; set; }
}

public class PropertyResult
{
    public string Id { get; set; } = "";
    public string Address { get; set; } = "";
    public string Suburb { get; set; } = "";
    public string State { get; set; } = "";
    public string PropertyType { get; set; } = "";
    public int Bedrooms { get; set; }
    public int Bathrooms { get; set; }
    public int Parking { get; set; }
    public int Price { get; set; }
    public string PriceText { get; set; } = "";
    public string Description { get; set; } = "";
    public string Image { get; set; } = "";
    public string ListingUrl { get; set; } = "";
    public LocationPoint? Location { get; set; }
}

public class PropertySearchResponse
{
    public List<PropertyResult> Properties { get; set; } = new();
    public Dictionary<string, double> MedianPrices { get; set; } = new();
    public List<RealEstateAgent> Agents { get; set; } = new();
    public int TotalResults { get; set; }
}

public class RealEstateAgent
{
    public string Name { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Website { get; set; } = "";
    public string Specialty { get; set; } = "";
}

public class RelocationInfo
{
    public string Suburb { get; set; } = "";
    public string State { get; set; } = "";
    public List<ServiceProvider> MovingCompanies { get; set; } = new();
    public List<ServiceProvider> UtilityProviders { get; set; } = new();
    public List<LocalService> LocalServices { get; set; } = new();
    public SchoolEnrollmentInfo SchoolEnrollment { get; set; } = new();
    public TransportInfo PublicTransport { get; set; } = new();
    public Demographics Demographics { get; set; } = new();
}

public class ServiceProvider
{
    public string Name { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Website { get; set; } = "";
    public string Category { get; set; } = "";
}

public class LocalService
{
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public double Distance { get; set; }
    public string Address { get; set; } = "";
}

public class SchoolEnrollmentInfo
{
    public string EnrollmentProcess { get; set; } = "";
    public List<string> RequiredDocuments { get; set; } = new();
    public string CatchmentUrl { get; set; } = "";
    public string DeadlinePeriod { get; set; } = "";
}

public class TransportInfo
{
    public string NearestStation { get; set; } = "";
    public double StationDistance { get; set; }
    public List<string> BusRoutes { get; set; } = new();
    public List<string> TrainLines { get; set; } = new();
    public string TransportUrl { get; set; } = "";
}

public class Demographics
{
    public int Population { get; set; }
    public int MedianAge { get; set; }
    public int MedianHouseholdIncome { get; set; }
    public double UnemploymentRate { get; set; }
    public double AverageFamilySize { get; set; }
}

public class ComprehensiveBusinessSearchRequest
{
    public string Query { get; set; } = "";
    public LocationPoint Location { get; set; } = new();
    public double RadiusKm { get; set; } = 5;
    public List<string>? Categories { get; set; }
}

public class ComprehensiveBusinessSearchResponse
{
    public List<BusinessMarker> PlatformBusinesses { get; set; } = new();
    public List<ExternalBusiness> ExternalBusinesses { get; set; } = new();
    public int TotalResults { get; set; }
}

public class BusinessMarker
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public LocationPoint Location { get; set; } = new();
    public string Category { get; set; } = "";
    public bool IsPlatformBusiness { get; set; }
}

public class ExternalBusiness
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public LocationPoint Location { get; set; } = new();
    public string Category { get; set; } = "";
    public double Rating { get; set; }
    public string Address { get; set; } = "";
    public string? Phone { get; set; }
    public string Source { get; set; } = ""; // Google, Yelp, etc
}

public class LocationPoint
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
