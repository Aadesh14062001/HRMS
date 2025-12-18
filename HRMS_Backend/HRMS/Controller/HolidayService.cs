// Controller/HolidayService.cs
using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using HRMS.Helpers;
using HRMS.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace HRMS.Controller
{
    public class HolidayService
    {
        // POST /Holiday/GetAll
        // body: { Year?: 2025, CompanyId?: 19 }
        public async Task GetAll(HttpContext httpContext, HrmsContext db)
        {
            var resp = new JsonStructure();
            try
            {
                var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
                int? year = null;
                int? companyId = null;
                if (!string.IsNullOrWhiteSpace(body))
                {
                    using var doc = JsonDocument.Parse(body);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("Year", out var yEl) && yEl.ValueKind != JsonValueKind.Null && yEl.TryGetInt32(out var y))
                        year = y;
                    if (root.TryGetProperty("CompanyId", out var cEl) && cEl.ValueKind != JsonValueKind.Null && cEl.TryGetInt32(out var c))
                        companyId = c;
                }

                var q = db.Holidays.AsQueryable();

                if (companyId.HasValue)
                    q = q.Where(h => h.CompanyId == companyId.Value);

                if (year.HasValue)
                {
                    // Use a DateOnly range for the year to keep translation to SQL simple and reliable
                    var start = DateOnly.FromDateTime(new DateTime(year.Value, 1, 1));
                    var end = DateOnly.FromDateTime(new DateTime(year.Value, 12, 31));
                    q = q.Where(h => h.HolidayDate >= start && h.HolidayDate <= end);
                }

                var list = await q.OrderBy(h => h.HolidayDate).ToListAsync();

                resp.Result = true;
                resp.Message = "OK";
                resp.Data = new { holidays = list };
                httpContext.Response.StatusCode = 200;
            }
            catch (Exception ex)
            {
                resp.Result = false;
                resp.Message = "Load failed";
                resp.Data = new { error = ex.Message, details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
            }

            await httpContext.Response.WriteAsJsonAsync(resp);
        }

        // POST /Holiday/Insert
        // model-binding: Holiday holiday (Json)
        public async Task Insert(HttpContext httpContext, HrmsContext db, Holiday holiday)
        {
            var resp = new JsonStructure();
            try
            {
                if (holiday == null)
                {
                    resp.Result = false;
                    resp.Message = "Invalid payload";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                holiday.CreatedAt = DateTime.UtcNow;

                db.Holidays.Add(holiday);
                await db.SaveChangesAsync();

                resp.Result = true;
                resp.Message = "Holiday inserted";
                resp.Data = new { holiday };
                httpContext.Response.StatusCode = 201;
                await httpContext.Response.WriteAsJsonAsync(resp);
            }
            catch (Exception ex)
            {
                resp.Result = false;
                resp.Message = "Insert failed";
                resp.Data = new { error = ex.Message, details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(resp);
            }
        }

        // POST /Holiday/Update
        // model-binding: Holiday holiday
        public async Task Update(HttpContext httpContext, HrmsContext db, Holiday holiday)
        {
            var resp = new JsonStructure();
            try
            {
                if (holiday == null || holiday.HolidayId == 0)
                {
                    resp.Result = false;
                    resp.Message = "Invalid payload";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                var existing = await db.Holidays.FindAsync(holiday.HolidayId);
                if (existing == null)
                {
                    resp.Result = false;
                    resp.Message = "Holiday not found";
                    httpContext.Response.StatusCode = 404;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                existing.HolidayDate = holiday.HolidayDate;
                existing.Description = holiday.Description;
                existing.IsRecurring = holiday.IsRecurring;
                existing.Country = holiday.Country;
                existing.CompanyId = holiday.CompanyId;
                existing.CreatedAt = existing.CreatedAt ?? DateTime.UtcNow;

                db.Holidays.Update(existing);
                await db.SaveChangesAsync();

                resp.Result = true;
                resp.Message = "Holiday updated";
                resp.Data = new { holiday = existing };
                await httpContext.Response.WriteAsJsonAsync(resp);
            }
            catch (Exception ex)
            {
                resp.Result = false;
                resp.Message = "Update failed";
                resp.Data = new { error = ex.Message, details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(resp);
            }
        }

        // POST /Holiday/Delete
        // body: { HolidayId: 1 }
        public async Task Delete(HttpContext httpContext, HrmsContext db)
        {
            var resp = new JsonStructure();
            try
            {
                var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
                if (string.IsNullOrWhiteSpace(body))
                {
                    resp.Result = false;
                    resp.Message = "Missing payload";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                if (!root.TryGetProperty("HolidayId", out var idEl) || !idEl.TryGetInt32(out var id))
                {
                    resp.Result = false;
                    resp.Message = "HolidayId required";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                var existing = await db.Holidays.FindAsync(id);
                if (existing == null)
                {
                    resp.Result = false;
                    resp.Message = "Holiday not found";
                    httpContext.Response.StatusCode = 404;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                db.Holidays.Remove(existing);
                await db.SaveChangesAsync();

                resp.Result = true;
                resp.Message = "Holiday deleted";
                await httpContext.Response.WriteAsJsonAsync(resp);
            }
            catch (Exception ex)
            {
                resp.Result = false;
                resp.Message = "Delete failed";
                resp.Data = new { error = ex.Message, details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(resp);
            }
        }
    }
}
