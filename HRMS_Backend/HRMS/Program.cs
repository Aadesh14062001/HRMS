
using System;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using HRMS.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Http;
using HRMS.Controller; // Auth, UsersAdmin, CompanyService, Branches, Departments, SubDepartmentDepartments, Designations, Positions, EmployeeBasics, EmployeePersonals, AttendanceService, LeaveRequestsService, HolidayService, PayrollService

var builder = WebApplication.CreateBuilder(args);

/* ---------------- OpenAPI + Controllers ---------------- */
// Add controllers with JSON options (register DateOnly/TimeOnly converters)
builder.Services.AddOpenApi();
builder.Services.AddControllers().AddJsonOptions(options =>
{
    // Register converters for DateOnly/TimeOnly so WriteAsJsonAsync won't throw
    options.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
    options.JsonSerializerOptions.Converters.Add(new TimeOnlyJsonConverter());
    // optional:
    // options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

/* ---------------- CORS ---------------- */
// Development convenience policy — allow any origin (tighten for production)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAnyOrigin", p =>
        p.AllowAnyOrigin()
         .AllowAnyHeader()
         .AllowAnyMethod());
});

/* ---------------- EF Core ---------------- */
var cs = builder.Configuration.GetConnectionString("DefaultConnection")
         ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection missing");

builder.Services.AddDbContext<HrmsContext>(options =>
{
    options.UseSqlServer(cs, sql =>
    {
        sql.CommandTimeout(120);
        sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null);
    });

    options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
    options.ConfigureWarnings(w => w.Ignore(RelationalEventId.MultipleCollectionIncludeWarning));
});

/* ---------------- Register application services ---------------- */
/* Register your service/controller classes so endpoints can resolve them from DI */
builder.Services.AddScoped<Auth>();
builder.Services.AddScoped<UsersAdmin>();
builder.Services.AddScoped<CompanyService>();
builder.Services.AddScoped<Branches>();
builder.Services.AddScoped<Departments>();
builder.Services.AddScoped<SubDepartmentDepartments>();
builder.Services.AddScoped<Designations>();
builder.Services.AddScoped<Positions>();
builder.Services.AddScoped<EmployeeBasics>();
builder.Services.AddScoped<EmployeePersonals>();
builder.Services.AddScoped<AttendanceService>();

// IMPORTANT: register LeaveRequestsService (fix missing DI)
builder.Services.AddScoped<LeaveRequestsService>();

builder.Services.AddScoped<HolidayService>();
// ---- register PayrollService (class name is PayrollService in your file) ----
builder.Services.AddScoped<PayrollService>();

/* ---------------- AuthN (JWT) + AuthZ (Policies) ---------------- */
var jwt = builder.Configuration.GetSection("Jwt");
var jwtKey = jwt["Key"] ?? throw new InvalidOperationException("Jwt:Key missing in appsettings.json");
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ClockSkew = TimeSpan.FromMinutes(1),

            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = System.Security.Claims.ClaimTypes.Name
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("IsAdmin", p => p.RequireRole("Admin"));
    options.AddPolicy("IsHR", p => p.RequireRole("HR", "Admin"));
    options.AddPolicy("IsManager", p => p.RequireRole("Manager", "HR", "Admin"));

    // Employee and above
    options.AddPolicy("IsEmployee", p => p.RequireRole("Employee", "Manager", "HR", "Admin"));
});

var app = builder.Build();

/* ---------------- OpenAPI ---------------- */
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

/* ---------------- Middleware pipeline ---------------- */
// IMPORTANT: UseRouting is implicit in minimal hosting; ensure CORS runs before auth/authorization checks on endpoints


app.UseRouting();
app.UseCors("AllowAnyOrigin");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

/* ---------------- AUTH endpoints (delegating to Auth service) ---------------- */
app.MapPost("/Auth/Login", async (HttpContext ctx, HrmsContext db, IConfiguration cfg, Auth auth) =>
    await auth.Login(ctx, db, cfg)).AllowAnonymous();

app.MapPost("/Auth/SetPasswordDev", async (HttpContext ctx, HrmsContext db, IConfiguration cfg, Auth auth) =>
    await auth.SetPasswordDev(ctx, db, cfg)).RequireAuthorization("IsAdmin");

// Development helper: open endpoint to set password when you cannot call admin route.
// **WARNING**: this is intentionally AllowAnonymous for development convenience. Remove or restrict in production.
app.MapPost("/Auth/SetPasswordDevOpen", async (HttpContext httpContext, HrmsContext db, IConfiguration config, Auth auth) =>
{
    await auth.SetPasswordDev(httpContext, db, config);
}).AllowAnonymous();

/* ---------------- Users & Roles (Admin only) — using UsersAdmin service ---------------- */
app.MapPost("/Users/GetAll", async (HttpContext ctx, HrmsContext db, IConfiguration cfg, UsersAdmin svc) =>
    await svc.GetAll(ctx, db, cfg)).RequireAuthorization("IsAdmin");

app.MapPost("/Users/Create", async (HttpContext ctx, HrmsContext db, IConfiguration cfg, UsersAdmin svc) =>
    await svc.Create(ctx, db, cfg)).RequireAuthorization("IsAdmin");

app.MapPost("/Users/SetPassword", async (HttpContext ctx, HrmsContext db, IConfiguration cfg, UsersAdmin svc) =>
    await svc.SetPassword(ctx, db, cfg)).RequireAuthorization("IsAdmin");

app.MapPost("/Users/SetRoles", async (HttpContext ctx, HrmsContext db, IConfiguration cfg, UsersAdmin svc) =>
    await svc.SetRoles(ctx, db, cfg)).RequireAuthorization("IsAdmin");

app.MapPost("/Users/ToggleActive", async (HttpContext ctx, HrmsContext db, IConfiguration cfg, UsersAdmin svc) =>
    await svc.ToggleActive(ctx, db, cfg)).RequireAuthorization("IsAdmin");

/* ---------------- Company / Org endpoints (model-binding for Insert/Update) ---------------- */
app.MapPost("/Company_Insert", async (HttpContext ctx, HrmsContext db, Company company, CompanyService svc) =>
    await svc.Insert(ctx, db, company)).RequireAuthorization("IsAdmin");

app.MapPost("/Company_Update", async (HttpContext ctx, HrmsContext db, Company company, CompanyService svc) =>
    await svc.Update(ctx, db, company)).RequireAuthorization("IsHR");

app.MapPost("/Company_GetAll", async (HttpContext ctx, HrmsContext db, CompanyService svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

/* ---------------- Branch endpoints ---------------- */
app.MapPost("/Branches_Insert", async (HttpContext ctx, HrmsContext db, Branch branch, Branches svc) =>
    await svc.Insert(ctx, db, branch)).RequireAuthorization("IsHR");

app.MapPost("/Branches_Update", async (HttpContext ctx, HrmsContext db, Branch branch, Branches svc) =>
    await svc.Update(ctx, db, branch)).RequireAuthorization("IsHR");

app.MapPost("/Branches_GetAll", async (HttpContext ctx, HrmsContext db, Branches svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

/* ---------------- Department endpoints ---------------- */
app.MapPost("/Department_Insert", async (HttpContext ctx, HrmsContext db, Department department, Departments svc) =>
    await svc.Insert(ctx, db, department)).RequireAuthorization("IsHR");

app.MapPost("/Department_Update", async (HttpContext ctx, HrmsContext db, Department department, Departments svc) =>
    await svc.Update(ctx, db, department)).RequireAuthorization("IsHR");

app.MapPost("/Department_GetAll", async (HttpContext ctx, HrmsContext db, Departments svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

/* ---------------- SubDepartment endpoints ---------------- */
app.MapPost("/SubDepartment_Insert", async (HttpContext ctx, HrmsContext db, SubDepartment subDepartment, SubDepartmentDepartments svc) =>
    await svc.Insert(ctx, db, subDepartment)).RequireAuthorization("IsHR");

app.MapPost("/SubDepartment_Update", async (HttpContext ctx, HrmsContext db, SubDepartment subDepartment, SubDepartmentDepartments svc) =>
    await svc.Update(ctx, db, subDepartment)).RequireAuthorization("IsHR");

app.MapPost("/SubDepartment_GetAll", async (HttpContext ctx, HrmsContext db, SubDepartmentDepartments svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

/* ---------------- Designation endpoints ---------------- */
app.MapPost("/Designation_Insert", async (HttpContext ctx, HrmsContext db, Designation designation, Designations svc) =>
    await svc.Insert(ctx, db, designation)).RequireAuthorization("IsHR");

app.MapPost("/Designation_Update", async (HttpContext ctx, HrmsContext db, Designation designation, Designations svc) =>
    await svc.Update(ctx, db, designation)).RequireAuthorization("IsHR");

app.MapPost("/Designation_GetAll", async (HttpContext ctx, HrmsContext db, Designations svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

/* ---------------- Position endpoints ---------------- */
app.MapPost("/Position_Insert", async (HttpContext ctx, HrmsContext db, Position position, Positions svc) =>
    await svc.Insert(ctx, db, position)).RequireAuthorization("IsHR");

app.MapPost("/Position_Update", async (HttpContext ctx, HrmsContext db, Position position, Positions svc) =>
    await svc.Update(ctx, db, position)).RequireAuthorization("IsHR");

app.MapPost("/Position_GetAll", async (HttpContext ctx, HrmsContext db, Positions svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

/* ---------------- Employee Master endpoints ---------------- */
app.MapPost("/EmpBasic_Insert", async (HttpContext ctx, HrmsContext db, EmployeeBasic employee, EmployeeBasics svc) =>
    await svc.Insert(ctx, db, employee)).RequireAuthorization("IsManager");

app.MapPost("/EmpBasic_Update", async (HttpContext ctx, HrmsContext db, EmployeeBasic employee, EmployeeBasics svc) =>
    await svc.Update(ctx, db, employee)).RequireAuthorization("IsManager");

app.MapPost("/EmpBasic_GetAll", async (HttpContext ctx, HrmsContext db, EmployeeBasics svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

app.MapPost("/Emppersonal_Insert", async (HttpContext ctx, HrmsContext db, EmployeePersonal personal, EmployeePersonals svc) =>
    await svc.Insert(ctx, db, personal)).RequireAuthorization("IsManager");

app.MapPost("/Emppersonal_Update", async (HttpContext ctx, HrmsContext db, EmployeePersonal personal, EmployeePersonals svc) =>
    await svc.Update(ctx, db, personal)).RequireAuthorization("IsManager");

app.MapPost("/Emppersonal_GetAll", async (HttpContext ctx, HrmsContext db, EmployeePersonals svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

/* ---------------- Attendance endpoints ---------------- */
// employees create/punch
app.MapPost("/Attendance/Insert", async (HttpContext ctx, HrmsContext db, AttendanceService svc) =>
    await svc.Insert(ctx, db)).RequireAuthorization("IsEmployee");

// allow managers/admin/hr/employee to fetch according to filters
app.MapPost("/Attendance/GetAll", async (HttpContext ctx, HrmsContext db, AttendanceService svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

/* ---------------- LeaveRequests endpoints ---------------- */
// employees create leave requests
app.MapPost("/LeaveRequests/Insert", async (HttpContext ctx, HrmsContext db, LeaveRequestsService svc) =>
    await svc.Insert(ctx, db)).RequireAuthorization("IsEmployee");

// TEMPORARY: debug route to test raw body parsing without auth (remove in prod)
app.MapPost("/LeaveRequests/InsertDebug", async (HttpContext ctx, HrmsContext db, LeaveRequestsService svc) =>
    await svc.Insert(ctx, db)).AllowAnonymous();

// any authorized user; filters limit results
app.MapPost("/LeaveRequests/GetAll", async (HttpContext ctx, HrmsContext db, LeaveRequestsService svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

// restrict to managers+HR+Admin via IsManager policy
app.MapPost("/LeaveRequests/UpdateStatus", async (HttpContext ctx, HrmsContext db, LeaveRequestsService svc) =>
    await svc.UpdateStatus(ctx, db)).RequireAuthorization("IsManager");

/* ---------------- Holidays endpoints ---------------- */
// anyone authorized can view holidays; creation / edit restricted to HR/Admin
app.MapPost("/Holiday/GetAll", async (HttpContext ctx, HrmsContext db, HolidayService svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization();

app.MapPost("/Holiday/Insert", async (HttpContext ctx, HrmsContext db, Holiday holiday, HolidayService svc) =>
    await svc.Insert(ctx, db, holiday)).RequireAuthorization("IsHR");

app.MapPost("/Holiday/Update", async (HttpContext ctx, HrmsContext db, Holiday holiday, HolidayService svc) =>
    await svc.Update(ctx, db, holiday)).RequireAuthorization("IsHR");

app.MapPost("/Holiday/Delete", async (HttpContext ctx, HrmsContext db, HolidayService svc) =>
    await svc.Delete(ctx, db)).RequireAuthorization("IsHR");

/* ---------------- Payroll endpoints ---------------- */
// employees can fetch slips; insert/upload restricted to HR
app.MapPost("/PayrollSlips/GetAll", async (HttpContext ctx, HrmsContext db, PayrollService svc) =>
    await svc.GetAll(ctx, db)).RequireAuthorization("IsEmployee");

app.MapPost("/PayrollSlips/Insert", async (HttpContext ctx, HrmsContext db, PayrollSlip slip, PayrollService svc) =>
    await svc.Insert(ctx, db, slip)).RequireAuthorization("IsHR");

app.MapPost("/PayrollSlips/UploadPDF", async (HttpContext ctx, HrmsContext db, PayrollService svc) =>
    await svc.UploadPDF(ctx, db)).RequireAuthorization("IsHR");

// Download PDF (GET)
app.MapGet("/PayrollSlips/DownloadPdf", async (HttpContext ctx, HrmsContext db, PayrollService svc) =>
    await svc.DownloadPdf(ctx, db)).RequireAuthorization("IsEmployee");

/* ---------------- Employee Profile (robust lookup) ---------------- */
app.MapGet("/Employee/Profile", async (HttpContext ctx, HrmsContext db) =>
{
    var user = ctx.User;
    if (user?.Identity == null || !user.Identity.IsAuthenticated)
        return Results.Unauthorized();

    var username = user.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                   ?? user.Identity.Name
                   ?? string.Empty;

    if (string.IsNullOrEmpty(username))
        return Results.BadRequest(new { result = false, message = "Invalid token: username missing" });

    var roles = user.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToArray();

    object? empResult = null;

    // Attempt 1: match by "Username" column/property
    try
    {
        empResult = await db.EmployeeBasics
            .Where(e => EF.Property<string>(e, "Username") == username)
            .Select(e => new
            {
                Username = EF.Property<string>(e, "Username"),
                FullName = EF.Property<string>(e, "FullName") ?? EF.Property<string>(e, "EmployeeName"),
                Email = EF.Property<string>(e, "Email"),
                Phone = EF.Property<string>(e, "Phone"),
                Department = EF.Property<string>(e, "Department"),
                Designation = EF.Property<string>(e, "Designation")
            })
            .FirstOrDefaultAsync();
    }
    catch
    {
        empResult = null;
    }

    // Attempt 2: match by EmployeeCode
    if (empResult == null)
    {
        try
        {
            empResult = await db.EmployeeBasics
                .Where(e => EF.Property<string>(e, "EmployeeCode") == username)
                .Select(e => new
                {
                    Username = EF.Property<string>(e, "EmployeeCode"),
                    FullName = EF.Property<string>(e, "FullName") ?? EF.Property<string>(e, "EmployeeName"),
                    Email = EF.Property<string>(e, "Email"),
                    Phone = EF.Property<string>(e, "Phone"),
                    Department = EF.Property<string>(e, "Department"),
                    Designation = EF.Property<string>(e, "Designation")
                })
                .FirstOrDefaultAsync();
        }
        catch
        {
            empResult = null;
        }
    }

    // Attempt 3: match by UserId FK
    if (empResult == null)
    {
        try
        {
            var userRow = await db.Users
                .Where(u => u.Username == username)
                .Select(u => new { u.UserId })
                .FirstOrDefaultAsync();

            if (userRow != null)
            {
                empResult = await db.EmployeeBasics
                    .Where(e => EF.Property<int?>(e, "UserId") == userRow.UserId)
                    .Select(e => new
                    {
                        Username = EF.Property<string>(e, "EmployeeCode") ?? EF.Property<string>(e, "EmployeeName"),
                        FullName = EF.Property<string>(e, "FullName") ?? EF.Property<string>(e, "EmployeeName"),
                        Email = EF.Property<string>(e, "Email"),
                        Phone = EF.Property<string>(e, "Phone"),
                        Department = EF.Property<string>(e, "Department"),
                        Designation = EF.Property<string>(e, "Designation")
                    })
                    .FirstOrDefaultAsync();
            }
        }
        catch
        {
            empResult = null;
        }
    }

    if (empResult != null)
    {
        return Results.Json(new
        {
            result = true,
            message = "OK",
            data = new
            {
                profile = empResult,
                Roles = roles
            }
        });
    }

    return Results.Json(new
    {
        result = true,
        message = "OK",
        data = new
        {
            Username = username,
            Roles = roles,
            UserId = user.FindFirst("UserId")?.Value ?? user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        }
    });
}).RequireAuthorization("IsEmployee");

/* ---------------- Debug endpoint (temporary) ---------------- */
app.MapGet("/debug/claims", (HttpContext ctx) =>
{
    var u = ctx.User;
    var authenticated = u?.Identity?.IsAuthenticated ?? false;
    var claims = u?.Claims.Select(c => new { c.Type, c.Value }).ToArray() ?? Array.Empty<object>();
    var isInEmployee = u?.IsInRole("Employee") ?? false;
    var isInAdmin = u?.IsInRole("Admin") ?? false;
    return Results.Json(new { authenticated, isInEmployee, isInAdmin, claims });
}).RequireAuthorization();

app.Run();

//
// --- Local converter classes for DateOnly and TimeOnly (robust)
//
public class DateOnlyJsonConverter : JsonConverter<DateOnly>
{
    private static readonly string[] AcceptedFormats = new[] { "yyyy-MM-dd", "yyyyMMdd", "MM/dd/yyyy", "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-dd HH:mm:ss" };

    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var s = reader.GetString();
        if (string.IsNullOrEmpty(s)) return default;
        if (DateOnly.TryParseExact(s, AcceptedFormats, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d))
            return d;
        if (DateOnly.TryParse(s, out d)) return d;
        if (DateTime.TryParse(s, out var dt)) return DateOnly.FromDateTime(dt);
        throw new JsonException($"Invalid date format: {s}");
    }

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString("yyyy-MM-dd"));
}

public class TimeOnlyJsonConverter : JsonConverter<TimeOnly>
{
    private static readonly string[] AcceptedFormats = new[] { "HH:mm:ss", "HH:mm", "HH:mm:ss.FFF" };

    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var s = reader.GetString();
        if (string.IsNullOrEmpty(s)) return default;
        if (TimeOnly.TryParseExact(s, AcceptedFormats, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var t))
            return t;
        if (TimeOnly.TryParse(s, out t)) return t;
        if (DateTime.TryParse(s, out var dt)) return TimeOnly.FromDateTime(dt);
        throw new JsonException($"Invalid time format: {s}");
    }

    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString("HH:mm:ss"));
}
