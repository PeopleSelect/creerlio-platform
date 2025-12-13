namespace Creerlio.DTOs.Business;

public class BusinessMarkerDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public LocationDto Location { get; set; } = new();
    public bool ActivelyHiring { get; set; }
    public int OpenPositions { get; set; }
    public string? LogoUrl { get; set; }
    public string CompanySize { get; set; } = string.Empty;
    public List<string> Industries { get; set; } = new();
}

public class LocationDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string Postcode { get; set; } = string.Empty;
}

public class MapBounds
{
    public double North { get; set; }
    public double South { get; set; }
    public double East { get; set; }
    public double West { get; set; }
}

public class BusinessSearchRequest
{
    public string? Query { get; set; }
    public LocationSearchDto? Location { get; set; }
    public List<string>? Industries { get; set; }
    public List<string>? BusinessSizes { get; set; }
    public List<string>? EmploymentTypes { get; set; }
    public bool? ActivelyHiring { get; set; }
    public bool? HasPositions { get; set; }
}

public class LocationSearchDto
{
    public string? City { get; set; }
    public string? State { get; set; }
    public int Radius { get; set; } = 10; // km
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

public class BusinessSearchResponse
{
    public List<BusinessMarkerDto> Businesses { get; set; } = new();
    public int TotalCount { get; set; }
    public MapBounds? Bounds { get; set; }
}
