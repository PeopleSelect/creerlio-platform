namespace Creerlio.DTOs.Location;

public class BusinessMarkerDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public LocationDto Location { get; set; } = new();
    public bool ActivelyHiring { get; set; }
    public int OpenPositions { get; set; }
    public string? Logo { get; set; }
    public string? Description { get; set; }
    public double? Distance { get; set; } // km from search center
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

public class RealEstateDataDto
{
    public string Postcode { get; set; } = string.Empty;
    public string Suburb { get; set; } = string.Empty;
    public RentalPriceDto AverageRent { get; set; } = new();
    public int MedianPrice { get; set; }
    public string Trend { get; set; } = "stable"; // rising, falling, stable
    public List<SuburbDataDto> NearbySuburbs { get; set; } = new();
}

public class RentalPriceDto
{
    public int Weekly { get; set; }
    public int Monthly { get; set; }
}

public class SuburbDataDto
{
    public string Name { get; set; } = string.Empty;
    public int AverageRent { get; set; }
    public int AvailableProperties { get; set; }
}

public class CommuteRouteDto
{
    public string Mode { get; set; } = string.Empty; // car, transit, walking, cycling
    public double Distance { get; set; } // in km
    public int Duration { get; set; } // in minutes
    public RouteCostDto Cost { get; set; } = new();
    public List<RouteStepDto> Steps { get; set; } = new();
}

public class RouteCostDto
{
    public decimal Daily { get; set; }
    public decimal Weekly { get; set; }
    public decimal Monthly { get; set; }
    public string Currency { get; set; } = "AUD";
}

public class RouteStepDto
{
    public string Instruction { get; set; } = string.Empty;
    public double Distance { get; set; }
    public int Duration { get; set; }
}

public class AreaInsightsDto
{
    public string Postcode { get; set; } = string.Empty;
    public string Suburb { get; set; } = string.Empty;
    public int Population { get; set; }
    public int MedianIncome { get; set; }
    public int MedianAge { get; set; }
    public string SafetyRating { get; set; } = string.Empty;
    public AmenitiesDto Amenities { get; set; } = new();
    public DemographicsDto Demographics { get; set; } = new();
}

public class AmenitiesDto
{
    public int Schools { get; set; }
    public int Restaurants { get; set; }
    public int Shops { get; set; }
    public int Parks { get; set; }
    public int Gyms { get; set; }
    public int Healthcare { get; set; }
}

public class DemographicsDto
{
    public int MedianAge { get; set; }
    public double FamilyHouseholds { get; set; }
    public double Employed { get; set; }
    public string PrimaryIndustry { get; set; } = string.Empty;
}

public class MapSearchRequest
{
    public BoundsDto? Bounds { get; set; }
    public CoordinateDto? Center { get; set; }
    public double? Radius { get; set; } // in km
    public List<string>? Industries { get; set; }
    public bool? HiringOnly { get; set; }
    public int Limit { get; set; } = 100;
}

public class BoundsDto
{
    public double North { get; set; }
    public double South { get; set; }
    public double East { get; set; }
    public double West { get; set; }
}

public class CoordinateDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
