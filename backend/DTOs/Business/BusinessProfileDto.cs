using System;

namespace Creerlio.Application.DTOs.Business
{
    public class BusinessProfileDto
    {
        public Guid Id { get; set; }
        public string BusinessName { get; set; } = "";
        public string ABN { get; set; } = "";
        public string Website { get; set; } = "";
        public string Industry { get; set; } = "";
        public string Location { get; set; } = "";
    }
}
