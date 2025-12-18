
using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using HRMS.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace HRMS.Controller
{
    public class EmployeeBasics
    {
        // Get all employees or a specific employee
        public async Task GetAll(HttpContext httpContext, HrmsContext hrmsContext)
        {
            var response = new JsonStructure();
            int statusToSend = 200;

            try
            {
                var requestBody = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();

                if (string.IsNullOrWhiteSpace(requestBody))
                {
                    var employeesAll = await hrmsContext.EmployeeBasics
                        .OrderByDescending(x => x.EmployeeId)
                        .ToListAsync();

                    response.Result = true;
                    response.Message = "Employee data retrieved successfully";
                    response.Data = new { V_EmployeeBasicView = employeesAll };
                    statusToSend = 200;
                    return;
                }

                JsonDocument? jsonData = null;
                try
                {
                    jsonData = JsonDocument.Parse(requestBody);
                }
                catch
                {
                    jsonData = null;
                }

                if (jsonData != null &&
                    jsonData.RootElement.TryGetProperty("EmployeeId", out JsonElement employeeIdElement) &&
                    employeeIdElement.TryGetInt32(out int employeeId))
                {
                    if (employeeId <= 0)
                    {
                        var employees = await hrmsContext.EmployeeBasics
                            .OrderByDescending(x => x.EmployeeId)
                            .ToListAsync();

                        response.Result = true;
                        response.Message = "Employee data retrieved successfully";
                        response.Data = new { V_EmployeeBasicView = employees };
                        statusToSend = 200;
                    }
                    else
                    {
                        var employeeObj = await hrmsContext.EmployeeBasics
                            .SingleOrDefaultAsync(c => c.EmployeeId == employeeId);

                        if (employeeObj != null)
                        {
                            response.Result = true;
                            response.Message = "Employee record retrieved successfully";
                            response.Data = new { V_EmployeeBasicView = employeeObj };
                            statusToSend = 200;
                        }
                        else
                        {
                            response.Result = false;
                            response.Message = "Employee record not found";
                            statusToSend = 404;
                        }
                    }
                }
                else
                {
                    var employees = await hrmsContext.EmployeeBasics
                        .OrderByDescending(x => x.EmployeeId)
                        .ToListAsync();

                    response.Result = true;
                    response.Message = "Employee data retrieved successfully";
                    response.Data = new { V_EmployeeBasicView = employees };
                    statusToSend = 200;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("EmployeeBasics.GetAll exception: " + ex);
                response.Result = false;
                response.Message = "Employee data retrieval unsuccessful";
                response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                statusToSend = 500;
            }
            finally
            {
                try
                {
                    httpContext.Response.StatusCode = statusToSend;
                    httpContext.Response.ContentType = "application/json; charset=utf-8";
                    await httpContext.Response.WriteAsJsonAsync(response);
                }
                catch (Exception writeEx)
                {
                    Console.Error.WriteLine("Failed to write response in EmployeeBasics.GetAll: " + writeEx);
                }
            }
        }

        // Insert a new employee (and optionally create linked user)
        public async Task Insert(HttpContext httpContext, HrmsContext hrmsContext, EmployeeBasic employee)
        {
            var response = new JsonStructure();
            int statusToSend = 200;

            try
            {
                if (employee == null)
                {
                    response.Result = false;
                    response.Message = "Employee payload is required";
                    statusToSend = 400;
                    return;
                }

                if (string.IsNullOrWhiteSpace(employee.EmployeeCode))
                {
                    response.Result = false;
                    response.Message = "EmployeeCode is required";
                    statusToSend = 400;
                    return;
                }

                var exists = await hrmsContext.EmployeeBasics
                    .AnyAsync(e => e.EmployeeCode.ToLower() == employee.EmployeeCode.ToLower());

                if (exists)
                {
                    response.Result = false;
                    response.ErrorKey = "DuplicateEntry";
                    response.Message = "Employee with same code already exists.";
                    response.Data = new { Employee = employee };
                    statusToSend = 409;
                    return;
                }

                employee.CreatedAt = DateTime.UtcNow;
                employee.UpdatedAt = DateTime.UtcNow;

                await hrmsContext.EmployeeBasics.AddAsync(employee);
                await hrmsContext.SaveChangesAsync();

                // Non-fatal: attempt to create a linked user row if Users exist
                string? tempPlainPassword = null;
                try
                {
                    var usersSet = hrmsContext.Model.FindEntityType(typeof(User));
                    var rolesSet = hrmsContext.Model.FindEntityType(typeof(Role));
                    var userRolesSet = hrmsContext.Model.FindEntityType(typeof(UserRole));

                    if (usersSet != null && rolesSet != null && userRolesSet != null)
                    {
                        var existingUser = await hrmsContext.Users
                            .FirstOrDefaultAsync(u => u.Username.ToLower() == employee.EmployeeCode.ToLower());

                        if (existingUser == null)
                        {
                            tempPlainPassword = "Welcome@" + Guid.NewGuid().ToString("N").Substring(0, 6);

                            byte[] salt = new byte[32];
                            using (var rng = RandomNumberGenerator.Create())
                                rng.GetBytes(salt);

                            byte[] pwdBytes = Encoding.UTF8.GetBytes(tempPlainPassword);
                            byte[] combined = new byte[pwdBytes.Length + salt.Length];
                            Buffer.BlockCopy(pwdBytes, 0, combined, 0, pwdBytes.Length);
                            Buffer.BlockCopy(salt, 0, combined, pwdBytes.Length, salt.Length);

                            byte[] hash;
                            using (var sha = System.Security.Cryptography.SHA512.Create())
                                hash = sha.ComputeHash(combined);

                            var newUser = new User
                            {
                                Username = employee.EmployeeCode,
                                PasswordHash = hash,
                                PasswordSalt = salt,
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow
                            };

                            await hrmsContext.Users.AddAsync(newUser);
                            await hrmsContext.SaveChangesAsync();

                            var empRole = await hrmsContext.Roles.FirstOrDefaultAsync(r => r.RoleName == "Employee");
                            if (empRole != null)
                            {
                                var existsMap = await hrmsContext.UserRoles
                                    .AnyAsync(ur => ur.UserId == newUser.UserId && ur.RoleId == empRole.RoleId);
                                if (!existsMap)
                                {
                                    var ur = new UserRole
                                    {
                                        UserId = newUser.UserId,
                                        RoleId = empRole.RoleId
                                    };
                                    await hrmsContext.UserRoles.AddAsync(ur);
                                    await hrmsContext.SaveChangesAsync();
                                }
                            }

                            var createdEmp = await hrmsContext.EmployeeBasics.FindAsync(employee.EmployeeId);
                            if (createdEmp != null)
                            {
                                createdEmp.UserId = newUser.UserId;
                                createdEmp.UpdatedAt = DateTime.UtcNow;
                                hrmsContext.EmployeeBasics.Update(createdEmp);
                                await hrmsContext.SaveChangesAsync();
                            }
                        }
                        else
                        {
                            var createdEmp = await hrmsContext.EmployeeBasics.FindAsync(employee.EmployeeId);
                            if (createdEmp != null && createdEmp.UserId != existingUser.UserId)
                            {
                                createdEmp.UserId = existingUser.UserId;
                                createdEmp.UpdatedAt = DateTime.UtcNow;
                                hrmsContext.EmployeeBasics.Update(createdEmp);
                                await hrmsContext.SaveChangesAsync();
                            }
                        }
                    }
                }
                catch (Exception innerEx)
                {
                    Console.Error.WriteLine("User-creation error (non-fatal): " + innerEx);
                }

                response.Result = true;
                response.Message = "Employee inserted successfully";
                response.Data = new { Employee = employee, TempPassword = tempPlainPassword };
                statusToSend = 201;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("EmployeeBasics.Insert exception: " + ex);
                response.Result = false;
                response.Message = "Employee insert unsuccessful";
                response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                statusToSend = 500;
            }
            finally
            {
                try
                {
                    httpContext.Response.StatusCode = statusToSend;
                    httpContext.Response.ContentType = "application/json; charset=utf-8";
                    await httpContext.Response.WriteAsJsonAsync(response);
                }
                catch (Exception writeEx)
                {
                    Console.Error.WriteLine("Failed to write response in EmployeeBasics.Insert: " + writeEx);
                }
            }
        }

        // Update an existing employee
        public async Task Update(HttpContext httpContext, HrmsContext hrmsContext, EmployeeBasic employee)
        {
            var response = new JsonStructure();
            int statusToSend = 200;

            try
            {
                if (employee == null)
                {
                    response.Result = false;
                    response.Message = "Employee payload is required";
                    statusToSend = 400;
                    return;
                }

                var exists = await hrmsContext.EmployeeBasics
                    .AnyAsync(e => e.EmployeeCode.ToLower() == employee.EmployeeCode.ToLower() &&
                                   e.EmployeeId != employee.EmployeeId);

                if (exists)
                {
                    response.Result = false;
                    response.ErrorKey = "DuplicateEntry";
                    response.Message = "Employee with same code already exists.";
                    response.Data = new { Employee = employee };
                    statusToSend = 409; // Conflict
                }
                else
                {
                    employee.UpdatedAt = DateTime.UtcNow;

                    hrmsContext.EmployeeBasics.Update(employee);
                    await hrmsContext.SaveChangesAsync();

                    response.Result = true;
                    response.Message = "Employee updated successfully";
                    response.Data = new { Employee = employee };
                    statusToSend = 200;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("EmployeeBasics.Update exception: " + ex);
                response.Result = false;
                response.Message = "Employee update unsuccessful";
                response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                statusToSend = 500;
            }
            finally
            {
                try
                {
                    httpContext.Response.StatusCode = statusToSend;
                    httpContext.Response.ContentType = "application/json; charset=utf-8";
                    await httpContext.Response.WriteAsJsonAsync(response);
                }
                catch (Exception writeEx)
                {
                    Console.Error.WriteLine("Failed to write response in EmployeeBasics.Update: " + writeEx);
                }
            }
        }
    }
}

