using System.Text.Json;
using Helper.AspNetCore.CRUD;
using HRMS.Models;
using Microsoft.EntityFrameworkCore;

public class Departments
{
    // Get all departments or a specific department
    public async Task GetAll(HttpContext httpContext, HrmsContext HrmsContext)
    {
        var Response = new JsonStructure();

        try
        {
            var requestBody = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
            var jsonData = JsonDocument.Parse(requestBody);

            if (jsonData.RootElement.TryGetProperty("DepartmentID", out JsonElement DepartmentIdElement) &&
                DepartmentIdElement.TryGetInt32(out int DepartmentID))
            {
                if (DepartmentID == 0)
                {
                    Response.Result = true;
                    Response.Message = "Department data retrieved successfully";
                    Response.Data = new
                    {
                        V_DepartmentView = (await new CRUD().Read<Department>(HrmsContext))
                             .OrderByDescending(x => x.Name)
                            .ToList()
                    };
                    httpContext.Response.StatusCode = 200;
                }
                else
                {
                    var departmentObj = await HrmsContext.Departments

                        .SingleOrDefaultAsync(c => c.DepartmentId == DepartmentID);

                    if (departmentObj != null)
                    {
                        Response.Result = true;
                        Response.Message = "Department record retrieved successfully";
                        Response.Data = new { V_DepartmentView = departmentObj };
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
                Response.Message = "Invalid or missing DepartmentID";
                httpContext.Response.StatusCode = 400;
            }

            await httpContext.Response.WriteAsJsonAsync(Response);
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "Department data retrieval unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync(Response);
        }
    }

    // Insert a new department
    public async Task Insert(HttpContext httpContext, HrmsContext HRMSContext, Department department)
    {
        var Response = new JsonStructure();

        try
        {
            var exists = await HRMSContext.Departments.AnyAsync(d =>
                d.CompanyId == department.CompanyId &&
                d.BranchId == department.BranchId &&
                d.Name.ToLower() == department.Name.ToLower());

            if (exists)
            {
                Response.Result = false;
                Response.ErrorKey = "DuplicateEntry";
                Response.Message = "Department already exists for this branch.";
                Response.Data = new { Department = department };
                await httpContext.Response.WriteAsJsonAsync(Response);
                return;
            }

            await new CRUD().Create<Department>(HRMSContext, httpContext, department);
            Response.Result = true;
            Response.Message = "Department inserted successfully";
            Response.Data = new { Department = department };
            httpContext.Response.StatusCode = 201;
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "Department insert unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
        }

        await httpContext.Response.WriteAsJsonAsync(Response);
    }

    // Update an existing department
    public async Task Update(HttpContext httpContext, HrmsContext HRMSContext, Department department)
    {
        var Response = new JsonStructure();

        try
        {
            var exists = await HRMSContext.Departments.AnyAsync(d =>
                d.CompanyId == department.CompanyId &&
                d.BranchId == department.BranchId &&
                d.Name.ToLower() == department.Name.ToLower() &&
                d.DepartmentId != department.DepartmentId);

            if (exists)
            {
                Response.Result = false;
                Response.ErrorKey = "DuplicateEntry";
                Response.Message = "Department name already exists for this branch.";
                Response.Data = new { Department = department };
                await httpContext.Response.WriteAsJsonAsync(Response);
                return;
            }

            await new CRUD().Update<Department>(HRMSContext, httpContext, department);
            Response.Result = true;
            Response.Message = "Department updated successfully";
            Response.Data = new { Department = department };
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "Department update unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
        }

        await httpContext.Response.WriteAsJsonAsync(Response);
    }
}

