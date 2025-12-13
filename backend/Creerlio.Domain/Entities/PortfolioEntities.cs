using System;
using System.Collections.Generic;

namespace Creerlio.Domain.Entities
{
    // Portfolio Template System for Canva-style editor
    public class PortfolioTemplate
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string TemplateName { get; set; } = string.Empty; // creative-bold, professional-classic, etc.
        public string ColorScheme { get; set; } = string.Empty; // amber, blue, purple, etc.
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<PortfolioSection> Sections { get; set; } = new();
        public TemplateDesign? Design { get; set; }
    }

    public class TemplateDesign
    {
        public Guid Id { get; set; }
        public Guid PortfolioTemplateId { get; set; }
        public string PrimaryColor { get; set; } = string.Empty;
        public string SecondaryColor { get; set; } = string.Empty;
        public string AccentColor { get; set; } = string.Empty;
        public string FontFamily { get; set; } = string.Empty;
        public string FontSize { get; set; } = string.Empty;
        public string CustomCSS { get; set; } = string.Empty;
    }

    public class PortfolioSection
    {
        public Guid Id { get; set; }
        public Guid PortfolioTemplateId { get; set; }
        public string Type { get; set; } = string.Empty; // header, about, experience, skills, projects, education, certifications, contact
        public string Title { get; set; } = string.Empty;
        public bool IsVisible { get; set; } = true;
        public int DisplayOrder { get; set; }
        public string Content { get; set; } = string.Empty; // JSON content specific to section type
    }

    public class PortfolioSharing
    {
        public Guid Id { get; set; }
        public Guid TalentProfileId { get; set; }
        public string ShareToken { get; set; } = string.Empty;
        public string ShareUrl { get; set; } = string.Empty;
        public bool IsPublic { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int ViewCount { get; set; }
        public List<BusinessAccess> BusinessAccesses { get; set; } = new();
    }

    public class BusinessAccess
    {
        public Guid Id { get; set; }
        public Guid PortfolioSharingId { get; set; }
        public Guid BusinessProfileId { get; set; }
        public DateTime GrantedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool CanDownload { get; set; }
        public bool CanContact { get; set; }
    }
}
