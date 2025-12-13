using Creerlio.Application.Interfaces;
using Creerlio.Domain.Entities.Messaging;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Creerlio.Application.Services;

public class MessagingService
{
    private readonly IMessagingRepository _repo;
    public MessagingService(IMessagingRepository repo) { _repo = repo; }

    public Task<IEnumerable<ChatThread>> GetThreadsAsync() => _repo.GetThreadsAsync();
    public Task SendMessageAsync(ChatMessage message) => _repo.SendMessageAsync(message);
    public Task SaveChangesAsync() => _repo.SaveChangesAsync();
}
