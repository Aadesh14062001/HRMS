#region Depends
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
#endregion Depends
namespace Helper.AspNetCore.manual;
public class Manual
{
    #region Initialize
    public async Task Init_Manual(HttpContext httpContext, DbContext  dbContext)
    {
        try
        {
           // await httpContext.Response.WriteAsJsonAsync(dbContext);
        }
        catch (Exception ex)
        {
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync($"Error ge company: {ex.Message}");
        }
    }
    #endregion
    #region Insert

    public async Task Insert_Manual(HttpContext httpContext, DbContext dbContext)
    {
        try
        {
            var requestData = await JsonSerializer.DeserializeAsync<Employee>(httpContext.Request.Body);
            if (requestData == null)
            {
                httpContext.Response.StatusCode = 400;
                await httpContext.Response.WriteAsJsonAsync("Invalid data.");
                return;
            }
            //dbContext.Employees.Add(requestData);
            await dbContext.SaveChangesAsync();
            await httpContext.Response.WriteAsJsonAsync(dbContext);
        }
        catch (Exception ex)
        {
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync($"Error updating company: {ex.Message}");
        }

    }
    #endregion Insert
    #region Update
    public async Task Update_Manual(HttpContext httpContext, DbContext dbContext)
    {
        try
        {
            var requestData = await JsonSerializer.DeserializeAsync<Employee>(httpContext.Request.Body);

            if (requestData == null)
            {
                httpContext.Response.StatusCode = 400;
                await httpContext.Response.WriteAsJsonAsync("Invalid data.");
                return;
            }

            // var existingCompany = await dbContext.Employees.FindAsync(requestData.Id);
            // if (existingCompany == null)
            // {
            //     httpContext.Response.StatusCode = 404;
            //     await httpContext.Response.WriteAsJsonAsync("Company not found.");
            //     return;
            // }

            // existingCompany.FirstName = requestData.FirstName;
            // existingCompany.LastName = requestData.LastName;
            // existingCompany.PhoneNo = requestData.PhoneNo;

            // await dbContext.SaveChangesAsync();

            // await httpContext.Response.WriteAsJsonAsync(existingCompany);
        }
        catch (Exception ex)
        {
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync($"Error updating company: {ex.Message}");
        }
    }
    #endregion Update
    #region Delete
     public async Task Delete_Manual(HttpContext httpContext, DbContext dbContext)
    {
        try
        {
            var requestData = await JsonSerializer.DeserializeAsync<Employee>(httpContext.Request.Body);

            if (requestData == null)
            {
                httpContext.Response.StatusCode = 400;
                await httpContext.Response.WriteAsJsonAsync("Invalid data.");
                return;
            }

            // var companyToDelete = await dbContext.Employees.FindAsync(requestData.Id);

            // if (companyToDelete == null)
            // {
            //     httpContext.Response.StatusCode = 404;
            //     await httpContext.Response.WriteAsJsonAsync($"Company with ID {requestData.Id} not found.");
            //     return;
            // }

            // dbContext.Employees.Remove(companyToDelete);


            // await dbContext.SaveChangesAsync();

            // await httpContext.Response.WriteAsJsonAsync(dbContext.Employees);
        }
        catch (Exception ex)
        {
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync($"Error deleting company: {ex.Message}");
        }
    }
    #endregion Delete
    
}

internal class Employee
{
    public string? FirstName { get; internal set; }
    public string? LastName { get; internal set; }
    public string? PhoneNo { get; internal set; }
}