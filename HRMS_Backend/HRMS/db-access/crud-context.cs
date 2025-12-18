/*
 ----------------------------------------------------------------------------- 
 |   Created By : Manikandan A
 |   Created On : 2024(y) - 07(m)
 ----------------------------------------------------------------------------- 
*/
#region  Depends

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
#endregion Depends
/// <summary>
/// Provides CRUD operations for handling entities in a DbContext.
/// </summary>

namespace Helper.AspNetCore.CRUD;

public class CRUD
{
    /// <summary>
    /// Reads all entities of type <typeparamref name="T"/> from the specified <paramref name="dbContext"/> 
    /// and writes them to the HTTP response as JSON.
    /// </summary>
    /// <typeparam name="T">The type of the entity.</typeparam>
    /// <param name="httpContext">The HTTP context.</param>
    /// <param name="dbContext">The DbContext to read from.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    public async Task<List<T>> Read<T>(DbContext dbContext) where T : class
    {
        try

        {
            var dbSet = await dbContext.Set<T>().AsNoTracking().ToListAsync();
            return dbSet;
        }
        catch (Exception ex)
        {
            throw new Exception($"Error getting {typeof(T).Name}: {ex.Message}", ex);
        }
    }
    /// <summary>
    /// Creates a new entity of type <typeparamref name="T"/> in the specified <paramref name="dbContext"/> 
    /// and writes the created entity to the HTTP response as JSON.
    /// </summary>
    /// <typeparam name="T">The type of the entity.</typeparam>
    /// <param name="httpContext">The HTTP context.</param>
    /// <param name="dbContext">The DbContext to add the entity to.</param>
    /// <param name="entity">The entity to be created.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    public async Task Create<T>(DbContext dbContext, HttpContext httpContext, T entity) where T : class
    {
        var response = new JsonStructure();
        try
        {
            if (entity != null)
            {
                await dbContext.Set<T>().AddAsync(entity);
                await dbContext.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            response.Result = false;
            response.ErrorCode = 500;
            response.Message = $"Error updating {typeof(T).Name}: {ex.Message}";
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync(response);
        }
    }
    /// <summary>
    /// Updates an existing entity of type <typeparamref name="T"/> in the specified <paramref name="dbContext"/> 
    /// and writes the updated entity to the HTTP response as JSON.
    /// </summary>
    /// <typeparam name="T">The type of the entity.</typeparam>
    /// <param name="httpContext">The HTTP context.</param>
    /// <param name="dbContext">The DbContext to update the entity in.</param>
    /// <param name="entity">The entity to be updated.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    public async Task Update<T>(DbContext dbContext, HttpContext httpContext, T entity)
         where T : class
    {
        var response = new JsonStructure();

        try
        {
            var dbSet = dbContext.Set<T>();

            dbSet.Update(entity);

            await dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            response.Result = false;
            response.ErrorCode = 500;
            response.Message = $"Error updating {typeof(T).Name}: {ex.Message}";
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync(response);
        }

    }

    /// <summary>
    /// Deletes an entity of type <typeparamref name="TEntity"/> from the specified <paramref name="dbContext"/> 
    /// based on the primary key values provided in the HTTP request body, and writes a success or error message to the HTTP response.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="httpContext">The HTTP context.</param>
    /// <param name="dbContext">The DbContext to delete the entity from.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    public async Task Delete<TEntity>(DbContext dbContext, HttpContext httpContext)
     where TEntity : class
    {
        var response = new JsonStructure();
        try
        {
            var requestData = await JsonSerializer.DeserializeAsync<TEntity>(httpContext.Request.Body);
            if (requestData == null)
            {
                httpContext.Response.StatusCode = 400;
                await httpContext.Response.WriteAsJsonAsync("Invalid data.");
                return;
            }

            var entityType = typeof(TEntity);
            var keyProperties = dbContext.Model.FindEntityType(entityType)?.FindPrimaryKey()?.Properties;
            if (keyProperties == null || keyProperties.Count == 0)
            {
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsJsonAsync($"Primary key properties not found for entity type '{entityType.Name}'.");
                return;
            }

            var keyValues = keyProperties.Select(prop => entityType.GetProperty(prop.Name)?.GetValue(requestData)).ToArray();
            var existingEntity = await dbContext.Set<TEntity>().FindAsync(keyValues);

            if (existingEntity == null)
            {
                httpContext.Response.StatusCode = 404;
                await httpContext.Response.WriteAsJsonAsync($"{entityType.Name} not found.");
                return;
            }

            dbContext.Set<TEntity>().Remove(existingEntity);
            await dbContext.SaveChangesAsync();

            response.Result = true;
            response.Message = entityType.Name + " deleted successfully";
            response.Data = $"{entityType.Name} deleted successfully.";
            await httpContext.Response.WriteAsJsonAsync(response);
        }
        catch (Exception ex)
        {
            response.Result = false;
            response.ErrorCode = 500;
            response.Message = ex.Message + "For More Details : -------" + ex.InnerException;
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync(response);
        }
    }
    /// <summary>
    /// Adds a collection of entities to the database context and saves the changes asynchronously.
    /// </summary>
    /// <typeparam name="T">The type of the entities being added. Must be a class.</typeparam>
    /// <param name="dbContext">The database context to which the entities will be added.</param>
    /// <param name="httpContext">The HTTP context that may be used for additional information (currently not used in the method).</param>
    /// <param name="entities">The collection of entities to be added to the database.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// This method checks if the entities collection is not null and contains elements before attempting to add them to the context.
    /// If the collection is empty or null, no action is taken. After adding the entities, changes are saved to the database.
    /// </remarks>
    public async Task CreateMultiple<T>(DbContext dbContext, HttpContext httpContext, IEnumerable<T> entities) where T : class
    {
        var response = new JsonStructure();
        try
        {
            if (entities != null && entities.Any())
            {
                await dbContext.Set<T>().AddRangeAsync(entities);
                await dbContext.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            response.Result = false;
            response.ErrorCode = 500;
            response.Message = ex.Message + "For More Details : -------" + ex.InnerException;
            httpContext.Response.StatusCode = 500;
            await httpContext.Response.WriteAsJsonAsync(response);
        }
    }
    /// <summary>
    /// Updates a collection of entities in the database context and saves the changes asynchronously.
    /// </summary>
    /// <typeparam name="T">The type of the entities being updated. Must be a class.</typeparam>
    /// <param name="dbContext">The database context in which the entities are being updated.</param>
    /// <param name="httpContext">The HTTP context that may be used for additional information (currently not used in the method).</param>
    /// <param name="entities">The collection of entities to be updated in the database.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// This method checks if the entities collection is not null and contains elements before attempting to update them.
    /// For each entity, it attaches the entity to the context and marks its state as modified. This approach is generally used
    /// when the entities are not being tracked by the context already.
    /// If the collection is empty or null, no action is taken. After marking the entities as modified, changes are saved to the database.
    /// </remarks>
    public async Task UpdateMultiple<T>(DbContext dbContext, HttpContext httpContext, IEnumerable<T> entities) where T : class
    {
        if (entities != null && entities.Any())
        {
            foreach (var entity in entities)
            {
                dbContext.Attach(entity);
                dbContext.Entry(entity).State = EntityState.Modified;
            }
            await dbContext.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Deletes a collection of entities from the database context and saves the changes asynchronously.
    /// </summary>
    /// <typeparam name="T">The type of the entities being deleted. Must be a class.</typeparam>
    /// <param name="dbContext">The database context from which the entities will be deleted.</param>
    /// <param name="httpContext">The HTTP context that may be used for additional information (currently not used in the method).</param>
    /// <param name="entities">The collection of entities to be deleted from the database.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// This method checks if the entities collection is not null and contains elements before attempting to delete them.
    /// For each entity, it attaches the entity to the context and marks its state as deleted. This approach is generally used
    /// when the entities are not being tracked by the context already.
    /// If the collection is empty or null, no action is taken. After marking the entities as deleted, changes are saved to the database.
    /// </remarks>
    public async Task DeleteMultiple<T>(DbContext dbContext, HttpContext httpContext, IEnumerable<T> entities) where T : class
    {
        if (entities != null && entities.Any())
        {
            foreach (var entity in entities)
            {
                dbContext.Attach(entity);
                dbContext.Entry(entity).State = EntityState.Deleted;
            }
            await dbContext.SaveChangesAsync();
        }
    }
    public async Task<List<T>> ReadWithInclude<T>(DbContext dbContext, params string[] includes) where T : class
    {
        try
        {
            IQueryable<T> query = dbContext.Set<T>().AsQueryable();

            if (includes != null && includes.Length > 0)
            {
                foreach (var include in includes)
                {
                    query = query.Include(include);
                }
            }

            return await query.AsNoTracking().ToListAsync();
        }
        catch (Exception ex)
        {
            throw new Exception($"Error reading {typeof(T).Name} with includes: {ex.Message}", ex);
        }
    }
    

}
