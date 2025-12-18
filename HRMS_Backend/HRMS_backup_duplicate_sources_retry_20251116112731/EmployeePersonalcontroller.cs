using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Helper.AspNetCore.CRUD;
using HRMS.Models;
using Microsoft.EntityFrameworkCore;

namespace HRMS.Controller
{
    public class EmployeePersonals
    {
        // Get all employee personals or a specific employee personal record
        public async Task GetAll(HttpContext httpContext, HrmsContext hrmsContext)
        {
            var response = new JsonStructure();

            try
            {
                var requestBody = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();

                // If empty body -> return all records
                if (string.IsNullOrWhiteSpace(requestBody))
                {
                    var personalList = (await new CRUD().Read<EmployeePersonal>(hrmsContext))
                        .OrderByDescending(x => x.EmployeePersonalId)
                        .ToList();

                    response.Result = true;
                    response.Message = "Employee personal data retrieved successfully";
                    response.Data = new { V_EmployeePersonalView = personalList };
                    httpContext.Response.StatusCode = 200;
                    await httpContext.Response.WriteAsJsonAsync(response);
                    return;
                }

                var jsonData = JsonDocument.Parse(requestBody);

                if (jsonData.RootElement.TryGetProperty("EmployeePersonalId", out JsonElement idElement) &&
                    idElement.TryGetInt32(out int employeePersonalId))
                {
                    if (employeePersonalId <= 0)
                    {
                        var personalList = (await new CRUD().Read<EmployeePersonal>(hrmsContext))
                            .OrderByDescending(x => x.EmployeePersonalId)
                            .ToList();

                        response.Result = true;
                        response.Message = "Employee personal data retrieved successfully";
                        response.Data = new { V_EmployeePersonalView = personalList };
                        httpContext.Response.StatusCode = 200;
                    }
                    else
                    {
                        var personalObj = await hrmsContext.EmployeePersonals
                            .SingleOrDefaultAsync(c => c.EmployeePersonalId == employeePersonalId);

                        if (personalObj != null)
                        {
                            response.Result = true;
                            response.Message = "Employee personal record retrieved successfully";
                            response.Data = new { V_EmployeePersonalView = personalObj };
                            httpContext.Response.StatusCode = 200;
                        }
                        else
                        {
                            response.Result = false;
                            response.Message = "Employee personal record not found";
                            httpContext.Response.StatusCode = 404;
                        }
                    }
                }
                else
                {
                    // no EmployeePersonalId present — return all
                    var personalList = (await new CRUD().Read<EmployeePersonal>(hrmsContext))
                        .OrderByDescending(x => x.EmployeePersonalId)
                        .ToList();

                    response.Result = true;
                    response.Message = "Employee personal data retrieved successfully";
                    response.Data = new { V_EmployeePersonalView = personalList };
                    httpContext.Response.StatusCode = 200;
                }
            }
            catch (Exception ex)
            {
                response.Result = false;
                response.Message = "Employee personal data retrieval unsuccessful";
                response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
            }

            await httpContext.Response.WriteAsJsonAsync(response);
        }

        // Insert new employee personal record
        public async Task Insert(HttpContext httpContext, HrmsContext hrmsContext, EmployeePersonal personal)
        {
            var response = new JsonStructure();

            try
            {
                if (personal == null)
                {
                    response.Result = false;
                    response.Message = "Payload required";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(response);
                    return;
                }

                if (string.IsNullOrWhiteSpace(personal.EmployeeCode))
                {
                    response.Result = false;
                    response.Message = "EmployeeCode is required";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(response);
                    return;
                }

                // Ensure an EmployeeBasic exists for this EmployeeCode
                var empExists = await hrmsContext.EmployeeBasics
                    .AnyAsync(e => e.EmployeeCode.ToLower() == personal.EmployeeCode.ToLower());

                if (!empExists)
                {
                    response.Result = false;
                    response.Message = "EmployeeCode not found in EmployeeBasic";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(response);
                    return;
                }

                var exists = await hrmsContext.EmployeePersonals
                    .AnyAsync(e => e.EmployeeCode.ToLower() == personal.EmployeeCode.ToLower());

                if (exists)
                {
                    response.Result = false;
                    response.ErrorCode = "DuplicateEntry";
                    response.Message = "Employee personal record for this employee already exists.";
                    response.Data = new { EmployeePersonal = personal };
                    httpContext.Response.StatusCode = 409; // Conflict
                    await httpContext.Response.WriteAsJsonAsync(response);
                    return;
                }

                await new CRUD().Create<EmployeePersonal>(hrmsContext, httpContext, personal);

                response.Result = true;
                response.Message = "Employee personal record inserted successfully";
                response.Data = new { EmployeePersonal = personal };
                httpContext.Response.StatusCode = 201;
            }
            catch (Exception ex)
            {
                response.Result = false;
                response.Message = "Employee personal insert unsuccessful";
                response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
            }

            await httpContext.Response.WriteAsJsonAsync(response);
        }

        // Update existing employee personal record
        public async Task Update(HttpContext httpContext, HrmsContext hrmsContext, EmployeePersonal personal)
        {
            var response = new JsonStructure();

            try
            {
                if (personal == null)
                {
                    response.Result = false;
                    response.Message = "Payload required";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(response);
                    return;
                }

                if (string.IsNullOrWhiteSpace(personal.EmployeeCode))
                {
                    response.Result = false;
                    response.Message = "EmployeeCode is required";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(response);
                    return;
                }

                // Ensure an EmployeeBasic exists for this EmployeeCode
                var empExists = await hrmsContext.EmployeeBasics
                    .AnyAsync(e => e.EmployeeCode.ToLower() == personal.EmployeeCode.ToLower());

                if (!empExists)
                {
                    response.Result = false;
                    response.Message = "EmployeeCode not found in EmployeeBasic";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(response);
                    return;
                }

                var exists = await hrmsContext.EmployeePersonals
                    .AnyAsync(e => e.EmployeeCode.ToLower() == personal.EmployeeCode.ToLower() &&
                                   e.EmployeePersonalId != personal.EmployeePersonalId);

                if (exists)
                {
                    response.Result = false;
                    response.ErrorCode = "DuplicateEntry";
                    response.Message = "Employee personal record for this employee already exists.";
                    response.Data = new { EmployeePersonal = personal };
                    httpContext.Response.StatusCode = 409; // Conflict
                }
                else
                {
                    await new CRUD().Update<EmployeePersonal>(hrmsContext, httpContext, personal);

                    response.Result = true;
                    response.Message = "Employee personal record updated successfully";
                    response.Data = new { EmployeePersonal = personal };
                    httpContext.Response.StatusCode = 200;
                }
            }
            catch (Exception ex)
            {
                response.Result = false;
                response.Message = "Employee personal update unsuccessful";
                response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
            }

            await httpContext.Response.WriteAsJsonAsync(response);
        }
    }
}
