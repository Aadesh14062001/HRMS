using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using HRMS.Models;
using HRMS.Helpers;

namespace HRMS.Controller
{
    public class Auth
    {
        private static SqlConnection OpenConn(IConfiguration config)
        {
            var cs = config.GetConnectionString("DefaultConnection")
                     ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection missing");
            var conn = new SqlConnection(cs);
            conn.Open();
            return conn;
        }

        // POST /Auth/Login
        public async Task Login(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
        {
            var Response = new JsonStructure();
            try
            {
                var requestBody = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
                if (string.IsNullOrWhiteSpace(requestBody))
                {
                    Response.Result = false;
                    Response.Message = "Request body is empty";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                using var json = JsonDocument.Parse(requestBody);
                if (!json.RootElement.TryGetProperty("username", out var uEl) ||
                    !json.RootElement.TryGetProperty("password", out var pEl))
                {
                    Response.Result = false;
                    Response.Message = "Missing 'username' or 'password'";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                var username = (uEl.GetString() ?? "").Trim();
                var password = pEl.GetString() ?? "";
                if (username.Length == 0 || password.Length == 0)
                {
                    Response.Result = false;
                    Response.Message = "Username and password are required";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                int? userId = null;
                byte[]? hash = null;
                byte[]? salt = null;
                bool isActive = false;

                // Try to find the user either by Users.Username OR EmployeeBasic.EmployeeCode
                await using (var conn = OpenConn(config))
                await using (var cmd = new SqlCommand(@"
SELECT TOP 1 u.UserId, u.PasswordHash, u.PasswordSalt, u.IsActive
FROM Users u
LEFT JOIN EmployeeBasic e ON e.UserId = u.UserId
WHERE u.Username = @u OR e.EmployeeCode = @u", conn))
                {
                    cmd.Parameters.AddWithValue("@u", username);
                    await using var r = await cmd.ExecuteReaderAsync();
                    if (await r.ReadAsync())
                    {
                        userId = r.IsDBNull(0) ? null : (int?)r.GetInt32(0);
                        hash = r.IsDBNull(1) ? null : (byte[])r[1];
                        salt = r.IsDBNull(2) ? null : (byte[])r[2];
                        isActive = !r.IsDBNull(3) && Convert.ToBoolean(r[3]);
                    }
                }

                if (userId is null || hash is null || salt is null || !isActive)
                {
                    Response.Result = false;
                    Response.Message = "Invalid username or password";
                    httpContext.Response.StatusCode = 200;
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                // Verify password (PasswordHelper expects (password, storedHash, storedSalt))
                if (!PasswordHelper.VerifyPasswordHash(password, hash, salt))
                {
                    Response.Result = false;
                    Response.Message = "Invalid username or password";
                    httpContext.Response.StatusCode = 200;
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                // Get roles
                var roles = new List<string>();
                await using (var conn = OpenConn(config))
                await using (var cmd = new SqlCommand(@"
SELECT r.RoleName
FROM UserRoles ur
JOIN Roles r ON r.RoleId = ur.RoleId
WHERE ur.UserId = @id", conn))
                {
                    cmd.Parameters.AddWithValue("@id", userId);
                    await using var rr = await cmd.ExecuteReaderAsync();
                    while (await rr.ReadAsync())
                    {
                        if (!rr.IsDBNull(0))
                            roles.Add(rr.GetString(0));
                    }
                }
                if (roles.Count == 0) roles.Add("Employee");

                // fetch employee details if available
                int employeeId = 0;
                string employeeCode = string.Empty;
                string employeeName = string.Empty;

                await using (var conn2 = OpenConn(config))
                await using (var cmd2 = new SqlCommand(@"
SELECT TOP 1 EmployeeId, EmployeeCode, 
       COALESCE(FirstName + ' ' + ISNULL(LastName, ''), EmployeeCode) AS EmployeeName
FROM EmployeeBasic
WHERE UserId = @uid OR EmployeeCode = @uname", conn2))
                {
                    cmd2.Parameters.AddWithValue("@uid", userId ?? (object)DBNull.Value);
                    cmd2.Parameters.AddWithValue("@uname", username);
                    await using var r2 = await cmd2.ExecuteReaderAsync();
                    if (await r2.ReadAsync())
                    {
                        if (!r2.IsDBNull(0)) employeeId = r2.GetInt32(0);
                        if (!r2.IsDBNull(1)) employeeCode = r2.GetString(1) ?? "";
                        if (!r2.IsDBNull(2)) employeeName = r2.GetString(2) ?? "";
                    }
                }

                // build token
                var jwt = config.GetSection("Jwt");
                var key = jwt["Key"];
                if (string.IsNullOrWhiteSpace(key))
                    throw new InvalidOperationException("Jwt:Key missing");
                var issuer = jwt["Issuer"];
                var audience = jwt["Audience"];
                var minutes = int.TryParse(jwt["AccessTokenMinutes"], out var m) ? m : 480;

                var creds = new SigningCredentials(
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                    SecurityAlgorithms.HmacSha256);

                var claims = new List<Claim>
                {
                    new Claim(JwtRegisteredClaimNames.Sub, username),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                    new Claim(ClaimTypes.Name, username),
                    new Claim("UserId", userId.ToString() ?? "0")
                };

                foreach (var role in roles.Distinct(StringComparer.OrdinalIgnoreCase))
                    claims.Add(new Claim(ClaimTypes.Role, role));

                claims.Add(new Claim("EmployeeID", employeeId.ToString()));
                claims.Add(new Claim("EmployeeCode", employeeCode ?? string.Empty));
                claims.Add(new Claim("EmployeeName", employeeName ?? string.Empty));

                var token = new JwtSecurityToken(
                    issuer: issuer,
                    audience: audience,
                    claims: claims,
                    expires: DateTime.UtcNow.AddMinutes(minutes),
                    signingCredentials: creds);

                var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

                Response.Result = true;
                Response.Message = "Login successful";
                Response.Data = new
                {
                    username,
                    roles = roles.Distinct(StringComparer.OrdinalIgnoreCase).ToArray(),
                    token = accessToken,
                    employee = new
                    {
                        EmployeeID = employeeId,
                        EmployeeCode = employeeCode,
                        EmployeeName = employeeName
                    }
                };
                httpContext.Response.StatusCode = 200;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response = new JsonStructure
                {
                    Result = false,
                    Message = "Login failed",
                    Data = new { Error = ex.Message, Details = ex.InnerException?.Message }
                };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }

        // POST /Auth/SetPasswordDev  (dev helper to set password for an existing user)
        public async Task SetPasswordDev(HttpContext httpContext, HrmsContext HRMSContext, IConfiguration config)
        {
            var Response = new JsonStructure();

            try
            {
                var requestBody = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
                if (string.IsNullOrWhiteSpace(requestBody))
                {
                    Response.Result = false;
                    Response.Message = "Request body is empty";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                using var json = JsonDocument.Parse(requestBody);
                if (!json.RootElement.TryGetProperty("username", out var uEl) ||
                    !json.RootElement.TryGetProperty("newPassword", out var pEl))
                {
                    Response.Result = false;
                    Response.Message = "Missing 'username' or 'newPassword'";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                var username = (uEl.GetString() ?? "").Trim();
                var newPassword = pEl.GetString() ?? "";
                if (username.Length == 0 || newPassword.Length == 0)
                {
                    Response.Result = false;
                    Response.Message = "Empty username or password";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                // IMPORTANT: correct order — CreatePasswordHash(out hash, out salt)
                PasswordHelper.CreatePasswordHash(newPassword, out var hash, out var salt);

                await using (var conn = OpenConn(config))
                await using (var cmd = new SqlCommand(@"
UPDATE Users SET PasswordHash=@h, PasswordSalt=@s, IsActive=1
WHERE Username=@u", conn))
                {
                    // ensure varbinary parameters: hash first, salt second
                    var pH = new SqlParameter("@h", System.Data.SqlDbType.VarBinary, hash.Length) { Value = hash };
                    var pS = new SqlParameter("@s", System.Data.SqlDbType.VarBinary, salt.Length) { Value = salt };
                    cmd.Parameters.Add(pH);
                    cmd.Parameters.Add(pS);
                    cmd.Parameters.AddWithValue("@u", username);

                    var rows = await cmd.ExecuteNonQueryAsync();
                    if (rows == 0)
                    {
                        Response.Result = false;
                        Response.Message = "User not found";
                        httpContext.Response.StatusCode = 404;
                        await httpContext.Response.WriteAsJsonAsync(Response);
                        return;
                    }
                }

                Response.Result = true;
                Response.Message = "Password set";
                Response.Data = new { hashLen = hash.Length, saltLen = salt.Length };
                httpContext.Response.StatusCode = 200;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response.Result = false;
                Response.Message = "Failed to set password";
                Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }
    }
}
