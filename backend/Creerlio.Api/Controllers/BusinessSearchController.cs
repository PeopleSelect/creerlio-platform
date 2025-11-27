using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/business")]
[Authorize]
public class BusinessSearchController : ControllerBase
{
    // TODO: Replace with actual repository when database is available
    // private readonly IBusinessRepository _businessRepository;

    [HttpPost("map/markers")]
    [AllowAnonymous]
    public async Task<IActionResult> GetMapMarkers([FromBody] MapMarkersRequest request)
    {
        Console.WriteLine($"🗺️ Map markers request: Limit={request.Limit}, HiringOnly={request.HiringOnly}");

        // Mock data for map markers
        var markers = GenerateMockBusinessMarkers(request);

        return Ok(markers);
    }

    [HttpPost("search")]
    public async Task<IActionResult> SearchBusinesses([FromBody] BusinessSearchRequest request)
    {
        Console.WriteLine($"🔍 Business search request: {request.Query}, Location: {request.Location.City}, Radius: {request.Location.Radius}km");

        // Mock data for demonstration
        // In production, this will query the database with geospatial search
        var businesses = GetMockBusinessResults(request);

        return Ok(new
        {
            businesses,
            count = businesses.Count,
            searchCriteria = request
        });
    }

    // Mock data generator - will be replaced with actual database queries
    private List<BusinessResult> GetMockBusinessResults(BusinessSearchRequest request)
    {
        var mockBusinesses = new List<BusinessResult>
        {
            new BusinessResult
            {
                Id = "biz-001",
                Name = "Build Right Construction",
                Industry = "Construction",
                Location = new BusinessLocation
                {
                    City = "Parramatta",
                    State = "NSW",
                    Suburb = "Parramatta",
                    Postcode = "2150"
                },
                Distance = 2.5,
                Size = "Medium (21-50 employees)",
                ActivelyHiring = true,
                OpenPositions = 5,
                Description = "Leading construction company specializing in commercial and residential projects across Sydney.",
                Specializations = new List<string> { "Commercial Construction", "Project Management", "Carpentry" },
                Established = 2005
            },
            new BusinessResult
            {
                Id = "biz-002",
                Name = "Tech Solutions Australia",
                Industry = "Information & Communication Technology (ICT)",
                Location = new BusinessLocation
                {
                    City = "Sydney",
                    State = "NSW",
                    Suburb = "North Sydney",
                    Postcode = "2060"
                },
                Distance = 8.3,
                Size = "Large (201-500 employees)",
                ActivelyHiring = true,
                OpenPositions = 15,
                Description = "Innovative technology company delivering cutting-edge software solutions and IT services.",
                Specializations = new List<string> { "Cloud Architecture", "Cybersecurity", "DevOps", "Software Development" },
                Established = 2010
            },
            new BusinessResult
            {
                Id = "biz-003",
                Name = "Westside Healthcare Group",
                Industry = "Healthcare & Medical",
                Location = new BusinessLocation
                {
                    City = "Parramatta",
                    State = "NSW",
                    Suburb = "Westmead",
                    Postcode = "2145"
                },
                Distance = 3.2,
                Size = "Enterprise (500+ employees)",
                ActivelyHiring = true,
                OpenPositions = 25,
                Description = "Comprehensive healthcare services provider with multiple clinics across Western Sydney.",
                Specializations = new List<string> { "General Practice", "Nursing", "Allied Health", "Aged Care" },
                Established = 1998
            },
            new BusinessResult
            {
                Id = "biz-004",
                Name = "Golden Harvest Hospitality",
                Industry = "Hospitality & Tourism",
                Location = new BusinessLocation
                {
                    City = "Parramatta",
                    State = "NSW",
                    Suburb = "Parramatta",
                    Postcode = "2150"
                },
                Distance = 1.8,
                Size = "Medium-Large (51-200 employees)",
                ActivelyHiring = false,
                OpenPositions = 0,
                Description = "Award-winning restaurant and catering group operating premium venues across Sydney.",
                Specializations = new List<string> { "Fine Dining", "Event Catering", "Hotel Management" },
                Established = 2012
            }
        };

        // Filter by location radius
        if (!string.IsNullOrEmpty(request.Location.City))
        {
            mockBusinesses = mockBusinesses.Where(b => 
                b.Distance <= request.Location.Radius
            ).ToList();
        }

        // Filter by industry
        if (request.Industry != null && request.Industry.Any())
        {
            mockBusinesses = mockBusinesses.Where(b =>
                request.Industry.Contains(b.Industry)
            ).ToList();
        }

        // Filter by actively hiring
        if (request.ActivelyHiring)
        {
            mockBusinesses = mockBusinesses.Where(b => b.ActivelyHiring).ToList();
        }

        // Filter by has positions
        if (request.HasPositions)
        {
            mockBusinesses = mockBusinesses.Where(b => b.OpenPositions > 0).ToList();
        }

        return mockBusinesses;
    }

    private List<BusinessMarkerDto> GenerateMockBusinessMarkers(MapMarkersRequest request)
    {
        var random = new Random();
        var markers = new List<BusinessMarkerDto>();

        // Generate businesses in major Australian cities
        var locations = new[]
        {
            new { Name = "Sydney Construction Co", Lat = -33.8688, Lng = 151.2093, City = "Sydney", State = "NSW", Postcode = "2000", Industry = "Construction" },
            new { Name = "Melbourne Tech Solutions", Lat = -37.8136, Lng = 144.9631, City = "Melbourne", State = "VIC", Postcode = "3000", Industry = "Technology" },
            new { Name = "Brisbane Builders", Lat = -27.4698, Lng = 153.0251, City = "Brisbane", State = "QLD", Postcode = "4000", Industry = "Construction" },
            new { Name = "Perth Mining Group", Lat = -31.9505, Lng = 115.8605, City = "Perth", State = "WA", Postcode = "6000", Industry = "Mining" },
            new { Name = "Adelaide Healthcare", Lat = -34.9285, Lng = 138.6007, City = "Adelaide", State = "SA", Postcode = "5000", Industry = "Healthcare" },
            new { Name = "Gold Coast Hospitality", Lat = -28.0167, Lng = 153.4000, City = "Gold Coast", State = "QLD", Postcode = "4217", Industry = "Hospitality" },
            new { Name = "Newcastle Steel Works", Lat = -32.9283, Lng = 151.7817, City = "Newcastle", State = "NSW", Postcode = "2300", Industry = "Manufacturing" },
            new { Name = "Canberra Gov Services", Lat = -35.2809, Lng = 149.1300, City = "Canberra", State = "ACT", Postcode = "2600", Industry = "Government" },
            new { Name = "Hobart Transport", Lat = -42.8821, Lng = 147.3272, City = "Hobart", State = "TAS", Postcode = "7000", Industry = "Logistics" },
            new { Name = "Darwin Resources", Lat = -12.4634, Lng = 130.8456, City = "Darwin", State = "NT", Postcode = "0800", Industry = "Resources" },
            new { Name = "Wollongong Industries", Lat = -34.4278, Lng = 150.8931, City = "Wollongong", State = "NSW", Postcode = "2500", Industry = "Manufacturing" },
            new { Name = "Geelong Manufacturing", Lat = -38.1499, Lng = 144.3617, City = "Geelong", State = "VIC", Postcode = "3220", Industry = "Manufacturing" },
            new { Name = "Cairns Tourism", Lat = -16.9186, Lng = 145.7781, City = "Cairns", State = "QLD", Postcode = "4870", Industry = "Tourism" },
            new { Name = "Townsville Logistics", Lat = -19.2590, Lng = 146.8169, City = "Townsville", State = "QLD", Postcode = "4810", Industry = "Logistics" },
            new { Name = "Parramatta Tech Hub", Lat = -33.8150, Lng = 151.0000, City = "Parramatta", State = "NSW", Postcode = "2150", Industry = "Technology" }
        };

        var streets = new[] { "George St", "Pitt St", "Elizabeth St", "York St", "Clarence St", "Kent St", "Sussex St" };

        foreach (var loc in locations)
        {
            // Add some random offset to spread markers out
            var latOffset = (random.NextDouble() - 0.5) * 0.1;
            var lngOffset = (random.NextDouble() - 0.5) * 0.1;

            markers.Add(new BusinessMarkerDto
            {
                Id = Guid.NewGuid().ToString(),
                Name = loc.Name,
                Industry = loc.Industry,
                Location = new MarkerLocation
                {
                    Latitude = loc.Lat + latOffset,
                    Longitude = loc.Lng + lngOffset,
                    City = loc.City,
                    State = loc.State,
                    Postcode = loc.Postcode,
                    Address = $"{random.Next(1, 999)} {streets[random.Next(streets.Length)]}"
                },
                ActivelyHiring = random.Next(0, 2) == 1,
                OpenPositions = random.Next(0, 15),
                Description = $"Leading {loc.Industry.ToLower()} company in {loc.City}"
            });
        }

        // Filter by hiring status if requested
        if (request.HiringOnly == true)
        {
            markers = markers.Where(m => m.ActivelyHiring).ToList();
        }

        return markers.Take(request.Limit).ToList();
    }
}

public class MapMarkersRequest
{
    public int Limit { get; set; } = 100;
    public bool? HiringOnly { get; set; }
    public List<string>? Industries { get; set; }
}

public class BusinessMarkerDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Industry { get; set; } = "";
    public MarkerLocation Location { get; set; } = new();
    public bool ActivelyHiring { get; set; }
    public int OpenPositions { get; set; }
    public string? Logo { get; set; }
    public string Description { get; set; } = "";
}

public class MarkerLocation
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Address { get; set; } = "";
    public string City { get; set; } = "";
    public string State { get; set; } = "";
    public string Postcode { get; set; } = "";
}

public class BusinessSearchRequest
{
    public string Query { get; set; } = "";
    public LocationFilter Location { get; set; } = new();
    public List<string> Industry { get; set; } = new();
    public List<string> BusinessSize { get; set; } = new();
    public List<string> EmploymentTypes { get; set; } = new();
    public bool ActivelyHiring { get; set; }
    public bool HasPositions { get; set; }
}

public class LocationFilter
{
    public string City { get; set; } = "";
    public string State { get; set; } = "";
    public int Radius { get; set; } = 10; // km
}

public class BusinessResult
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Industry { get; set; } = "";
    public BusinessLocation Location { get; set; } = new();
    public double Distance { get; set; } // km from search location
    public string Size { get; set; } = "";
    public bool ActivelyHiring { get; set; }
    public int OpenPositions { get; set; }
    public string Description { get; set; } = "";
    public List<string> Specializations { get; set; } = new();
    public int? Established { get; set; }
    public string? Logo { get; set; }
}

public class BusinessLocation
{
    public string City { get; set; } = "";
    public string State { get; set; } = "";
    public string Suburb { get; set; } = "";
    public string Postcode { get; set; } = "";
}
