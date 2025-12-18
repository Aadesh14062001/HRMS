// Controller/CompanyService.cs
using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Helper.AspNetCore.CRUD;
using HRMS.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using HRMS.Helpers;

namespace HRMS.Controller
{
    public class CompanyService
    {
        public async Task GetAll(HttpContext httpContext, HrmsContext HrmsContext)
        {
            var Response = new JsonStructure();

            try
            {
                var requestBody = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
                var jsonData = string.IsNullOrWhiteSpace(requestBody) ? null : JsonDocument.Parse(requestBody);

                if (jsonData != null &&
                    jsonData.RootElement.TryGetProperty("CompanyID", out JsonElement CompanyIdElement) &&
                    CompanyIdElement.TryGetInt32(out int CompanyID))
                {
                    if (CompanyID == 0)
                    {
                        Response.Result = true;
                        Response.Message = "Company data retrieved successfully";
                        Response.Data = new
                        {
                            V_CompanyView = (await new CRUD().ReadWithInclude<Company>(HrmsContext, "Branches", "Departments", "SubDepartments", "Designations", "Positions", "EmployeeBasics"))
                                 .OrderByDescending(x => x.CompanyName)
                                .ToList()
                        };
                        httpContext.Response.StatusCode = 200;
                    }
                    else
                    {
                        var companyObj = await HrmsContext.Companies
                            .Include(c => c.Branches)
                            .Include(d => d.Departments)
                            .SingleOrDefaultAsync(c => c.CompanyId == CompanyID);

                        if (companyObj != null)
                        {
                            Response.Result = true;
                            Response.Message = "Company record retrieved successfully";
                            Response.Data = new { V_CompanyView = companyObj };
                            httpContext.Response.StatusCode = 200;
                        }
                        else
                        {
                            Response.Result = false;
                            Response.Message = "Company record not found";
                            httpContext.Response.StatusCode = 404;
                        }
                    }
                }
                else
                {
                    Response.Result = false;
                    Response.Message = "Invalid or missing CompanyID";
                    httpContext.Response.StatusCode = 400;
                }

                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response.Result = false;
                Response.Message = "Company data retrieval unsuccessful";
                Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }

        public async Task Insert(HttpContext httpContext, HrmsContext HrmsContext, Company company)
        {
            var Response = new JsonStructure();
            try
            {
                var exists = await HrmsContext.Companies
                    .AnyAsync(c => c.CompanyName == company.CompanyName);

                if (exists)
                {
                    Response.Result = false;
                    Response.ErrorKey = "DuplicateEntry";
                    Response.Message = "Company already exists.";
                    Response.Data = new { company };
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                await new CRUD().Create<Company>(HrmsContext, httpContext, company);
                Response.Result = true;
                Response.Message = "Company inserted successfully";
                Response.Data = new { company };
                httpContext.Response.StatusCode = 201;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response.Result = false;
                Response.Message = "Company insert unsuccessful";
                Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }

        public async Task InsertMultiple(HttpContext httpContext, HrmsContext HrmsContext)
        {
            var Response = new JsonStructure();
            try
            {
                var requestBody = await HttpRequestHelper.ReadBodyAsStringAsync(httpContext);
                var companies = JsonSerializer.Deserialize<List<Company>>(requestBody);

                if (companies == null || companies.Count == 0)
                {
                    Response.Result = false;
                    Response.Message = "No company data provided.";
                    httpContext.Response.StatusCode = 400;
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                var exists = await HrmsContext.Companies
                    .Where(c => companies.Select(x => x.CompanyName).Contains(c.CompanyName))
                    .Select(c => c.CompanyName)
                    .ToListAsync();

                if (exists.Any())
                {
                    Response.Result = false;
                    Response.ErrorKey = "DuplicateEntry";
                    Response.Message = "Some company names already exist.";
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                await new CRUD().CreateMultiple<Company>(HrmsContext, httpContext, companies);
                Response.Result = true;
                Response.Message = "Company data inserted successfully";
                httpContext.Response.StatusCode = 201;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response.Result = false;
                Response.Message = "Company insert unsuccessful";
                Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }

        public async Task Update(HttpContext httpContext, HrmsContext HrmsContext, Company company)
        {
            var Response = new JsonStructure();
            try
            {
                var exists = await HrmsContext.Companies
                    .AnyAsync(c => c.CompanyName == company.CompanyName && c.CompanyId != company.CompanyId);

                if (exists)
                {
                    Response.Result = false;
                    Response.ErrorKey = "DuplicateEntry";
                    Response.Message = "Company name already exists.";
                    Response.Data = new { company };
                    await httpContext.Response.WriteAsJsonAsync(Response);
                    return;
                }

                await new CRUD().Update<Company>(HrmsContext, httpContext, company);
                Response.Result = true;
                Response.Message = "Company data updated successfully";
                Response.Data = new { company };
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
            catch (Exception ex)
            {
                Response.Result = false;
                Response.Message = "Company update unsuccessful";
                Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync(Response);
            }
        }
    }
}

