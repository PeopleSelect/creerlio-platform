using Microsoft.EntityFrameworkCore;
using Creerlio.Domain.Entities.Talent;
using Creerlio.Domain.Entities.Business;
using Creerlio.Domain.Entities.Media;
using Creerlio.Domain.Entities.Messaging;
using Creerlio.Domain.Entities.System;

namespace Creerlio.Infrastructure;

public class CreerlioDbContext : DbContext
{
    public CreerlioDbContext(DbContextOptions<CreerlioDbContext> options) : base(options) {}

    public DbSet<TalentProfile> TalentProfiles => Set<TalentProfile>();
    public DbSet<Experience> Experience => Set<Experience>();
    public DbSet<Education> Education => Set<Education>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<TalentSkill> TalentSkills => Set<TalentSkill>();
    public DbSet<TalentMedia> TalentMedia => Set<TalentMedia>();
    public DbSet<TalentDocument> TalentDocuments => Set<TalentDocument>();

    public DbSet<BusinessProfile> BusinessProfiles => Set<BusinessProfile>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<TalentBenchRecord> TalentBench => Set<TalentBenchRecord>();

    public DbSet<ChatThread> ChatThreads => Set<ChatThread>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<CallSession> CallSessions => Set<CallSession>();

    public DbSet<User> Users => Set<User>();
    public DbSet<PermissionAudit> PermissionAudits => Set<PermissionAudit>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ChatThread>()
            .Property(e => e.ParticipantUserIds)
            .HasConversion(
                v => string.Join(",", v),
                v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(Guid.Parse).ToList()
            );

        modelBuilder.Entity<CallSession>()
            .Property(e => e.ParticipantUserIds)
            .HasConversion(
                v => string.Join(",", v),
                v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(Guid.Parse).ToList()
            );
    }
}
