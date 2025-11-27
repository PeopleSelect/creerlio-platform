namespace Creerlio.Domain.Entities.Media;

public class TalentMedia
{
    public Guid Id { get; set; }
    public string Url { get; set; } = "";
    public string Type { get; set; } = ""; // image, video, pdf, link
}
