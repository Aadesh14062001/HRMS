using System;
using System.Collections.Generic;

namespace HRMS.Models;

public partial class LeaveRequestsDuplicatesAudit
{
    public int AuditId { get; set; }

    public DateTime? CapturedAt { get; set; }

    public int? EmployeeId { get; set; }

    public int? LeaveRequestId { get; set; }

    public DateOnly? FromDate { get; set; }

    public DateOnly? ToDate { get; set; }

    public string? LeaveType { get; set; }

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? LastUpdatedAt { get; set; }

    public string? OriginalRow { get; set; }
}
