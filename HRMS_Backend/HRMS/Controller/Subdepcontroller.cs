using System.Text.Json;
using Helper.AspNetCore.CRUD;
using HRMS.Models;
using Microsoft.EntityFrameworkCore;

public class SubDepartmentDepartments
{
    // Get all subdepartments or a specific subdepartment
    public async Task GetAll(HttpContext httpContext, HrmsContext HrmsContext)
    {
        var Response = new JsonStructure();

        try
        {
            var requestBody = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
            var jsonData = JsonDocument.Parse(requestBody);

            if (jsonData.RootElement.TryGetProperty("SubDepartmentID", out JsonElement SubDepartmentIdElement) &&
                SubDepartmentIdElement.TryGetInt32(out int SubDepartmentID))
            {
                if (SubDepartmentID == 0)
                {
                    Response.Result = true;
                    Response.Message = "SubDepartment data retrieved successfully";
                    Response.Data = new
                    {
                        V_SubDepartmentView = (await new CRUD().Read<SubDepartment>(HrmsContext))
                             .OrderByDescending(x => x.SubDepartmentName)
                            .ToList()
                    };
                    httpContext.Response.StatusCode = 200;
                }
                else
                {
                    var SubDepartmentObj = await HrmsContext.SubDepartments

                        .SingleOrDefaultAsync(c => c.SubDepartmentId == SubDepartmentID);

                    if (SubDepartmentObj != null)
                    {
                        Response.Result = true;
                        Response.Message = "SubDepartment record retrieved successfully";
                        Response.Data = new { V_SubDepartmentView = SubDepartmentObj };
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
                Response.Message = "Invalid or missing SubDepartmentID";
                httpContext.Response.StatusCode = 400;
            }

            await httpContext.Response.WriteAsJsonAsync(Response);
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "SubDepartment data retrieval unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync(Response);
        }
    }

    // Insert a new subdepartment
    public async Task Insert(HttpContext httpContext, HrmsContext HRMSContext, SubDepartment subDepartment)
    {
        var Response = new JsonStructure();

        try
        {
            var exists = await HRMSContext.SubDepartments.AnyAsync(s =>
    s.CompanyId == subDepartment.CompanyId &&
    s.BranchId == subDepartment.BranchId &&
    s.DepartmentId == subDepartment.DepartmentId &&
    s.SubDepartmentName.ToLower() == subDepartment.SubDepartmentName.ToLower());


            if (exists)
            {
                Response.Result = false;
                Response.ErrorKey = "DuplicateEntry";
                Response.Message = "SubDepartment already exists for this branch.";
                Response.Data = new { SubDepartment = subDepartment };
                await httpContext.Response.WriteAsJsonAsync(Response);
                return;
            }

            await new CRUD().Create<SubDepartment>(HRMSContext, httpContext, subDepartment);
            Response.Result = true;
            Response.Message = "Department inserted successfully";
            Response.Data = new { SubDepartment = subDepartment };
            httpContext.Response.StatusCode = 201;
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "SubDepartment insert unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
        }

        await httpContext.Response.WriteAsJsonAsync(Response);
    }

    // Update an existing subdepartment
    public async Task Update(HttpContext httpContext, HrmsContext HRMSContext, SubDepartment subDepartment)
    {
        var Response = new JsonStructure();

        try
        {
            var exists = await HRMSContext.SubDepartments.AnyAsync(s =>
    s.CompanyId == subDepartment.CompanyId &&
    s.BranchId == subDepartment.BranchId &&
    s.DepartmentId == subDepartment.DepartmentId &&
    s.SubDepartmentName.ToLower() == subDepartment.SubDepartmentName.ToLower() &&
    s.SubDepartmentId != subDepartment.SubDepartmentId);


            if (exists)
            {
                Response.Result = false;
                Response.ErrorKey = "DuplicateEntry";
                Response.Message = "SubDepartment name already exists for this branch.";
                Response.Data = new { SubDepartment = subDepartment };
                await httpContext.Response.WriteAsJsonAsync(Response);
                return;
            }

            await new CRUD().Update<SubDepartment>(HRMSContext, httpContext, subDepartment);
            Response.Result = true;
            Response.Message = "SubDepartment updated successfully";
            Response.Data = new { SubDepartment = subDepartment };
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "SubDepartment update unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
        }

        await httpContext.Response.WriteAsJsonAsync(Response);
    }
}

