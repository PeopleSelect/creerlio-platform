using Microsoft.AspNetCore.Mvc;

namespace Creerlio.Api.Controllers
{
    [ApiController]
    [Route("api/business/profile")]
    public class BusinessProfileController : ControllerBase
    {
        private readonly ILogger<BusinessProfileController> _logger;

        public BusinessProfileController(ILogger<BusinessProfileController> logger)
        {
            _logger = logger;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBusinessProfile(string id)
        {
            // TODO: Replace with actual database query
            // For now, return mock data based on the search results

            var mockProfiles = GetMockBusinessProfiles();
            
            // Find matching business profile
            foreach (var profile in mockProfiles)
            {
                var idProperty = profile.GetType().GetProperty("Id");
                if (idProperty != null)
                {
                    var businessId = idProperty.GetValue(profile)?.ToString();
                    if (businessId == id)
                    {
                        return Ok(profile);
                    }
                }
            }

            return NotFound(new { message = "Business not found" });
        }

        private List<object> GetMockBusinessProfiles()
        {
            return new List<object>
            {
                new
                {
                    Id = "business-001",
                    Name = "Build Right Construction",
                    Industry = "Construction",
                    BusinessSize = "Medium (21-50 employees)",
                    About = @"Build Right Construction is a leading construction company in Western Sydney, specializing in residential and commercial projects. With over 15 years of experience, we pride ourselves on delivering quality workmanship and exceptional customer service.

We are currently expanding our team and looking for skilled tradespeople including carpenters, bricklayers, and project managers. We offer competitive wages, ongoing training, and a supportive work environment.

Our recent projects include the Parramatta Square development, several residential subdivisions in Penrith, and commercial fit-outs across Sydney's western corridor.",
                    Website = "https://buildright.com.au",
                    Email = "careers@buildright.com.au",
                    Phone = "02 9876 5432",
                    Founded = "2008",
                    EmployeeCount = "35 employees",
                    OpenPositions = 5,
                    ActivelyHiring = true,
                    Location = new
                    {
                        Address = "45 Church Street, Parramatta",
                        City = "Parramatta",
                        State = "NSW",
                        Postcode = "2150",
                        Latitude = -33.8150,
                        Longitude = 151.0052
                    },
                    Positions = new[]
                    {
                        new
                        {
                            Id = "job-001",
                            Title = "Qualified Carpenter",
                            Type = "Full-time",
                            Salary = "$70,000 - $85,000",
                            Description = "We are seeking an experienced carpenter to join our residential construction team. Must have Certificate III in Carpentry and at least 3 years post-qualification experience. White card and driver's licence essential."
                        },
                        new
                        {
                            Id = "job-002",
                            Title = "Construction Project Manager",
                            Type = "Full-time",
                            Salary = "$95,000 - $120,000",
                            Description = "Experienced project manager required to oversee multiple residential construction projects across Western Sydney. Diploma in Building & Construction Management or equivalent required. 5+ years experience in a similar role."
                        },
                        new
                        {
                            Id = "job-003",
                            Title = "Apprentice Bricklayer",
                            Type = "Apprenticeship",
                            Salary = "Award rates + benefits",
                            Description = "First or second year apprentice required. Full training provided. Great opportunity to learn from experienced tradespeople. Must be reliable and eager to learn."
                        },
                        new
                        {
                            Id = "job-004",
                            Title = "Site Supervisor",
                            Type = "Full-time",
                            Salary = "$80,000 - $95,000",
                            Description = "Supervise construction activities, manage subcontractors, ensure WHS compliance. Certificate IV in Building & Construction or relevant trade qualification required. 3+ years experience."
                        },
                        new
                        {
                            Id = "job-005",
                            Title = "Labourer",
                            Type = "Casual",
                            Salary = "$28-$35/hour",
                            Description = "General construction labourers needed for various projects. White card mandatory. Own transport preferred. Immediate start available."
                        }
                    }
                },
                new
                {
                    Id = "business-002",
                    Name = "Tech Solutions Australia",
                    Industry = "Information & Communication Technology",
                    BusinessSize = "Large (201-500 employees)",
                    About = @"Tech Solutions Australia is a leading IT services provider specializing in cloud infrastructure, cybersecurity, and enterprise software solutions. We work with some of Australia's biggest brands to transform their digital capabilities.

Based in North Sydney, we have teams across Australia and offer flexible working arrangements including hybrid and remote options. Our culture values innovation, continuous learning, and work-life balance.

We're currently growing our Sydney team across multiple specializations including cloud architecture, DevOps, software development, and project management.",
                    Website = "https://techsolutions.com.au",
                    Email = "recruitment@techsolutions.com.au",
                    Phone = "02 8765 4321",
                    Founded = "2005",
                    EmployeeCount = "280 employees",
                    OpenPositions = 15,
                    ActivelyHiring = true,
                    Location = new
                    {
                        Address = "Level 12, 100 Miller Street, North Sydney",
                        City = "North Sydney",
                        State = "NSW",
                        Postcode = "2060",
                        Latitude = -33.8366,
                        Longitude = 151.2064
                    },
                    Positions = new[]
                    {
                        new
                        {
                            Id = "job-006",
                            Title = "Senior Cloud Architect (AWS)",
                            Type = "Full-time",
                            Salary = "$140,000 - $180,000 + super",
                            Description = "Design and implement scalable cloud solutions for enterprise clients. AWS certifications required. 5+ years experience with AWS services including EC2, Lambda, RDS, and CloudFormation."
                        },
                        new
                        {
                            Id = "job-007",
                            Title = "DevOps Engineer",
                            Type = "Full-time",
                            Salary = "$110,000 - $140,000 + super",
                            Description = "Build and maintain CI/CD pipelines, manage Kubernetes clusters, implement infrastructure as code. Experience with Docker, Jenkins, Terraform required."
                        },
                        new
                        {
                            Id = "job-008",
                            Title = "Junior Software Developer",
                            Type = "Full-time",
                            Salary = "$65,000 - $80,000 + super",
                            Description = "Graduate or junior developer to join our application development team. Experience with C#, .NET Core, React preferred. Great training and mentorship opportunities."
                        }
                    }
                },
                new
                {
                    Id = "business-003",
                    Name = "Westside Healthcare Group",
                    Industry = "Healthcare & Medical",
                    BusinessSize = "Enterprise (500+ employees)",
                    About = @"Westside Healthcare Group operates multiple healthcare facilities across Western Sydney including aged care homes, medical centers, and allied health services. We are committed to providing compassionate, high-quality care to our community.

Our team includes nurses, doctors, allied health professionals, and support staff. We offer excellent professional development opportunities, competitive remuneration packages, and a supportive work environment.

We are currently recruiting across multiple disciplines including registered nurses, enrolled nurses, allied health professionals, and support staff.",
                    Website = "https://westsidehealthcare.com.au",
                    Email = "careers@westsidehealthcare.com.au",
                    Phone = "02 9845 6789",
                    Founded = "1995",
                    EmployeeCount = "650 employees",
                    OpenPositions = 25,
                    ActivelyHiring = true,
                    Location = new
                    {
                        Address = "123 Hawkesbury Road, Westmead",
                        City = "Westmead",
                        State = "NSW",
                        Postcode = "2145",
                        Latitude = -33.8073,
                        Longitude = 150.9876
                    },
                    Positions = new[]
                    {
                        new
                        {
                            Id = "job-009",
                            Title = "Registered Nurse - Aged Care",
                            Type = "Full-time",
                            Salary = "$75,000 - $90,000 + penalties",
                            Description = "AHPRA registered nurse required for our aged care facility. Experience in aged care preferred. Rotating roster including weekends. Supportive team environment."
                        },
                        new
                        {
                            Id = "job-010",
                            Title = "Physiotherapist",
                            Type = "Part-time/Full-time",
                            Salary = "$80,000 - $95,000 pro rata",
                            Description = "AHPRA registered physiotherapist to join our allied health team. Experience in aged care or rehabilitation preferred. Flexible hours available."
                        }
                    }
                },
                new
                {
                    Id = "business-004",
                    Name = "Golden Harvest Hospitality",
                    Industry = "Hospitality & Tourism",
                    BusinessSize = "Small (6-20 employees)",
                    About = @"Golden Harvest Hospitality operates two popular restaurants in Parramatta CBD. We specialize in modern Australian cuisine with Asian fusion elements. Our venues are known for exceptional food, great atmosphere, and outstanding service.

We are a family-owned business that values our team members. We offer flexible rostering, staff meals, and opportunities for career progression. Many of our current managers started as wait staff or kitchen hands.

While we don't currently have any open positions, we're always interested in hearing from talented hospitality professionals who want to join our team.",
                    Website = "https://goldenharvestdining.com.au",
                    Email = "jobs@goldenharvestdining.com.au",
                    Phone = "02 9635 7890",
                    Founded = "2012",
                    EmployeeCount = "18 employees",
                    OpenPositions = 0,
                    ActivelyHiring = false,
                    Location = new
                    {
                        Address = "78 George Street, Parramatta",
                        City = "Parramatta",
                        State = "NSW",
                        Postcode = "2150",
                        Latitude = -33.8168,
                        Longitude = 151.0041
                    },
                    Positions = Array.Empty<object>()
                }
            };
        }
    }
}
