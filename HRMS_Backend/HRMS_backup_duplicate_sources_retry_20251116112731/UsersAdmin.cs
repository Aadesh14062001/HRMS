// // HRMS/Controller/UsersAdmin.cs
// using System;
// using System.Collections.Generic;
// using System.IO;
// using System.Linq;
// using System.Text.Json;
// using System.Threading.Tasks;
// using Microsoft.Data.SqlClient;
// using Microsoft.AspNetCore.Http;
// using Microsoft.Extensions.Configuration;
// using HRMS.Models;
// using HRMS.Helpers;

// namespace HRMS.Controller
// {
//     public class UsersAdmin
//     {
//         // Open a SQL connection using configuration
//         private static SqlConnection OpenConn(IConfiguration config)
//         {
//             var cs = config.GetConnectionString("DefaultConnection")
//                      ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection missing");
//             var conn = new SqlConnection(cs);
//             conn.Open();
//             return conn;
//         }

//         private static string TryGetString(JsonElement root, params string[] keys)
//         {
//             foreach (var k in keys)
//             {
//                 if (root.TryGetProperty(k, out var el) && el.ValueKind == JsonValueKind.String)
//                 {
//                     var s = el.GetString();
//                     if (!string.IsNullOrWhiteSpace(s)) return s.Trim();
//                 }
//             }
//             return "";
//         }

//         private static int? TryGetInt(JsonElement root, params string[] keys)
//         {
//             foreach (var k in keys)
//             {
//                 if (root.TryGetProperty(k, out var el))
//                 {
//                     if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var v)) return v;
//                     if (el.ValueKind == JsonValueKind.String && int.TryParse(el.GetString(), out var v2)) return v2;
//                 }
//             }
//             return null;
//         }

//         private static bool TryGetBool(JsonElement root, out bool value, params string[] keys)
//         {
//             value = false;
//             foreach (var k in keys)
//             {
//                 if (root.TryGetProperty(k, out var el))
//                 {
//                     if (el.ValueKind == JsonValueKind.True || el.ValueKind == JsonValueKind.False)
//                     {
//                         value = el.GetBoolean();
//                         return true;
//                     }
//                     if (el.ValueKind == JsonValueKind.String && bool.TryParse(el.GetString(), out var b))
//                     {
//                         value = b;
//                         return true;
//                     }
//                     if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var n))
//                     {
//                         value = n != 0;
//                         return true;
//                     }
//                 }
//             }
//             return false;
//         }

//         public async Task GetAll(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
//         {
//             var Response = new JsonStructure();
//             try
//             {
//                 string? filter = null;
//                 var requestBody = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
//                 if (!string.IsNullOrWhiteSpace(requestBody))
//                 {
//                     using var json = JsonDocument.Parse(requestBody);
//                     if (json.RootElement.TryGetProperty("username", out var f) ||
//                         json.RootElement.TryGetProperty("Username", out f) ||
//                         json.RootElement.TryGetProperty("userName", out f))
//                     {
//                         filter = f.GetString();
//                     }
//                 }

//                 var list = new List<object>();
//                 await using (var conn = OpenConn(config))
//                 await using (var cmd = new SqlCommand(@"
// SELECT u.UserId, u.Username, u.IsActive,
//        STRING_AGG(r.RoleName, ',') AS Roles
// FROM Users u
// LEFT JOIN UserRoles ur ON ur.UserId = u.UserId
// LEFT JOIN Roles r     ON r.RoleId = ur.RoleId
// WHERE (@f IS NULL OR u.Username LIKE '%' + @f + '%')
// GROUP BY u.UserId, u.Username, u.IsActive
// ORDER BY u.UserId", conn))
//                 {
//                     cmd.Parameters.AddWithValue("@f", (object?)filter ?? DBNull.Value);
//                     await using var rd = await cmd.ExecuteReaderAsync();
//                     while (await rd.ReadAsync())
//                     {
//                         list.Add(new
//                         {
//                             UserId = rd.GetInt32(0),
//                             Username = rd.GetString(1),
//                             IsActive = rd.GetBoolean(2),
//                             Roles = rd.IsDBNull(3) ? "" : rd.GetString(3)
//                         });
//                     }
//                 }

//                 Response.Result = true;
//                 Response.Message = "OK";
//                 Response.Data = list;
//                 httpContext.Response.StatusCode = 200;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//             catch (Exception ex)
//             {
//                 Response.Result = false;
//                 Response.Message = "Failed to fetch users";
//                 Response.Data = new { Error = ex.Message };
//                 httpContext.Response.StatusCode = 500;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//         }

//         public async Task Create(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
//         {
//             var Response = new JsonStructure();

//             try
//             {
//                 var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
//                 if (string.IsNullOrWhiteSpace(body))
//                     throw new InvalidOperationException("Request body is required.");

//                 using var json = JsonDocument.Parse(body);
//                 var root = json.RootElement;

//                 var username = TryGetString(root, "username", "Username", "userName");
//                 var password = TryGetString(root, "password", "Password", "pass", "pwd");

//                 bool isActive = true;
//                 if (TryGetBool(root, out var tmpActive, "isActive", "IsActive", "active"))
//                     isActive = tmpActive;

//                 var roles = new List<string>();
//                 if (root.TryGetProperty("roles", out var rolesEl) && rolesEl.ValueKind == JsonValueKind.Array)
//                 {
//                     foreach (var r in rolesEl.EnumerateArray())
//                     {
//                         if (r.ValueKind == JsonValueKind.String)
//                         {
//                             var s = r.GetString();
//                             if (!string.IsNullOrWhiteSpace(s)) roles.Add(s.Trim());
//                         }
//                     }
//                 }

//                 if (string.IsNullOrWhiteSpace(username))
//                     throw new InvalidOperationException("username is required.");
//                 if (string.IsNullOrWhiteSpace(password))
//                     throw new InvalidOperationException("password is required.");

//                 roles = roles.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

//                 int newUserId;
//                 await using (var conn = OpenConn(config))
//                 {
//                     await using (var chk = new SqlCommand("SELECT COUNT(1) FROM Users WHERE Username=@u", conn))
//                     {
//                         chk.Parameters.AddWithValue("@u", username);
//                         var exists = Convert.ToInt32(await chk.ExecuteScalarAsync());
//                         if (exists > 0) throw new InvalidOperationException("Username already exists");
//                     }

//                     await using (var cmd = new SqlCommand(@"
// INSERT INTO Users (Username, PasswordHash, PasswordSalt, IsActive)
// OUTPUT INSERTED.UserId
// VALUES (@u, 0x, 0x, @a)", conn))
//                     {
//                         cmd.Parameters.AddWithValue("@u", username);
//                         cmd.Parameters.AddWithValue("@a", isActive);
//                         newUserId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
//                     }

//                     foreach (var role in roles)
//                     {
//                         await using var rcmd = new SqlCommand(@"
// INSERT INTO UserRoles (UserId, RoleId)
// SELECT @uid, RoleId FROM Roles WHERE RoleName=@r", conn);
//                         rcmd.Parameters.AddWithValue("@uid", newUserId);
//                         rcmd.Parameters.AddWithValue("@r", role);
//                         await rcmd.ExecuteNonQueryAsync();
//                     }
//                 }

//                 var rows = await SetPasswordInternal(config, username, password);
//                 if (rows == 0)
//                     throw new InvalidOperationException("Failed to set password for the created user.");

//                 Response.Result = true;
//                 Response.Message = "User created";
//                 Response.Data = new { userId = newUserId, username, isActive, roles };
//                 httpContext.Response.StatusCode = 200;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//             catch (InvalidOperationException ie)
//             {
//                 Response.Result = false;
//                 Response.Message = ie.Message;
//                 httpContext.Response.StatusCode = 400;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//             catch (Exception ex)
//             {
//                 Response.Result = false;
//                 Response.Message = "Create user failed";
//                 Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
//                 httpContext.Response.StatusCode = 500;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//         }

//         public async Task SetPassword(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
//         {
//             var Response = new JsonStructure();

//             try
//             {
//                 var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
//                 if (string.IsNullOrWhiteSpace(body))
//                     throw new InvalidOperationException("Request body is required");

//                 using var json = JsonDocument.Parse(body);
//                 var root = json.RootElement;

//                 var username = TryGetString(root, "username", "Username", "userName");
//                 var password = TryGetString(root, "password", "Password", "pass", "pwd");

//                 if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
//                     throw new InvalidOperationException("username/password required");

//                 var rows = await SetPasswordInternal(config, username, password);
//                 if (rows == 0) throw new InvalidOperationException("User not found");

//                 Response.Result = true;
//                 Response.Message = "Password updated";
//                 Response.Data = new { username };
//                 httpContext.Response.StatusCode = 200;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//             catch (InvalidOperationException ie)
//             {
//                 Response.Result = false;
//                 Response.Message = ie.Message;
//                 httpContext.Response.StatusCode = 400;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//             catch (Exception ex)
//             {
//                 Response.Result = false;
//                 Response.Message = "Failed to update password";
//                 Response.Data = new { Error = ex.Message };
//                 httpContext.Response.StatusCode = 500;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//         }

//         public async Task ToggleActive(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
//         {
//             var Response = new JsonStructure();

//             try
//             {
//                 var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
//                 if (string.IsNullOrWhiteSpace(body))
//                     throw new InvalidOperationException("Request body is required");

//                 using var json = JsonDocument.Parse(body);
//                 var root = json.RootElement;

//                 int? userId = TryGetInt(root, "userId", "UserId", "id");
//                 string? username = null;
//                 if (userId == null)
//                 {
//                     var u = TryGetString(root, "username", "Username", "user");
//                     if (!string.IsNullOrWhiteSpace(u)) username = u;
//                 }

//                 if (userId == null && string.IsNullOrWhiteSpace(username))
//                     throw new InvalidOperationException("Provide userId (number) or username (string) in request body");

//                 await using (var conn = OpenConn(config))
//                 {
//                     if (userId != null)
//                     {
//                         await using var cmd = new SqlCommand(@"
// UPDATE Users SET IsActive = CASE WHEN IsActive=1 THEN 0 ELSE 1 END
// WHERE UserId=@id", conn);
//                         cmd.Parameters.AddWithValue("@id", userId.Value);
//                         var rows = await cmd.ExecuteNonQueryAsync();
//                         if (rows == 0) throw new InvalidOperationException("User not found");
//                     }
//                     else
//                     {
//                         await using var cmd2 = new SqlCommand(@"
// UPDATE Users SET IsActive = CASE WHEN IsActive=1 THEN 0 ELSE 1 END
// WHERE Username=@u", conn);
//                         cmd2.Parameters.AddWithValue("@u", username);
//                         var rows = await cmd2.ExecuteNonQueryAsync();
//                         if (rows == 0) throw new InvalidOperationException("User not found");
//                     }
//                 }

//                 Response.Result = true;
//                 Response.Message = "Status updated";
//                 httpContext.Response.StatusCode = 200;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//             catch (InvalidOperationException ie)
//             {
//                 Response.Result = false;
//                 Response.Message = ie.Message;
//                 httpContext.Response.StatusCode = 400;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//             catch (Exception ex)
//             {
//                 Response.Result = false;
//                 Response.Message = "Failed to update status";
//                 Response.Data = new { Error = ex.Message };
//                 httpContext.Response.StatusCode = 500;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//         }

//         public async Task SetRoles(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
//         {
//             var Response = new JsonStructure();

//             try
//             {
//                 var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
//                 if (string.IsNullOrWhiteSpace(body))
//                     throw new InvalidOperationException("Body is empty");

//                 using var json = JsonDocument.Parse(body);
//                 var root = json.RootElement;

//                 string username = TryGetString(root, "username", "Username", "userName");
//                 if (string.IsNullOrWhiteSpace(username))
//                     throw new InvalidOperationException("username required");

//                 if (!root.TryGetProperty("roles", out var rolesEl) || rolesEl.ValueKind != JsonValueKind.Array)
//                     throw new InvalidOperationException("Expected { username, roles[] }");

//                 var roles = rolesEl.EnumerateArray()
//                                    .Where(x => x.ValueKind == JsonValueKind.String)
//                                    .Select(x => x.GetString()!.Trim())
//                                    .Where(s => !string.IsNullOrWhiteSpace(s))
//                                    .Distinct(StringComparer.OrdinalIgnoreCase)
//                                    .ToList();

//                 int userId;

//                 await using (var conn = OpenConn(config))
//                 {
//                     await using (var ucmd = new SqlCommand("SELECT UserId FROM Users WHERE Username=@u", conn))
//                     {
//                         ucmd.Parameters.AddWithValue("@u", username);
//                         var obj = await ucmd.ExecuteScalarAsync() ?? throw new InvalidOperationException("User not found");
//                         userId = Convert.ToInt32(obj);
//                     }

//                     await using (var del = new SqlCommand("DELETE FROM UserRoles WHERE UserId=@id", conn))
//                     {
//                         del.Parameters.AddWithValue("@id", userId);
//                         await del.ExecuteNonQueryAsync();
//                     }

//                     foreach (var roleName in roles)
//                     {
//                         int? roleId = null;
//                         await using (var rcmd = new SqlCommand("SELECT RoleId FROM Roles WHERE RoleName=@n", conn))
//                         {
//                             rcmd.Parameters.AddWithValue("@n", roleName);
//                             var obj = await rcmd.ExecuteScalarAsync();
//                             roleId = obj == null ? null : Convert.ToInt32(obj);
//                         }

//                         if (roleId != null)
//                         {
//                             await using var ins = new SqlCommand(
//                                 "INSERT INTO UserRoles (UserId, RoleId) VALUES (@u,@r)", conn);
//                             ins.Parameters.AddWithValue("@u", userId);
//                             ins.Parameters.AddWithValue("@r", roleId);
//                             await ins.ExecuteNonQueryAsync();
//                         }
//                     }
//                 }

//                 Response.Result = true;
//                 Response.Message = "Roles updated";
//                 Response.Data = new { username, roles };
//                 httpContext.Response.StatusCode = 200;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//             catch (Exception ex)
//             {
//                 Response.Result = false;
//                 Response.Message = ex.Message;
//                 httpContext.Response.StatusCode = 400;
//                 await httpContext.Response.WriteAsJsonAsync(Response);
//             }
//         }

//         // ----------------- Password helper (update DB with varbinary) -----------------
//         private static async Task<int> SetPasswordInternal(IConfiguration config, string username, string newPassword)
//         {
//             // CreatePasswordHash should produce hash and salt as byte[] outs (order: hash, salt)
//             PasswordHelper.CreatePasswordHash(newPassword, out var hash, out var salt);

//             await using var conn = OpenConn(config);
//             await using var cmd = new SqlCommand(
//                 "UPDATE Users SET PasswordHash=@h, PasswordSalt=@s WHERE Username=@u", conn);

//             // ensure we pass proper SqlDbType VarBinary and length
//             var ph = new SqlParameter("@h", System.Data.SqlDbType.VarBinary, hash.Length) { Value = hash };
//             var ps = new SqlParameter("@s", System.Data.SqlDbType.VarBinary, salt.Length) { Value = salt };
//             var pu = new SqlParameter("@u", System.Data.SqlDbType.NVarChar, 100) { Value = username };

//             cmd.Parameters.Add(ph);
//             cmd.Parameters.Add(ps);
//             cmd.Parameters.Add(pu);

//             return await cmd.ExecuteNonQueryAsync();
//         }
//     }
// }
// (full file content as in your posted UsersAdmin with SetPasswordInternal using correct out order)
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using HRMS.Models;
using HRMS.Helpers;

namespace HRMS.Controller
{
    public class UsersAdmin
    {
        // Open a SQL connection using configuration
        private static SqlConnection OpenConn(IConfiguration config)
        {
            var cs = config.GetConnectionString("DefaultConnection")
                     ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection missing");
            var conn = new SqlConnection(cs);
            conn.Open();
            return conn;
        }

        private static string TryGetString(JsonElement root, params string[] keys)
        {
            foreach (var k in keys)
            {
                if (root.TryGetProperty(k, out var el) && el.ValueKind == JsonValueKind.String)
                {
                    var s = el.GetString();
                    if (!string.IsNullOrWhiteSpace(s)) return s.Trim();
                }
            }
            return "";
        }

        private static int? TryGetInt(JsonElement root, params string[] keys)
        {
            foreach (var k in keys)
            {
                if (root.TryGetProperty(k, out var el))
                {
                    if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var v)) return v;
                    if (el.ValueKind == JsonValueKind.String && int.TryParse(el.GetString(), out var v2)) return v2;
                }
            }
            return null;
        }

        private static bool TryGetBool(JsonElement root, out bool value, params string[] keys)
        {
            value = false;
            foreach (var k in keys)
            {
                if (root.TryGetProperty(k, out var el))
                {
                    if (el.ValueKind == JsonValueKind.True || el.ValueKind == JsonValueKind.False)
                    {
                        value = el.GetBoolean();
                        return true;
                    }
                    if (el.ValueKind == JsonValueKind.String && bool.TryParse(el.GetString(), out var b))
                    {
                        value = b;
                        return true;
                    }
                    if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var n))
                    {
                        value = n != 0;
                        return true;
                    }
                }
            }
            return false;
        }

        public async Task GetAll(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
        {
            var Response = new JsonStructure();
            try
            {
                string? filter = null;
                var requestBody = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
                if (!string.IsNullOrWhiteSpace(requestBody))
                {
                    using var json = JsonDocument.Parse(requestBody);
                    if (json.RootElement.TryGetProperty("username", out var f) ||
                        json.RootElement.TryGetProperty("Username", out f) ||
                        json.RootElement.TryGetProperty("userName", out f))
                    {
                        filter = f.GetString();
                    }
                }

                var list = new List<object>();
                await using (var conn = OpenConn(config))
                await using (var cmd = new SqlCommand(@"
SELECT u.UserId, u.Username, u.IsActive,
       STRING_AGG(r.RoleName, ',') AS Roles
FROM Users u
LEFT JOIN UserRoles ur ON ur.UserId = u.UserId
LEFT JOIN Roles r     ON r.RoleId = ur.RoleId
WHERE (@f IS NULL OR u.Username LIKE '%' + @f + '%')
GROUP BY u.UserId, u.Username, u.IsActive
ORDER BY u.UserId", conn))
                {
                    cmd.Parameters.AddWithValue("@f", (object?)filter ?? DBNull.Value);
                    await using var rd = await cmd.ExecuteReaderAsync();
                    while (await rd.ReadAsync())
                    {
                        list.Add(new
                        {
                            UserId = rd.GetInt32(0),
                            Username = rd.GetString(1),
                            IsActive = rd.GetBoolean(2),
                            Roles = rd.IsDBNull(3) ? "" : rd.GetString(3)
                        });
                    }
                }

                Response.Result = true;
                Response.Message = "OK";
                Response.Data = list;
                httpContext.Response.StatusCode = 200;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response.Result = false;
                Response.Message = "Failed to fetch users";
                Response.Data = new { Error = ex.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }

        public async Task Create(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
        {
            var Response = new JsonStructure();

            try
            {
                var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
                if (string.IsNullOrWhiteSpace(body))
                    throw new InvalidOperationException("Request body is required.");

                using var json = JsonDocument.Parse(body);
                var root = json.RootElement;

                var username = TryGetString(root, "username", "Username", "userName");
                var password = TryGetString(root, "password", "Password", "pass", "pwd");

                bool isActive = true;
                if (TryGetBool(root, out var tmpActive, "isActive", "IsActive", "active"))
                    isActive = tmpActive;

                var roles = new List<string>();
                if (root.TryGetProperty("roles", out var rolesEl) && rolesEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var r in rolesEl.EnumerateArray())
                    {
                        if (r.ValueKind == JsonValueKind.String)
                        {
                            var s = r.GetString();
                            if (!string.IsNullOrWhiteSpace(s)) roles.Add(s.Trim());
                        }
                    }
                }

                if (string.IsNullOrWhiteSpace(username))
                    throw new InvalidOperationException("username is required.");
                if (string.IsNullOrWhiteSpace(password))
                    throw new InvalidOperationException("password is required.");

                roles = roles.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

                int newUserId;
                await using (var conn = OpenConn(config))
                {
                    await using (var chk = new SqlCommand("SELECT COUNT(1) FROM Users WHERE Username=@u", conn))
                    {
                        chk.Parameters.AddWithValue("@u", username);
                        var exists = Convert.ToInt32(await chk.ExecuteScalarAsync());
                        if (exists > 0) throw new InvalidOperationException("Username already exists");
                    }

                    await using (var cmd = new SqlCommand(@"
INSERT INTO Users (Username, PasswordHash, PasswordSalt, IsActive)
OUTPUT INSERTED.UserId
VALUES (@u, 0x, 0x, @a)", conn))
                    {
                        cmd.Parameters.AddWithValue("@u", username);
                        cmd.Parameters.AddWithValue("@a", isActive);
                        newUserId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                    }

                    foreach (var role in roles)
                    {
                        await using var rcmd = new SqlCommand(@"
INSERT INTO UserRoles (UserId, RoleId)
SELECT @uid, RoleId FROM Roles WHERE RoleName=@r", conn);
                        rcmd.Parameters.AddWithValue("@uid", newUserId);
                        rcmd.Parameters.AddWithValue("@r", role);
                        await rcmd.ExecuteNonQueryAsync();
                    }
                }

                var rows = await SetPasswordInternal(config, username, password);
                if (rows == 0)
                    throw new InvalidOperationException("Failed to set password for the created user.");

                Response.Result = true;
                Response.Message = "User created";
                Response.Data = new { userId = newUserId, username, isActive, roles };
                httpContext.Response.StatusCode = 200;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (InvalidOperationException ie)
            {
                Response.Result = false;
                Response.Message = ie.Message;
                httpContext.Response.StatusCode = 400;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response.Result = false;
                Response.Message = "Create user failed";
                Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }

        public async Task SetPassword(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
        {
            var Response = new JsonStructure();

            try
            {
                var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
                if (string.IsNullOrWhiteSpace(body))
                    throw new InvalidOperationException("Request body is required");

                using var json = JsonDocument.Parse(body);
                var root = json.RootElement;

                var username = TryGetString(root, "username", "Username", "userName");
                var password = TryGetString(root, "password", "Password", "pass", "pwd");

                if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                    throw new InvalidOperationException("username/password required");

                var rows = await SetPasswordInternal(config, username, password);
                if (rows == 0) throw new InvalidOperationException("User not found");

                Response.Result = true;
                Response.Message = "Password updated";
                Response.Data = new { username };
                httpContext.Response.StatusCode = 200;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (InvalidOperationException ie)
            {
                Response.Result = false;
                Response.Message = ie.Message;
                httpContext.Response.StatusCode = 400;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response.Result = false;
                Response.Message = "Failed to update password";
                Response.Data = new { Error = ex.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }

        public async Task ToggleActive(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
        {
            var Response = new JsonStructure();

            try
            {
                var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
                if (string.IsNullOrWhiteSpace(body))
                    throw new InvalidOperationException("Request body is required");

                using var json = JsonDocument.Parse(body);
                var root = json.RootElement;

                int? userId = TryGetInt(root, "userId", "UserId", "id");
                string? username = null;
                if (userId == null)
                {
                    var u = TryGetString(root, "username", "Username", "user");
                    if (!string.IsNullOrWhiteSpace(u)) username = u;
                }

                if (userId == null && string.IsNullOrWhiteSpace(username))
                    throw new InvalidOperationException("Provide userId (number) or username (string) in request body");

                await using (var conn = OpenConn(config))
                {
                    if (userId != null)
                    {
                        await using var cmd = new SqlCommand(@"
UPDATE Users SET IsActive = CASE WHEN IsActive=1 THEN 0 ELSE 1 END
WHERE UserId=@id", conn);
                        cmd.Parameters.AddWithValue("@id", userId.Value);
                        var rows = await cmd.ExecuteNonQueryAsync();
                        if (rows == 0) throw new InvalidOperationException("User not found");
                    }
                    else
                    {
                        await using var cmd2 = new SqlCommand(@"
UPDATE Users SET IsActive = CASE WHEN IsActive=1 THEN 0 ELSE 1 END
WHERE Username=@u", conn);
                        cmd2.Parameters.AddWithValue("@u", username);
                        var rows = await cmd2.ExecuteNonQueryAsync();
                        if (rows == 0) throw new InvalidOperationException("User not found");
                    }
                }

                Response.Result = true;
                Response.Message = "Status updated";
                httpContext.Response.StatusCode = 200;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (InvalidOperationException ie)
            {
                Response.Result = false;
                Response.Message = ie.Message;
                httpContext.Response.StatusCode = 400;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response.Result = false;
                Response.Message = "Failed to update status";
                Response.Data = new { Error = ex.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }

        public async Task SetRoles(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
        {
            var Response = new JsonStructure();

            try
            {
                var body = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
                if (string.IsNullOrWhiteSpace(body))
                    throw new InvalidOperationException("Body is empty");

                using var json = JsonDocument.Parse(body);
                var root = json.RootElement;

                string username = TryGetString(root, "username", "Username", "userName");
                if (string.IsNullOrWhiteSpace(username))
                    throw new InvalidOperationException("username required");

                if (!root.TryGetProperty("roles", out var rolesEl) || rolesEl.ValueKind != JsonValueKind.Array)
                    throw new InvalidOperationException("Expected { username, roles[] }");

                var roles = rolesEl.EnumerateArray()
                                   .Where(x => x.ValueKind == JsonValueKind.String)
                                   .Select(x => x.GetString()!.Trim())
                                   .Where(s => !string.IsNullOrWhiteSpace(s))
                                   .Distinct(StringComparer.OrdinalIgnoreCase)
                                   .ToList();

                int userId;

                await using (var conn = OpenConn(config))
                {
                    await using (var ucmd = new SqlCommand("SELECT UserId FROM Users WHERE Username=@u", conn))
                    {
                        ucmd.Parameters.AddWithValue("@u", username);
                        var obj = await ucmd.ExecuteScalarAsync() ?? throw new InvalidOperationException("User not found");
                        userId = Convert.ToInt32(obj);
                    }

                    await using (var del = new SqlCommand("DELETE FROM UserRoles WHERE UserId=@id", conn))
                    {
                        del.Parameters.AddWithValue("@id", userId);
                        await del.ExecuteNonQueryAsync();
                    }

                    foreach (var roleName in roles)
                    {
                        int? roleId = null;
                        await using (var rcmd = new SqlCommand("SELECT RoleId FROM Roles WHERE RoleName=@n", conn))
                        {
                            rcmd.Parameters.AddWithValue("@n", roleName);
                            var obj = await rcmd.ExecuteScalarAsync();
                            roleId = obj == null ? null : Convert.ToInt32(obj);
                        }

                        if (roleId != null)
                        {
                            await using var ins = new SqlCommand(
                                "INSERT INTO UserRoles (UserId, RoleId) VALUES (@u,@r)", conn);
                            ins.Parameters.AddWithValue("@u", userId);
                            ins.Parameters.AddWithValue("@r", roleId);
                            await ins.ExecuteNonQueryAsync();
                        }
                    }
                }

                Response.Result = true;
                Response.Message = "Roles updated";
                Response.Data = new { username, roles };
                httpContext.Response.StatusCode = 200;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response.Result = false;
                Response.Message = ex.Message;
                httpContext.Response.StatusCode = 400;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }

        // ----------------- Password helper (update DB with varbinary) -----------------
        private static async Task<int> SetPasswordInternal(IConfiguration config, string username, string newPassword)
        {
            // PasswordHelper.CreatePasswordHash should produce hash and salt as byte[] outs (hash, salt).
            PasswordHelper.CreatePasswordHash(newPassword, out var hash, out var salt);

            await using var conn = OpenConn(config);
            await using var cmd = new SqlCommand(
                "UPDATE Users SET PasswordHash=@h, PasswordSalt=@s WHERE Username=@u", conn);

            // ensure we pass proper SqlDbType VarBinary and length (hash first, salt second)
            var ph = new SqlParameter("@h", System.Data.SqlDbType.VarBinary, hash.Length) { Value = hash };
            var ps = new SqlParameter("@s", System.Data.SqlDbType.VarBinary, salt.Length) { Value = salt };
            var pu = new SqlParameter("@u", System.Data.SqlDbType.NVarChar, 100) { Value = username };

            cmd.Parameters.Add(ph);
            cmd.Parameters.Add(ps);
            cmd.Parameters.Add(pu);

            return await cmd.ExecuteNonQueryAsync();
        }
    }
}
