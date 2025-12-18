using System.Text.Json;
using Helper.AspNetCore.CRUD;
using HRMS.Models;
using Microsoft.EntityFrameworkCore;

public class Positions
{
    // Get all Position
    public async Task GetAll(HttpContext httpContext, HrmsContext HrmsContext)
    {
        var Response = new JsonStructure();

        try
        {
            var requestBody = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
            var jsonData = JsonDocument.Parse(requestBody);

            if (jsonData.RootElement.TryGetProperty("PositionId", out JsonElement PositionIdElement) &&
                PositionIdElement.TryGetInt32(out int PositionId))
            {
                if (PositionId == 0)
                {
                    Response.Result = true;
                    Response.Message = "PositionId data retrieved successfully";
                    Response.Data = new
                    {
                        V_PositionView = (await new CRUD().Read<Position>(HrmsContext))
                             .OrderByDescending(x => x.PositionTitle)
                            .ToList()
                    };
                    httpContext.Response.StatusCode = 200;
                }
                else
                {
                    var PositionObj = await HrmsContext.Positions

                        .SingleOrDefaultAsync(c => c.PositionId == PositionId);

                    if (PositionObj != null)
                    {
                        Response.Result = true;
                        Response.Message = "PositionObj record retrieved successfully";
                        Response.Data = new { V_PositionView = PositionObj };
                        httpContext.Response.StatusCode = 200;
                    }
                    else
                    {
                        Response.Result = false;
                        Response.Message = "Position record not found";
                        httpContext.Response.StatusCode = 404;
                    }
                }
            }
            else
            {
                Response.Result = false;
                Response.Message = "Invalid or missing PositionID";
                httpContext.Response.StatusCode = 400;
            }

            await httpContext.Response.WriteAsJsonAsync(Response);
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "Position data retrieval unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync(Response);
        }
    }

    // Insert a new Position
    public async Task Insert(HttpContext httpContext, HrmsContext HRMSContext, Position position)
    {
        var Response = new JsonStructure();

        try
        {
            var exists = await HRMSContext.Positions.AnyAsync(y =>
            y.CompanyId == position.CompanyId &&
            y.BranchId == position.BranchId &&
            y.DepartmentId == position.DepartmentId &&
            y.SubDepartmentId == position.SubDepartmentId &&
            y.DesignationId == position.DesignationId &&
            y.PositionTitle.ToLower() == position.PositionTitle.ToLower());



            if (exists)
            {
                Response.Result = false;
                Response.ErrorKey = "DuplicateEntry";
                Response.Message = "Position already exists";
                Response.Data = new { position = position };
                await httpContext.Response.WriteAsJsonAsync(Response);
                return;
            }

            await new CRUD().Create<Position>(HRMSContext, httpContext, position);
            Response.Result = true;
            Response.Message = "position inserted successfully";
            Response.Data = new { position = position };
            httpContext.Response.StatusCode = 201;
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "position insert unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
        }

        await httpContext.Response.WriteAsJsonAsync(Response);
    }

    // Update an existing Designation
    public async Task Update(HttpContext httpContext, HrmsContext HRMSContext, Position position)
    {
        var Response = new JsonStructure();

        try
        {
            var exists = await HRMSContext.Positions.AnyAsync(y =>
    y.CompanyId == position.CompanyId &&
    y.BranchId == position.BranchId &&
    y.DepartmentId == position.DepartmentId &&
    y.SubDepartmentId == position.SubDepartmentId &&
 y.DesignationId == position.DesignationId &&
    y.PositionTitle.ToLower() == position.PositionTitle.ToLower() &&
    y.PositionId  != position.PositionId);



            if (exists)
            {
                Response.Result = false;
                Response.ErrorKey = "DuplicateEntry";
                Response.Message = "position already exists .";
                Response.Data = new { position = position };
                await httpContext.Response.WriteAsJsonAsync(Response);
                return;
            }

            await new CRUD().Update<Position>(HRMSContext, httpContext,position);
            Response.Result = true;
            Response.Message = "Position updated successfully";
            Response.Data = new { Position = position };
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "Position update unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
        }

        await httpContext.Response.WriteAsJsonAsync(Response);
    }
}

