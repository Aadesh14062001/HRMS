using System.Text.Json;
using Helper.AspNetCore.CRUD;
using HRMS.Models;
using Microsoft.EntityFrameworkCore;

public class Branches
{
    public async Task GetAll(HttpContext httpContext, HrmsContext HrmsContext)
    {
        var Response = new JsonStructure();

        try
        {
            var requestBody = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
            var jsonData = JsonDocument.Parse(requestBody);

            if (jsonData.RootElement.TryGetProperty("BranchID", out JsonElement CompanyIdElement) &&
                CompanyIdElement.TryGetInt32(out int BranchID))
            {
                if (BranchID == 0)
                {
                    Response.Result = true;
                    Response.Message = "Branch data retrieved successfully";
                    Response.Data = new
                    {
                        V_BranchView = (await new CRUD().Read<Branch>(HrmsContext))
                             .OrderByDescending(x => x.BranchName)
                            .ToList()
                    };
                    httpContext.Response.StatusCode = 200;
                }
                else
                {
                    var branchObj = await HrmsContext.Branches

                        .SingleOrDefaultAsync(c => c.BranchId == BranchID);

                    if (branchObj != null)
                    {
                        Response.Result = true;
                        Response.Message = "Company record retrieved successfully";
                        Response.Data = new { V_CompanyView = branchObj };
                        httpContext.Response.StatusCode = 200;
                    }
                    else
                    {
                        Response.Result = false;
                        Response.Message = "Branch record not found";
                        httpContext.Response.StatusCode = 404;
                    }
                }
            }
            else
            {
                Response.Result = false;
                Response.Message = "Invalid or missing BranchID";
                httpContext.Response.StatusCode = 400;
            }

            await httpContext.Response.WriteAsJsonAsync(Response);
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "Branch data retrieval unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync(Response);
        }
    }


    // Insert a new branch
    public async Task Insert(HttpContext httpContext, HrmsContext HRMSContext, Branch branch)
    {
        var Response = new JsonStructure();

        try
        {
            var exists = await HRMSContext.Branches.AnyAsync(b =>
                b.CompanyId == branch.CompanyId &&
                b.BranchName.ToLower() == branch.BranchName.ToLower());

            if (exists)
            {
                Response.Result = false;
                Response.ErrorKey = "DuplicateEntry";
                Response.Message = "Branch already exists for this company.";
                Response.Data = new { Branch = branch };
                await httpContext.Response.WriteAsJsonAsync(Response);
                return;
            }

            await new CRUD().Create<Branch>(HRMSContext, httpContext, branch);
            Response.Result = true;
            Response.Message = "Branch inserted successfully";
            Response.Data = new { Branch = branch };
            httpContext.Response.StatusCode = 201;
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "Branch insert unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
        }

        await httpContext.Response.WriteAsJsonAsync(Response);
    }

    // Update an existing branch
    public async Task Update(HttpContext httpContext, HrmsContext HRMSContext, Branch branch)
    {
        var Response = new JsonStructure();

        try
        {
            var exists = await HRMSContext.Branches.AnyAsync(b =>
                b.CompanyId == branch.CompanyId &&
                b.BranchName.ToLower() == branch.BranchName.ToLower() &&
                b.BranchId != branch.BranchId);

            if (exists)
            {
                Response.Result = false;
                Response.ErrorKey = "DuplicateEntry";
                Response.Message = "Branch name already exists for this company.";
                Response.Data = new { Branch = branch };
                await httpContext.Response.WriteAsJsonAsync(Response);
                return;
            }

            await new CRUD().Update<Branch>(HRMSContext, httpContext, branch);
            Response.Result = true;
            Response.Message = "Branch updated successfully";
            Response.Data = new { Branch = branch };
        }
        catch (Exception ex)
        {
            Response.Result = false;
            Response.Message = "Branch update unsuccessful";
            Response.Data = new { Error = ex.Message, Details = ex.InnerException?.Message };
            httpContext.Response.StatusCode = 500;
        }

        await httpContext.Response.WriteAsJsonAsync(Response);
    }
}

