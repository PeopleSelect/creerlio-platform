using Creerlio.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add Controllers
builder.Services.AddControllers();

// CORS (open during dev)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", p =>
        p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// MediatR
builder.Services.AddMediatR(typeof(Program));

// Infrastructure (SQL + Repos)
var conn = builder.Configuration.GetConnectionString("DefaultConnection") 
          ?? "Server=localhost;Database=creerlio;User Id=sa;Password=yourStrong(!)Password;";
builder.Services.AddCreerlioInfrastructure(conn);

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "Creerlio API", Version = "v1" 
    });
});

var app = builder.Build();

app.UseStaticFiles(); // Serve static files (favicon, etc.)

app.UseCors("AllowAll");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

app.Run();
