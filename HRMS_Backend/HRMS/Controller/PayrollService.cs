// Controller/PayrollService.cs
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
    public class PayrollService
    {
        // POST /PayrollSlips/GetAll
        // Accepts body: { EmployeeId?, EmployeeCode?, SlipId?, Year?, Month? }
        public async Task GetAll(HttpContext httpContext, HrmsContext db)
        {
            var resp = new JsonStructure();
            try
            {
                var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
                int? employeeId = null;
                string? employeeCode = null;
                int? slipId = null;
                int? year = null;
                int? month = null;

                if (!string.IsNullOrWhiteSpace(body))
                {
                    using var doc = JsonDocument.Parse(body);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("EmployeeId", out var eId) && eId.TryGetInt32(out var eid)) employeeId = eid;
                    if (root.TryGetProperty("EmployeeCode", out var eCode) && eCode.ValueKind == JsonValueKind.String) employeeCode = eCode.GetString();
                    if (root.TryGetProperty("SlipId", out var sId) && sId.TryGetInt32(out var sid)) slipId = sid;
                    if (root.TryGetProperty("Year", out var y) && y.TryGetInt32(out var yy)) year = yy;
                    if (root.TryGetProperty("Month", out var m) && m.TryGetInt32(out var mm)) month = mm;
                }

                var q = db.PayrollSlips.AsQueryable();

                if (slipId.HasValue) q = q.Where(p => p.SlipId == slipId.Value);
                if (employeeId.HasValue) q = q.Where(p => p.EmployeeId == employeeId.Value);
                if (!string.IsNullOrWhiteSpace(employeeCode)) q = q.Where(p => p.EmployeeCode == employeeCode);
                if (year.HasValue) q = q.Where(p => p.Year == year.Value);
                if (month.HasValue) q = q.Where(p => p.Month == month.Value);

                var list = await q.OrderByDescending(p => p.Year).ThenByDescending(p => p.Month).ToListAsync();

                resp.Result = true;
                resp.Message = "OK";
                resp.Data = new { payrolls = list };
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

        // POST /PayrollSlips/Insert  (create slip metadata; optional to store PDF here)
        public async Task Insert(HttpContext httpContext, HrmsContext db, PayrollSlip slip)
        {
            var resp = new JsonStructure();
            try
            {
                if (slip == null)
                {
                    resp.Result = false;
                    resp.Message = "Invalid payload";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                slip.CreatedAt = DateTime.UtcNow;
                db.PayrollSlips.Add(slip);
                await db.SaveChangesAsync();

                resp.Result = true;
                resp.Message = "Payroll slip inserted";
                resp.Data = new { slip };
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

        // POST /PayrollSlips/UploadPDF  form-data: SlipId, file
        public async Task UploadPDF(HttpContext httpContext, HrmsContext db)
        {
            var resp = new JsonStructure();
            try
            {
                if (!httpContext.Request.HasFormContentType)
                {
                    resp.Result = false;
                    resp.Message = "Request must be form-data";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                var form = await httpContext.Request.ReadFormAsync();
                if (!form.TryGetValue("SlipId", out var slipIdVals) || !int.TryParse(slipIdVals.FirstOrDefault(), out var slipId))
                {
                    resp.Result = false;
                    resp.Message = "SlipId is required";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                var file = form.Files.FirstOrDefault();
                if (file == null || file.Length == 0)
                {
                    resp.Result = false;
                    resp.Message = "File required";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                var slip = await db.PayrollSlips.FindAsync(slipId);
                if (slip == null)
                {
                    resp.Result = false;
                    resp.Message = "Slip not found";
                    httpContext.Response.StatusCode = 404;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                slip.Pdffile = ms.ToArray();
                slip.CreatedAt = slip.CreatedAt ?? DateTime.UtcNow;

                db.PayrollSlips.Update(slip);
                await db.SaveChangesAsync();

                resp.Result = true;
                resp.Message = "PDF uploaded";
                resp.Data = new { slipId = slip.SlipId };
                await httpContext.Response.WriteAsJsonAsync(resp);
            }
            catch (Exception ex)
            {
                resp.Result = false;
                resp.Message = "Upload failed";
                resp.Data = new { error = ex.Message, details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(resp);
            }
        }

        // GET /PayrollSlips/DownloadPdf?slipId=123
        public async Task DownloadPdf(HttpContext httpContext, HrmsContext db)
        {
            try
            {
                var q = httpContext.Request.Query;
                if (!q.TryGetValue("slipId", out var sid) || !int.TryParse(sid.FirstOrDefault(), out var slipId))
                {
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(new JsonStructure { Result = false, Message = "slipId query required" });
                    return;
                }

                var slip = await db.PayrollSlips.FindAsync(slipId);
                if (slip == null || slip.Pdffile == null || slip.Pdffile.Length == 0)
                {
                    httpContext.Response.StatusCode = 404;
                    await httpContext.Response.WriteAsJsonAsync(new JsonStructure { Result = false, Message = "PDF not found" });
                    return;
                }

                // stream back pdf
                httpContext.Response.ContentType = "application/pdf";
                httpContext.Response.ContentLength = slip.Pdffile.Length;
                await httpContext.Response.Body.WriteAsync(slip.Pdffile, 0, slip.Pdffile.Length);
            }
            catch (Exception ex)
            {
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(new JsonStructure { Result = false, Message = "Download failed", Data = new { error = ex.Message } });
            }
        }
    }
}
