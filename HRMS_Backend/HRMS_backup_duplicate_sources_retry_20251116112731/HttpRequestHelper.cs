using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace HRMS.Helpers
{
    public static class HttpRequestHelper
    {
        /// <summary>
        /// Read the request body as string (rewinds body if possible).
        /// Safe to call once per request; controllers in your code expect a raw body string.
        /// </summary>
        public static async Task<string> ReadBodyAsStringAsync(HttpContext ctx)
        {
            if (ctx == null) return string.Empty;

            var req = ctx.Request;
            if (req.Body == null) return string.Empty;

            // If body is seekable, reset position
            if (req.Body.CanSeek) req.Body.Position = 0;

            using var reader = new StreamReader(req.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
            var body = await reader.ReadToEndAsync();

            // reset position so further middleware can read if necessary
            if (req.Body.CanSeek) req.Body.Position = 0;

            return body ?? string.Empty;
        }
    }
}
