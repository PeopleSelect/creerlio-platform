# GitHub Copilot Agent Instructions for Creerlio Platform

## Project Overview
- **Creerlio Platform** is a multi-project .NET solution for business, talent, and messaging services. The backend is organized into API, Application, Domain, Infrastructure, DTOs, Handlers, and Repositories.
- The main entry point is `backend/Creerlio.Api/Program.cs`, which configures authentication (JWT, Identity), database migration, and service registration.

## Architecture & Data Flow
- **Solution Structure:**
  - `Creerlio.Api`: ASP.NET Core Web API, configures authentication, migrations, and endpoints.
  - `Creerlio.Application`: Application logic, commands, handlers, DTOs, interfaces.
  - `Creerlio.Domain`: Domain entities, organized by feature (Business, Talent, Messaging, etc).
  - `Creerlio.Infrastructure`: Data access, repositories, migrations, identity context.
- **Data Flow Example:**
  - API controller receives request → Command/Query dispatched via MediatR → Handler uses repository → Entity/DTO returned.
  - Example: `CreateTalentProfileCommandHandler` creates a `TalentProfile` entity via `TalentRepository`, returns `TalentProfileDto`.

## Developer Workflows
- **Build/Run:**
  - Use Visual Studio or `dotnet` CLI.
  - Build: `dotnet build backend/Creerlio.sln`
  - Run API: `dotnet run --project backend/Creerlio.Api/Creerlio.Api.csproj`
- **Database Migration:**
  - Automatic on API startup (see `Program.cs`).
  - Uses EF Core migrations in `backend/Creerlio.Infrastructure/Migrations`.
- **Configuration:**
  - Connection strings and JWT settings in `backend/Creerlio.Api/appsettings.json`.
- **Testing:**
  - No explicit test project found; follow MediatR handler patterns for new features.

## Project-Specific Conventions
- **DTOs:** Located in `backend/DTOs`, used for API responses.
- **Handlers:** Use MediatR for CQRS (see `backend/Handlers`).
- **Repositories:** Implement interfaces in `backend/Interfaces`, concrete classes in `backend/Repositories`.
- **Identity & Auth:**
  - Extension method `AddCreerlioIdentity` in `IdentityServiceExtensions.cs` configures Identity and JWT.
  - User and role classes in `backend/Creerlio.Api/Identity`.
- **Automatic DB Migration:** On API startup, both identity and core DB contexts are migrated.

## Integration Points
- **External DB:** Azure SQL (see connection string in `appsettings.json`).
- **Authentication:** JWT Bearer tokens, configured in API startup.
- **MediatR:** Used for command/query dispatching.

## Examples
- **Add a new feature:**
  1. Define entity in `Creerlio.Domain/Entities`.
  2. Create DTO in `DTOs`.
  3. Add command/query in `Commands/Queries`.
  4. Implement handler in `Handlers`.
  5. Update repository if needed.
  6. Register endpoints in API controller.

## Key Files & Directories
- `backend/Creerlio.Api/Program.cs`: API startup, service registration, migrations.
- `backend/Creerlio.Api/appsettings.json`: Configuration.
- `backend/Handlers/`: MediatR handlers.
- `backend/DTOs/`: Data transfer objects.
- `backend/Repositories/`: Data access.
- `backend/Creerlio.Infrastructure/Migrations/`: EF Core migrations.

---
For questions or unclear conventions, ask for clarification or review recent handler/repository patterns before implementing new features.