namespace Creerlio.DTOs.Business;

public class RealEstateDataDto
{
    public string Postcode { get; set; } = string.Empty;
    public string Suburb { get; set; } = string.Empty;
    public RentalPriceDto AverageRent { get; set; } = new();
    public decimal MedianPrice { get; set; }
    public string Trend { get; set; } = "stable"; // rising, falling, stable
    public List<SuburbRentalDto> NearbySuburbs { get; set; } = new();
}

public class RentalPriceDto
{
    public decimal Weekly { get; set; }
    public decimal Monthly { get; set; }
}

public class SuburbRentalDto
{
    public string Name { get; set; } = string.Empty;
    public decimal AverageRent { get; set; }
    public int PropertyCount { get; set; }
}

public class CommuteRouteDto
{
    public string Mode { get; set; } = string.Empty; // car, transit, walking, cycling
    public double Distance { get; set; } // km
    public int Duration { get; set; } // minutes
    public CommuteCostDto Cost { get; set; } = new();
    public List<RouteStepDto> Steps { get; set; } = new();
}

public class CommuteCostDto
{
    public decimal Daily { get; set; }
    public decimal Weekly { get; set; }
    public decimal Monthly { get; set; }
    public string Breakdown { get; set; } = string.Empty;
}

public class RouteStepDto
{
    public string Instruction { get; set; } = string.Empty;
    public double Distance { get; set; }
    public int Duration { get; set; }
    public string Mode { get; set; } = string.Empty;
}

public class AreaInsightsDto
{
    public string Postcode { get; set; } = string.Empty;
    public string Suburb { get; set; } = string.Empty;
    public int Population { get; set; }
    public decimal MedianIncome { get; set; }
    public int Schools { get; set; }
    public string CrimeRate { get; set; } = string.Empty;
    public AmenitiesDto Amenities { get; set; } = new();
    public DemographicsDto Demographics { get; set; } = new();
}

public class AmenitiesDto
{
    public int Restaurants { get; set; }
    public int Shops { get; set; }
    public int Parks { get; set; }
    public int Gyms { get; set; }
    public int Schools { get; set; }
    public int Hospitals { get; set; }
}

public class DemographicsDto
{
    public int MedianAge { get; set; }
    public int FamilyHouseholds { get; set; }
    public decimal UnemploymentRate { get; set; }
}
