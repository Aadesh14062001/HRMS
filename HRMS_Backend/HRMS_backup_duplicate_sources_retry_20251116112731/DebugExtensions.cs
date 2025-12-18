using System.Linq;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace HRMS.Helpers
{
    public static class DebugExtensions
    {
        public static string DumpClaims(this HttpContext ctx)
        {
            if (ctx?.User?.Claims == null) return "No user/claims";
            var sb = new StringBuilder();
            sb.AppendLine("Claims:");
            foreach (var c in ctx.User.Claims)
            {
                sb.AppendLine($"  {c.Type} = {c.Value}");
            }
            return sb.ToString();
        }
    }
}
