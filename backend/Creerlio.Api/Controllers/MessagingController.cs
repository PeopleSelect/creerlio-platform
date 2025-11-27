using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Creerlio.Infrastructure;
using Creerlio.Domain.Entities;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MessagingController : ControllerBase
{
    private readonly CreerlioDbContext _context;

    public MessagingController(CreerlioDbContext context)
    {
        _context = context;
    }

    // ==================== GET CONVERSATIONS ====================
    [HttpGet("conversations/{userId}")]
    public async Task<IActionResult> GetConversations(string userId, [FromQuery] string userType = "Business")
    {
        var conversations = userType == "Business"
            ? await _context.Conversations
                .Where(c => c.BusinessUserId == userId)
                .Include(c => c.TalentProfile)
                .ThenInclude(t => t!.PersonalInformation)
                .OrderByDescending(c => c.LastMessageAt)
                .Select(c => new
                {
                    c.Id,
                    Name = c.TalentProfile!.PersonalInformation!.FirstName + " " + c.TalentProfile.PersonalInformation.LastName,
                    Avatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
                    c.LastMessage,
                    Timestamp = GetRelativeTime(c.LastMessageAt),
                    Unread = c.BusinessHasUnread ? 1 : 0,
                    Online = true, // TODO: implement real online status
                    UserId = c.TalentUserId,
                    UserType = "Talent"
                })
                .ToListAsync()
            : await _context.Conversations
                .Where(c => c.TalentUserId == userId)
                .Include(c => c.BusinessProfile)
                .OrderByDescending(c => c.LastMessageAt)
                .Select(c => new
                {
                    c.Id,
                    Name = "Company Name",
                    Avatar = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100",
                    c.LastMessage,
                    Timestamp = GetRelativeTime(c.LastMessageAt),
                    Unread = c.TalentHasUnread ? 1 : 0,
                    Online = true,
                    UserId = c.BusinessUserId,
                    UserType = "Business"
                })
                .ToListAsync();

        return Ok(conversations);
    }

    // ==================== GET MESSAGES FOR CONVERSATION ====================
    [HttpGet("messages/{conversationId}")]
    public async Task<IActionResult> GetMessages(Guid conversationId, [FromQuery] string userId)
    {
        var conversation = await _context.Conversations
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation == null)
            return NotFound(new { message = "Conversation not found" });

        // Mark messages as read
        var unreadMessages = conversation.Messages
            .Where(m => m.SenderId != userId && !m.IsRead)
            .ToList();

        foreach (var msg in unreadMessages)
        {
            msg.IsRead = true;
            msg.ReadAt = DateTime.UtcNow;
        }

        if (userId == conversation.BusinessUserId)
            conversation.BusinessHasUnread = false;
        else if (userId == conversation.TalentUserId)
            conversation.TalentHasUnread = false;

        await _context.SaveChangesAsync();

        var messages = conversation.Messages
            .OrderBy(m => m.SentAt)
            .Select(m => new
            {
                m.Id,
                m.SenderId,
                Text = m.MessageText,
                Timestamp = m.SentAt.ToString("hh:mm tt"),
                IsOwn = m.SenderId == userId
            })
            .ToList();

        return Ok(messages);
    }

    // ==================== SEND MESSAGE ====================
    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        // Find or create conversation
        var conversation = await _context.Conversations
            .FirstOrDefaultAsync(c =>
                (c.TalentUserId == request.SenderId && c.BusinessUserId == request.RecipientId) ||
                (c.BusinessUserId == request.SenderId && c.TalentUserId == request.RecipientId));

        if (conversation == null)
        {
            conversation = new Conversation
            {
                Id = Guid.NewGuid(),
                TalentUserId = request.SenderType == "Talent" ? request.SenderId : request.RecipientId,
                BusinessUserId = request.SenderType == "Business" ? request.SenderId : request.RecipientId,
                CreatedAt = DateTime.UtcNow,
                LastMessageAt = DateTime.UtcNow,
                LastMessage = request.Message,
                TalentHasUnread = request.SenderType == "Business",
                BusinessHasUnread = request.SenderType == "Talent"
            };
            _context.Conversations.Add(conversation);
        }
        else
        {
            conversation.LastMessage = request.Message;
            conversation.LastMessageAt = DateTime.UtcNow;
            
            if (request.SenderType == "Business")
                conversation.TalentHasUnread = true;
            else
                conversation.BusinessHasUnread = true;
        }

        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderId = request.SenderId,
            SenderType = request.SenderType,
            MessageText = request.Message,
            SentAt = DateTime.UtcNow,
            IsRead = false
        };

        _context.ChatMessages.Add(message);

        // Create notification for recipient
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = request.RecipientId,
            UserType = request.SenderType == "Business" ? "Talent" : "Business",
            Type = "Message",
            Title = "New message",
            Content = request.Message.Length > 50 ? request.Message.Substring(0, 50) + "..." : request.Message,
            ActionUrl = request.SenderType == "Talent" ? "/business/messages" : "/talent/messages",
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            RelatedEntityId = conversation.Id
        };

        _context.Notifications.Add(notification);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            messageId = message.Id,
            conversationId = conversation.Id,
            timestamp = message.SentAt.ToString("hh:mm tt"),
            success = true
        });
    }

    // ==================== GET NOTIFICATIONS ====================
    [HttpGet("notifications/{userId}")]
    public async Task<IActionResult> GetNotifications(string userId, [FromQuery] string userType = "Business")
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && n.UserType == userType)
            .OrderByDescending(n => n.CreatedAt)
            .Take(20)
            .Select(n => new
            {
                n.Id,
                n.Type,
                n.Title,
                n.Content,
                n.ActionUrl,
                n.IsRead,
                Timestamp = GetRelativeTime(n.CreatedAt),
                n.RelatedEntityId
            })
            .ToListAsync();

        return Ok(notifications);
    }

    // ==================== MARK NOTIFICATION AS READ ====================
    [HttpPut("notifications/{notificationId}/read")]
    public async Task<IActionResult> MarkNotificationAsRead(Guid notificationId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification == null)
            return NotFound();

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }

    // ==================== MARK ALL NOTIFICATIONS AS READ ====================
    [HttpPut("notifications/{userId}/read-all")]
    public async Task<IActionResult> MarkAllNotificationsAsRead(string userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new { success = true, count = notifications.Count });
    }

    // ==================== GET UNREAD COUNT ====================
    [HttpGet("notifications/{userId}/unread-count")]
    public async Task<IActionResult> GetUnreadCount(string userId, [FromQuery] string userType = "Business")
    {
        var count = await _context.Notifications
            .Where(n => n.UserId == userId && n.UserType == userType && !n.IsRead)
            .CountAsync();

        return Ok(new { count });
    }

    private static string GetRelativeTime(DateTime dateTime)
    {
        var timeSpan = DateTime.UtcNow - dateTime;

        if (timeSpan.TotalMinutes < 1)
            return "Just now";
        if (timeSpan.TotalMinutes < 60)
            return $"{(int)timeSpan.TotalMinutes} min ago";
        if (timeSpan.TotalHours < 24)
            return $"{(int)timeSpan.TotalHours} hour{((int)timeSpan.TotalHours != 1 ? "s" : "")} ago";
        if (timeSpan.TotalDays < 7)
            return $"{(int)timeSpan.TotalDays} day{((int)timeSpan.TotalDays != 1 ? "s" : "")} ago";
        
        return dateTime.ToString("MMM dd");
    }
}

public class SendMessageRequest
{
    public string SenderId { get; set; } = string.Empty;
    public string SenderType { get; set; } = string.Empty; // "Talent" or "Business"
    public string RecipientId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
