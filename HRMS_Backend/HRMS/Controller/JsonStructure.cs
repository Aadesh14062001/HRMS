#nullable enable

using System.Text.Json.Serialization;

namespace HRMS.Controller
{
    /// <summary>
    /// Lightweight JSON response wrapper used throughout controllers.
    /// Add or remove properties as your controllers expect.
    /// </summary>
    public class JsonStructure
    {
        // Whether the operation succeeded
        public bool Result { get; set; } = false;

        // A friendly message
        public string Message { get; set; } = string.Empty;

        // Any response payload
        public object? Data { get; set; } = null;

        // Optional numeric error code (used by some controllers)
        public int? ErrorCode { get; set; } = null;

        // Optional machine-friendly error key
        public string? ErrorKey { get; set; } = null;

        // Timestamp (optional)
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public DateTime? Timestamp { get; set; } = null;
    }
}
