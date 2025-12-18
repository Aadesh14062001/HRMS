public class SmtpSettings
{
    public string? Server { get; set; }
    public int? Port { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
}
public class FujitecMailAPIModel
{
    public string AuthApiUrl { get; set; } = string.Empty;
    public string MailSendApiUrl { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

