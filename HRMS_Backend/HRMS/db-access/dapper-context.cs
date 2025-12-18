/*
 ----------------------------------------------------------------------------- 
 |   Created By : Aadesh
 ----------------------------------------------------------------------------- 
*/
#region Depends

using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
#endregion Depends

/// <summary>
/// Provides methods for executing stored procedures asynchronously using Dapper.
/// </summary>

namespace Helper.AspNetCore.Db.Instance;

public class DataBaseAccess
{
    /// <summary>
    /// Executes a stored procedure asynchronously and retrieves multiple result sets.
    /// </summary>
    /// <param name="storedProcedureName">Name of the stored procedure to execute.</param>
    /// <param name="parameters">Parameters to pass to the stored procedure.</param>
    /// <param name="dbContext">The DbContext instance for database connection.</param>
    /// <returns>A list of lists containing dynamic objects representing the result sets.</returns>
    public async Task<List<List<dynamic>>> ExecuteStoredProcedureAsync(string storedProcedureName, object parameters, DbContext? dbContext = null)
    {
        using (var conn = dbContext != null
        ? dbContext.Database.GetDbConnection()
        : new SqlConnection("Server=localhost;Database=HRMS;Trusted_Connection=True;TrustServerCertificate=True;"))
        {
            await conn.OpenAsync();
            var reader = await conn.QueryMultipleAsync(storedProcedureName, parameters, commandType: CommandType.StoredProcedure);
            var resultSets = new List<List<dynamic>>();
            do
            {
                var resultSet = reader.Read<dynamic>().ToList();
                resultSets.Add(resultSet);
            } while (!reader.IsConsumed);
            await conn.CloseAsync();

            return resultSets;
        }
    }
    public async Task ResetIdentityAsync(string tableName, DbContext dbContext)
    {
        var sqlCommand = $"DBCC CHECKIDENT ('{tableName}', RESEED, 0);";

        await using var conn = dbContext.Database.GetDbConnection();
        try
        {
            await conn.ExecuteAsync(sqlCommand, commandType: CommandType.Text);
        }
        catch (Exception ex)
        {
            var msg = ex.Message + "For More Details : -------" + ex.InnerException;
        }
    }
}
