using System;

namespace Creerlio.Domain.Entities
{
    public class Conversation
    {
        public Guid Id { get; set; }
        public string? TalentUserId { get; set; }
        public string? BusinessUserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastMessageAt { get; set; }
        public bool TalentHasUnread { get; set; }
        public bool BusinessHasUnread { get; set; }
        public string? LastMessage { get; set; }

        // Navigation properties
        public virtual TalentProfile? TalentProfile { get; set; }
        public virtual BusinessProfile? BusinessProfile { get; set; }
        public virtual ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
    }

    public class ChatMessage
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public string SenderId { get; set; } = string.Empty;
        public string SenderType { get; set; } = string.Empty; // "Talent" or "Business"
        public string MessageText { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }

        // Navigation properties
        public virtual Conversation? Conversation { get; set; }
    }

    public class Notification
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserType { get; set; } = string.Empty; // "Talent" or "Business"
        public string Type { get; set; } = string.Empty; // "Message", "Application", "Interview", "System"
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? ActionUrl { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public Guid? RelatedEntityId { get; set; }
    }
}
