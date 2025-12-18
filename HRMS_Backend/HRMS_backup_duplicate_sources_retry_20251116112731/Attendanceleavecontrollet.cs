#nullable enable

using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using HRMS.Models;
using System.Collections.Generic;

namespace HRMS.Controller
{
    public static class JsonHelpers
    {
        // Trim + treat "null" (case-insensitive) as actual null
        public static bool TryGetString(JsonElement root, string[] keys, out string? value)
        {
            value = null;
            foreach (var k in keys)
            {
                if (!root.TryGetProperty(k, out var el)) continue;

                if (el.ValueKind == JsonValueKind.Null) { value = null; return true; }

                if (el.ValueKind == JsonValueKind.String)
                {
                    var s = el.GetString()?.Trim();
                    if (string.IsNullOrWhiteSpace(s)) { value = null; return true; }
                    if (string.Equals(s, "null", StringComparison.OrdinalIgnoreCase)) { value = null; return true; }
                    value = s;
                    return true;
                }

                // fallback for numbers/objects: .ToString() and treat "null" / empty as null
                var conv = el.ToString()?.Trim();
                if (string.IsNullOrWhiteSpace(conv) || string.Equals(conv, "null", StringComparison.OrdinalIgnoreCase)) { value = null; return true; }
                value = conv;
                return true;
            }
            return false;
        }

        public static bool TryGetInt(JsonElement root, string[] keys, out int? value)
        {
            value = null;
            foreach (var k in keys)
            {
                if (!root.TryGetProperty(k, out var el)) continue;
                if (el.ValueKind == JsonValueKind.Null) { value = null; return true; }
                if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var n)) { value = n; return true; }
                if (el.ValueKind == JsonValueKind.String)
                {
                    var s = el.GetString();
                    if (string.IsNullOrWhiteSpace(s) || string.Equals(s.Trim(), "null", StringComparison.OrdinalIgnoreCase)) { value = null; return true; }
                    if (int.TryParse(s, out var p)) { value = p; return true; }
                }
            }
            return false;
        }

        public static bool TryGetDate(JsonElement root, string[] keys, out DateOnly? value)
        {
            value = null;
            foreach (var k in keys)
            {
                if (!root.TryGetProperty(k, out var el)) continue;

                if (el.ValueKind == JsonValueKind.Null) { value = null; return true; }

                if (el.ValueKind == JsonValueKind.String)
                {
                    var s = el.GetString()?.Trim();
                    if (string.IsNullOrWhiteSpace(s) || string.Equals(s, "null", StringComparison.OrdinalIgnoreCase)) { value = null; return true; }
                    // Try DateOnly / DateTime parsing
                    if (DateOnly.TryParse(s, out var d1)) { value = d1; return true; }
                    if (DateTime.TryParse(s, out var dt)) { value = DateOnly.FromDateTime(dt); return true; }
                    // try yyyyMMdd
                    if (s.Length == 8 && DateTime.TryParseExact(s, "yyyyMMdd", null, System.Globalization.DateTimeStyles.None, out var dt2))
                    { value = DateOnly.FromDateTime(dt2); return true; }
                }

                if (el.ValueKind == JsonValueKind.Number)
                {
                    // Accept unix seconds or milliseconds heuristically
                    try
                    {
                        var num = el.GetInt64();
                        if (num > 1000000000000L) // ms
                        {
                            var dt = DateTimeOffset.FromUnixTimeMilliseconds(num).UtcDateTime;
                            value = DateOnly.FromDateTime(dt); return true;
                        }
                        else if (num > 1000000000L) // s
                        {
                            var dt = DateTimeOffset.FromUnixTimeSeconds(num).UtcDateTime;
                            value = DateOnly.FromDateTime(dt); return true;
                        }
                        else if (num > 0 && num < 99999999) // maybe yyyyMMdd
                        {
                            if (DateTime.TryParseExact(num.ToString(), "yyyyMMdd", null, System.Globalization.DateTimeStyles.None, out var dt3))
                            { value = DateOnly.FromDateTime(dt3); return true; }
                        }
                    }
                    catch { /* swallow and continue */ }
                }
            }
            return false;
        }

        public static bool TryGetTime(JsonElement root, string[] keys, out TimeOnly? value)
        {
            value = null;
            foreach (var k in keys)
            {
                if (!root.TryGetProperty(k, out var el)) continue;
                if (el.ValueKind == JsonValueKind.Null) { value = null; return true; }
                if (el.ValueKind == JsonValueKind.String)
                {
                    var s = el.GetString();
                    if (string.IsNullOrWhiteSpace(s) || string.Equals(s.Trim(), "null", StringComparison.OrdinalIgnoreCase)) { value = null; return true; }
                    if (TimeSpan.TryParse(s, out var ts)) { value = TimeOnly.FromTimeSpan(ts); return true; }
                    if (DateTime.TryParse(s, out var dt)) { value = TimeOnly.FromDateTime(dt); return true; }
                }
            }
            return false;
        }
    }

    // NOTE: removed the inner JsonStructure class here so we use the shared HRMS.Models.JsonStructure

    public class AttendanceService
    {
        private static object ToAttendanceDto(Attendance a) => new
        {
            AttendanceID = a.AttendanceId,
            EmployeeID = a.EmployeeId,
            EmployeeCode = a.EmployeeCode,
            AttendanceDate = a.AttendanceDate.ToString("yyyy-MM-dd"),
            Status = a.Status,
            CheckInTime = a.CheckInTime.HasValue ? a.CheckInTime.Value.ToString("HH:mm:ss") : null,
            CheckOutTime = a.CheckOutTime.HasValue ? a.CheckOutTime.Value.ToString("HH:mm:ss") : null,
            WorkHours = a.WorkHours,
            Remarks = a.Remarks,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        };

        private static async Task<int?> ResolveEmployeeId(HttpContext ctx, JsonDocument? json, HrmsContext db)
        {
            int? employeeId = null;
            string? employeeCode = null;

            if (json != null)
            {
                var root = json.RootElement;
                JsonHelpers.TryGetInt(root, new[] { "EmployeeID", "EmployeeId", "employeeId", "id" }, out employeeId);
                JsonHelpers.TryGetString(root, new[] { "EmployeeCode", "employeeCode", "employee", "Employee" }, out employeeCode);
            }

            if (!employeeId.HasValue)
            {
                var user = ctx.User;
                if (user?.Identity?.IsAuthenticated == true)
                {
                    var idClaim = user.FindFirst("EmployeeID") ?? user.FindFirst("EmployeeId")
                                  ?? user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                                  ?? user.FindFirst("UserId") ?? user.FindFirst("sub");

                    if (idClaim != null && int.TryParse(idClaim.Value, out var idVal)) employeeId = idVal;

                    if (string.IsNullOrWhiteSpace(employeeCode))
                    {
                        var codeClaim = user.FindFirst("EmployeeCode") ?? user.FindFirst(System.Security.Claims.ClaimTypes.Name)
                                        ?? user.FindFirst("username") ?? user.FindFirst("sub");
                        if (codeClaim != null) employeeCode = codeClaim.Value;
                    }
                }
            }

            if ((!employeeId.HasValue || employeeId.Value == 0) && !string.IsNullOrWhiteSpace(employeeCode))
            {
                var emp = await db.EmployeeBasics
                    .Where(e => e.EmployeeCode != null && e.EmployeeCode.ToLower() == employeeCode!.ToLower())
                    .Select(e => new { e.EmployeeId })
                    .FirstOrDefaultAsync();

                if (emp != null) employeeId = emp.EmployeeId;
            }

            if (employeeId.HasValue && employeeId.Value == 0) employeeId = null;
            return employeeId;
        }

        // POST /Attendance/Insert
        public async Task Insert(HttpContext httpContext, HrmsContext db)
        {
            var resp = new JsonStructure();
            try
            {
                var body = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
                JsonDocument? json = string.IsNullOrWhiteSpace(body) ? null : JsonDocument.Parse(body);

                var employeeId = await ResolveEmployeeId(httpContext, json, db);
                if (!employeeId.HasValue)
                {
                    resp.Result = false;
                    resp.Message = "Employee identity could not be resolved. Include EmployeeID or EmployeeCode or ensure token contains EmployeeID.";
                    resp.Data = new { Reason = "EmployeeIdentityMissing" };
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                string action = "manual";
                string? remarks = null;

                if (json != null)
                {
                    var root = json.RootElement;
                    if (JsonHelpers.TryGetString(root, new[] { "Action", "action" }, out var actVal) && !string.IsNullOrWhiteSpace(actVal))
                        action = actVal!;
                    if (JsonHelpers.TryGetString(root, new[] { "Remarks", "remarks", "remark" }, out var rVal))
                        remarks = rVal; // could be null if client sent null or "null"
                }

                action = action.Trim();
                var today = DateOnly.FromDateTime(DateTime.UtcNow);

                var existing = await db.Attendances.FirstOrDefaultAsync(a => a.AttendanceDate == today && a.EmployeeId == employeeId.Value);

                if (action.Equals("checkin", StringComparison.OrdinalIgnoreCase))
                {
                    if (existing == null)
                    {
                        var rec = new Attendance
                        {
                            EmployeeId = employeeId.Value,
                            EmployeeCode = null,
                            AttendanceDate = today,
                            Status = "Present",
                            CheckInTime = TimeOnly.FromDateTime(DateTime.UtcNow),
                            CreatedAt = DateTime.UtcNow,
                            Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks
                        };
                        db.Attendances.Add(rec);
                        await db.SaveChangesAsync();

                        resp.Result = true;
                        resp.Message = "Checked in";
                        resp.Data = ToAttendanceDto(rec);
                        httpContext.Response.StatusCode = 201;
                        await httpContext.Response.WriteAsJsonAsync(resp);
                        return;
                    }

                    if (!existing.CheckInTime.HasValue)
                        existing.CheckInTime = TimeOnly.FromDateTime(DateTime.UtcNow);

                    existing.Status = "Present";
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Remarks = string.IsNullOrWhiteSpace(remarks) ? existing.Remarks : remarks;
                    db.Attendances.Update(existing);
                    await db.SaveChangesAsync();

                    resp.Result = true;
                    resp.Message = "Check-in updated";
                    resp.Data = ToAttendanceDto(existing);
                    httpContext.Response.StatusCode = 200;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }
                else if (action.Equals("checkout", StringComparison.OrdinalIgnoreCase))
                {
                    if (existing == null)
                    {
                        var rec = new Attendance
                        {
                            EmployeeId = employeeId.Value,
                            EmployeeCode = null,
                            AttendanceDate = today,
                            Status = "Present",
                            CheckOutTime = TimeOnly.FromDateTime(DateTime.UtcNow),
                            CreatedAt = DateTime.UtcNow,
                            Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks
                        };
                        db.Attendances.Add(rec);
                        await db.SaveChangesAsync();

                        resp.Result = true;
                        resp.Message = "Checked out (no prior check-in)";
                        resp.Data = ToAttendanceDto(rec);
                        httpContext.Response.StatusCode = 201;
                        await httpContext.Response.WriteAsJsonAsync(resp);
                        return;
                    }

                    existing.CheckOutTime = TimeOnly.FromDateTime(DateTime.UtcNow);
                    if (existing.CheckInTime.HasValue && existing.CheckOutTime.HasValue)
                    {
                        var ts = existing.CheckOutTime.Value.ToTimeSpan() - existing.CheckInTime.Value.ToTimeSpan();
                        existing.WorkHours = Math.Round((decimal)ts.TotalHours, 2);
                    }

                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Remarks = string.IsNullOrWhiteSpace(remarks) ? existing.Remarks : remarks;
                    db.Attendances.Update(existing);
                    await db.SaveChangesAsync();

                    resp.Result = true;
                    resp.Message = "Checked out";
                    resp.Data = ToAttendanceDto(existing);
                    httpContext.Response.StatusCode = 200;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }
                else
                {
                    // Manual insert/update
                    Attendance a;
                    if (existing != null) a = existing;
                    else a = new Attendance { EmployeeId = employeeId.Value, EmployeeCode = null, CreatedAt = DateTime.UtcNow };

                    if (json != null)
                    {
                        var root = json.RootElement;
                        if (JsonHelpers.TryGetDate(root, new[] { "AttendanceDate", "attendanceDate", "Date" }, out var ad) && ad.HasValue)
                            a.AttendanceDate = ad.Value;

                        if (JsonHelpers.TryGetString(root, new[] { "Status", "status" }, out var s))
                            a.Status = s; // keeps null if client sent "null" or null

                        if (JsonHelpers.TryGetTime(root, new[] { "CheckInTime", "checkInTime" }, out var cit) && cit.HasValue)
                            a.CheckInTime = cit;

                        if (JsonHelpers.TryGetTime(root, new[] { "CheckOutTime", "checkOutTime" }, out var cot) && cot.HasValue)
                            a.CheckOutTime = cot;
                    }

                    if (a.CheckInTime.HasValue && a.CheckOutTime.HasValue)
                    {
                        var ts = a.CheckOutTime.Value.ToTimeSpan() - a.CheckInTime.Value.ToTimeSpan();
                        a.WorkHours = Math.Round((decimal)ts.TotalHours, 2);
                    }

                    if (existing == null)
                    {
                        a.CreatedAt = DateTime.UtcNow;
                        db.Attendances.Add(a);
                        await db.SaveChangesAsync();
                        resp.Result = true;
                        resp.Message = "Attendance added";
                        resp.Data = ToAttendanceDto(a);
                        httpContext.Response.StatusCode = 201;
                        await httpContext.Response.WriteAsJsonAsync(resp);
                        return;
                    }
                    else
                    {
                        a.UpdatedAt = DateTime.UtcNow;
                        db.Attendances.Update(a);
                        await db.SaveChangesAsync();
                        resp.Result = true;
                        resp.Message = "Attendance updated";
                        resp.Data = ToAttendanceDto(a);
                        httpContext.Response.StatusCode = 200;
                        await httpContext.Response.WriteAsJsonAsync(resp);
                        return;
                    }
                }
            }
            catch (DbUpdateException dbEx)
            {
                var sqlEx = dbEx.InnerException as SqlException ?? dbEx.GetBaseException() as SqlException;
                if (sqlEx != null && sqlEx.Number == 547)
                {
                    var fkResp = new JsonStructure { Result = false, Message = "Database foreign key constraint failed.", Data = new { Error = sqlEx.Message } };
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(fkResp);
                    return;
                }

                resp.Result = false;
                resp.Message = "Attendance insert/update failed (database error)";
                resp.Data = new { Error = dbEx.Message, Details = dbEx.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(resp);
                return;
            }
            catch (Exception ex)
            {
                resp.Result = false;
                resp.Message = "Attendance insert/update failed";
                resp.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(resp);
                return;
            }
        }

        // POST /Attendance/GetAll
        public async Task GetAll(HttpContext httpContext, HrmsContext db)
        {
            var resp = new JsonStructure();
            try
            {
                var body = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
                JsonDocument? json = string.IsNullOrWhiteSpace(body) ? null : JsonDocument.Parse(body);

                int employeeId = 0;
                DateOnly? from = null, to = null;

                if (json != null)
                {
                    var root = json.RootElement;
                    JsonHelpers.TryGetInt(root, new[] { "EmployeeID", "EmployeeId", "employeeId" }, out var eid);
                    if (eid.HasValue) employeeId = eid.Value;
                    JsonHelpers.TryGetDate(root, new[] { "FromDate", "fromDate" }, out from);
                    JsonHelpers.TryGetDate(root, new[] { "ToDate", "toDate" }, out to);
                }

                var q = db.Attendances.AsQueryable();
                if (employeeId > 0) q = q.Where(a => a.EmployeeId == employeeId);
                if (from.HasValue) q = q.Where(a => a.AttendanceDate >= from.Value);
                if (to.HasValue) q = q.Where(a => a.AttendanceDate <= to.Value);

                var list = await q.OrderByDescending(a => a.AttendanceDate).Take(1000).ToListAsync();
                var dto = list.Select(a => ToAttendanceDto(a)).ToList();

                resp.Result = true;
                resp.Message = "OK";
                resp.Data = new { Attendance = dto };
                httpContext.Response.StatusCode = 200;
            }
            catch (Exception ex)
            {
                resp.Result = false;
                resp.Message = "Failed to load attendance";
                resp.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
            }

            await httpContext.Response.WriteAsJsonAsync(resp);
        }
    } // AttendanceService

    public class LeaveRequestsService
    {
        private static object ToLeaveDto(LeaveRequest lr) => new
        {
            leaveRequestID = lr.LeaveRequestId,
            employeeID = lr.EmployeeId,
            employeeCode = lr.EmployeeCode,
            leaveType = lr.LeaveType,
            fromDate = lr.FromDate.ToString("yyyy-MM-dd"),
            toDate = lr.ToDate.ToString("yyyy-MM-dd"),
            days = lr.Days,
            reason = lr.Reason,
            status = lr.Status,
            approverId = lr.ApproverId.HasValue ? lr.ApproverId.Value : (int?)null,
            approverRemarks = lr.ApproverRemarks,
            createdAt = lr.CreatedAt,
            updatedAt = lr.UpdatedAt
        };

        // POST /LeaveRequests/Insert
        public async Task Insert(HttpContext httpContext, HrmsContext db)
        {
            var resp = new JsonStructure();
            try
            {
                var body = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
                JsonDocument? json = string.IsNullOrWhiteSpace(body) ? null : JsonDocument.Parse(body);

                int? employeeId = null;
                string? employeeCode = null;

                if (json != null)
                {
                    var root = json.RootElement;
                    JsonHelpers.TryGetInt(root, new[] { "EmployeeID", "EmployeeId", "employeeId", "id" }, out employeeId);
                    JsonHelpers.TryGetString(root, new[] { "EmployeeCode", "employeeCode", "Employee", "employee" }, out employeeCode);
                }

                // token fallback
                if (!employeeId.HasValue)
                {
                    var user = httpContext.User;
                    if (user?.Identity?.IsAuthenticated == true)
                    {
                        var claim = user.FindFirst("EmployeeID") ?? user.FindFirst("EmployeeId")
                                    ?? user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                                    ?? user.FindFirst("UserId") ?? user.FindFirst("sub");
                        if (claim != null && int.TryParse(claim.Value, out var idFromClaim)) employeeId = idFromClaim;

                        if (string.IsNullOrWhiteSpace(employeeCode))
                        {
                            var codeClaim = user.FindFirst("EmployeeCode") ?? user.FindFirst(System.Security.Claims.ClaimTypes.Name) ?? user.FindFirst("username");
                            if (codeClaim != null) employeeCode = codeClaim.Value;
                        }
                    }
                }

                // if only code present, lookup numeric id
                if ((!employeeId.HasValue || employeeId.Value == 0) && !string.IsNullOrWhiteSpace(employeeCode))
                {
                    var emp = await db.EmployeeBasics
                                .Where(e => e.EmployeeCode != null && e.EmployeeCode.ToLower() == employeeCode.ToLower())
                                .Select(e => new { e.EmployeeId, e.EmployeeCode })
                                .FirstOrDefaultAsync();
                    if (emp != null) { employeeId = emp.EmployeeId; employeeCode = emp.EmployeeCode; }
                }

                if (!employeeId.HasValue)
                {
                    resp.Result = false;
                    resp.Message = "EmployeeID or valid EmployeeCode required to submit leave request.";
                    resp.Data = new { reason = "EmployeeIdentityMissing" };
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                // defaults
                var lr = new LeaveRequest
                {
                    EmployeeId = employeeId.Value,
                    EmployeeCode = employeeCode,
                    LeaveType = "Casual",
                    FromDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    ToDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    Reason = null,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };

                if (json != null)
                {
                    var root = json.RootElement;

                    // LeaveType - only assign when parsed value is not null
                    if (JsonHelpers.TryGetString(root, new[] { "LeaveType", "leaveType", "Type", "type" }, out var lt) && lt != null)
                        lr.LeaveType = lt;

                    // Dates
                    if (JsonHelpers.TryGetDate(root, new[] { "FromDate", "fromDate", "from" }, out var fromDate) && fromDate.HasValue)
                        lr.FromDate = fromDate.Value;

                    if (JsonHelpers.TryGetDate(root, new[] { "ToDate", "toDate", "to" }, out var toDate) && toDate.HasValue)
                        lr.ToDate = toDate.Value;

                    // EmployeeCode override (preserve null)
                    if (JsonHelpers.TryGetString(root, new[] { "EmployeeCode", "employeeCode" }, out var ec))
                        lr.EmployeeCode = ec;

                    // Reason explicitly handle string "null" or null JSON value
                    if (root.TryGetProperty("Reason", out var rr) || root.TryGetProperty("reason", out rr))
                    {
                        if (rr.ValueKind == JsonValueKind.Null) lr.Reason = null;
                        else if (rr.ValueKind == JsonValueKind.String)
                        {
                            var rs = rr.GetString()?.Trim();
                            if (string.IsNullOrWhiteSpace(rs) || string.Equals(rs, "null", StringComparison.OrdinalIgnoreCase)) lr.Reason = null;
                            else lr.Reason = rs;
                        }
                        else
                        {
                            var conv = rr.ToString()?.Trim();
                            if (string.IsNullOrWhiteSpace(conv) || string.Equals(conv, "null", StringComparison.OrdinalIgnoreCase)) lr.Reason = null;
                            else lr.Reason = conv;
                        }
                    }
                }

                // fill employee code if missing
                if (string.IsNullOrWhiteSpace(lr.EmployeeCode))
                {
                    var empRec = await db.EmployeeBasics.Where(e => e.EmployeeId == employeeId.Value)
                        .Select(e => new { e.EmployeeCode })
                        .FirstOrDefaultAsync();
                    if (empRec != null && empRec.EmployeeCode != null) lr.EmployeeCode = empRec.EmployeeCode;
                }

                // ensure from/to order
                if (lr.FromDate > lr.ToDate)
                {
                    var tmp = lr.FromDate;
                    lr.FromDate = lr.ToDate;
                    lr.ToDate = tmp;
                }

                // days (inclusive)
                try
                {
                    var days = (decimal)(lr.ToDate.DayNumber - lr.FromDate.DayNumber + 1);
                    lr.Days = days < 0 ? 0 : days;
                }
                catch
                {
                    lr.Days = 0;
                }

                db.LeaveRequests.Add(lr);
                await db.SaveChangesAsync();

                resp.Result = true;
                resp.Message = "Leave request submitted";
                resp.Data = ToLeaveDto(lr);
                httpContext.Response.StatusCode = 201;
                await httpContext.Response.WriteAsJsonAsync(resp);
                return;
            }
            catch (DbUpdateException dbEx)
            {
                var sqlEx = dbEx.InnerException as SqlException ?? dbEx.GetBaseException() as SqlException;
                if (sqlEx != null && sqlEx.Number == 547)
                {
                    resp.Result = false;
                    resp.Message = "Database foreign key constraint failed - invalid EmployeeId or related record missing.";
                    resp.Data = new { Error = sqlEx.Message };
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                resp.Result = false;
                resp.Message = "Failed to submit leave request (database error)";
                resp.Data = new { Error = dbEx.Message, Details = dbEx.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(resp);
                return;
            }
            catch (Exception ex)
            {
                resp.Result = false;
                resp.Message = "Failed to submit leave request";
                resp.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(resp);
                return;
            }
        } // Insert

        // POST /LeaveRequests/GetAll
        public async Task GetAll(HttpContext httpContext, HrmsContext db)
        {
            var resp = new JsonStructure();
            try
            {
                var body = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
                JsonDocument? json = string.IsNullOrWhiteSpace(body) ? null : JsonDocument.Parse(body);

                int? employeeId = null;
                string? status = null;
                DateOnly? from = null, to = null;

                if (json != null)
                {
                    var root = json.RootElement;
                    JsonHelpers.TryGetInt(root, new[] { "EmployeeID", "EmployeeId", "employeeId" }, out employeeId);
                    if (JsonHelpers.TryGetString(root, new[] { "Status", "status" }, out var st) && st != null) status = st;
                    JsonHelpers.TryGetDate(root, new[] { "FromDate", "fromDate", "from" }, out from);
                    JsonHelpers.TryGetDate(root, new[] { "ToDate", "toDate", "to" }, out to);
                }

                var q = db.LeaveRequests.AsQueryable();

                if (employeeId.HasValue && employeeId.Value > 0) q = q.Where(lr => lr.EmployeeId == employeeId.Value);
                if (!string.IsNullOrWhiteSpace(status)) q = q.Where(lr => lr.Status != null && lr.Status.ToLower() == status.ToLower());
                if (from.HasValue) q = q.Where(lr => lr.FromDate >= from.Value);
                if (to.HasValue) q = q.Where(lr => lr.ToDate <= to.Value);

                var list = await q.OrderByDescending(lr => lr.CreatedAt).Take(1000).ToListAsync();
                var dto = list.Select(lr => ToLeaveDto(lr)).ToList();

                resp.Result = true;
                resp.Message = "OK";
                resp.Data = new { LeaveRequests = dto };
                httpContext.Response.StatusCode = 200;
            }
            catch (Exception ex)
            {
                resp.Result = false;
                resp.Message = "Failed to load leave requests";
                resp.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
            }

            await httpContext.Response.WriteAsJsonAsync(resp);
        }

        // POST /LeaveRequests/UpdateStatus
        public async Task UpdateStatus(HttpContext httpContext, HrmsContext db)
        {
            var resp = new JsonStructure();
            try
            {
                var body = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
                JsonDocument? json = string.IsNullOrWhiteSpace(body) ? null : JsonDocument.Parse(body);

                if (json == null)
                {
                    resp.Result = false;
                    resp.Message = "Request body required";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                var root = json.RootElement;
                if (!JsonHelpers.TryGetInt(root, new[] { "LeaveRequestID", "LeaveRequestId", "leaveRequestId", "id" }, out var lrId) || !lrId.HasValue)
                {
                    resp.Result = false;
                    resp.Message = "LeaveRequestID is required";
                    resp.Data = new { reason = "MissingLeaveRequestID" };
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                // Status (allow explicit null)
                string? newStatus = null;
                if (JsonHelpers.TryGetString(root, new[] { "Status", "status" }, out var ns))
                    newStatus = ns;

                int? approverId = null;
                JsonHelpers.TryGetInt(root, new[] { "ApproverId", "ApproverID", "approverId", "approver" }, out approverId);

                string? approverRemarks = null;
                if (root.TryGetProperty("ApproverRemarks", out var ar) || root.TryGetProperty("approverRemarks", out ar))
                {
                    if (ar.ValueKind == JsonValueKind.Null) approverRemarks = null;
                    else if (ar.ValueKind == JsonValueKind.String)
                    {
                        var s = ar.GetString()?.Trim();
                        if (string.IsNullOrWhiteSpace(s) || string.Equals(s, "null", StringComparison.OrdinalIgnoreCase)) approverRemarks = null;
                        else approverRemarks = s;
                    }
                    else
                    {
                        var conv = ar.ToString()?.Trim();
                        approverRemarks = string.IsNullOrWhiteSpace(conv) || string.Equals(conv, "null", StringComparison.OrdinalIgnoreCase) ? null : conv;
                    }
                }

                var lr = await db.LeaveRequests.FirstOrDefaultAsync(x => x.LeaveRequestId == lrId.Value);
                if (lr == null)
                {
                    resp.Result = false;
                    resp.Message = "Leave request not found";
                    resp.Data = new { reason = "NotFound", LeaveRequestID = lrId.Value };
                    httpContext.Response.StatusCode = 404;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                if (newStatus != null) lr.Status = newStatus;
                if (approverId.HasValue) lr.ApproverId = approverId.Value;
                if (approverRemarks != null) lr.ApproverRemarks = approverRemarks;
                lr.UpdatedAt = DateTime.UtcNow;

                db.LeaveRequests.Update(lr);
                await db.SaveChangesAsync();

                resp.Result = true;
                resp.Message = "Leave request updated";
                resp.Data = ToLeaveDto(lr);
                httpContext.Response.StatusCode = 200;
                await httpContext.Response.WriteAsJsonAsync(resp);
                return;
            }
            catch (DbUpdateException dbEx)
            {
                var sqlEx = dbEx.InnerException as SqlException ?? dbEx.GetBaseException() as SqlException;
                if (sqlEx != null && sqlEx.Number == 547)
                {
                    resp.Result = false;
                    resp.Message = "Database foreign key constraint failed - maybe approver id invalid.";
                    resp.Data = new { Error = sqlEx.Message };
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(resp);
                    return;
                }

                resp.Result = false;
                resp.Message = "Failed to update leave request (database error)";
                resp.Data = new { Error = dbEx.Message, Details = dbEx.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(resp);
                return;
            }
            catch (Exception ex)
            {
                resp.Result = false;
                resp.Message = "Failed to update leave request";
                resp.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(resp);
                return;
            }
        } // UpdateStatus
    } // LeaveRequestsService
} // namespace
