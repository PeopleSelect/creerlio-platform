namespace Creerlio.Application.DTOs.Talent;

public class TalentProfileDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Headline { get; set; } = "";
    public string Summary { get; set; } = "";
    public string Location { get; set; } = "";
    public string Status { get; set; } = "";
}
