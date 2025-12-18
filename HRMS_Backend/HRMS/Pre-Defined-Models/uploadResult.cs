public class UploadResult
{
    public bool Success { get; set; }
    public string? FilePath { get; set; }
    public string? FileName { get; set; }
    public string? ErrorMessage { get; set; }
}

public class UploadResult1
{
    public bool Success { get; set; }
    public List<string> FilePaths { get; set; } = new List<string>();
    public string? ErrorMessage { get; set; }
}
