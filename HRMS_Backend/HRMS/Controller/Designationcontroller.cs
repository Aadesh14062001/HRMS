using System.Text.Json;
using Helper.AspNetCore.CRUD;
using HRMS.Models;
using Microsoft.EntityFrameworkCore;

public class Designations
{
    // Get all Designations 
    public async Task GetAll(HttpContext httpContext, HrmsContext HrmsContext)
    {
        var Response = new JsonStructure();

        try
        {
            var requestBody = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
            var jsonData = JsonDocument.Parse(requestBody);

            if (jsonData.RootElement.TryGetProperty("DesignationId", out JsonElement DesignationIdElement) &&
                DesignationIdElement.TryGetInt32(out int DesignationId))
            {
                if (DesignationId == 0)
                {
                    Response.Result = true;
                    Response.Message = "Designation data retrieved successfully";
                    Response.Data = new
                    {
                        V_DesignationView = (await new CRUD().Read<Designation>(HrmsContext))
                             .OrderByDescending(x => x.DesignationName)
                            .ToList()
                    };
                    httpContext.Response.StatusCode = 200;
                }
                else
                {
                    var DesignationObj = await HrmsContext.Designations

                        .SingleOrDefaultAsync(c => c.DesignationId == DesignationId);

                    if (DesignationObj != null)
                    {
                        Response.Result = true;
                        Response.Message = "DesignationObj record retrieved successfully";
                        Response.Data = new { V_SubDepartmentView = DesignationObj };
                        httpContext.Response.StatusCode = 200;
                    }
                    else
                    {
                        Response.Result = false;
                        Response.Message = "Designation record not found";
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
            Response.Message = "Designation data retrieval unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync(Response);
        }
    }

    // Insert a new Designation
    public async Task Insert(HttpContext httpContext, HrmsContext HRMSContext, Designation designation)
    {
        var Response = new JsonStructure();

        try
        {
            var exists = await HRMSContext.Designations.AnyAsync(y =>
            y.CompanyId == designation.CompanyId &&
            y.BranchId == designation.BranchId &&
            y.DepartmentId == designation.DepartmentId &&
            y.SubDepartmentId == designation.SubDepartmentId &&
            y.DesignationName.ToLower() == designation.DesignationName.ToLower());



            if (exists)
            {
                Response.Result = false;
                Response.ErrorKey = "DuplicateEntry";
                Response.Message = "Designation already exists for this Subdepartment.";
                Response.Data = new { designation = designation };
                await httpContext.Response.WriteAsJsonAsync(Response);
                return;
            }

            await new CRUD().Create<Designation>(HRMSContext, httpContext, designation);
            Response.Result = true;
            Response.Message = "Designation inserted successfully";
            Response.Data = new { Designation = designation };
            httpContext.Response.StatusCode = 201;
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "Designation insert unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
        }

        await httpContext.Response.WriteAsJsonAsync(Response);
    }

    // Update an existing Designation
    public async Task Update(HttpContext httpContext, HrmsContext HRMSContext, Designation designation)
    {
        var Response = new JsonStructure();

        try
        {
            var exists = await HRMSContext.Designations.AnyAsync(y =>
    y.CompanyId == designation.CompanyId &&
    y.BranchId == designation.BranchId &&
    y.DepartmentId == designation.DepartmentId &&
    y.SubDepartmentId == designation.SubDepartmentId &&
    y.DesignationName.ToLower() == designation.DesignationName.ToLower() &&
    y.DesignationId != designation.DesignationId);



            if (exists)
            {
                Response.Result = false;
                Response.ErrorKey = "DuplicateEntry";
                Response.Message = "Designation name already exists for this branch.";
                Response.Data = new { Designation = designation };
                await httpContext.Response.WriteAsJsonAsync(Response);
                return;
            }

            await new CRUD().Update<Designation>(HRMSContext, httpContext, designation);
            Response.Result = true;
            Response.Message = "Designation updated successfully";
            Response.Data = new { Designation = designation };
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "Designation update unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
        }

        await httpContext.Response.WriteAsJsonAsync(Response);
    }
}

