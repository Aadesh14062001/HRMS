using System;
using System.Collections.Generic;

namespace HRMS.Models;

public partial class LeaveRequestsArchivedDuplicate
{
    public int ArchiveId { get; set; }

    public DateTime? ArchivedAt { get; set; }

    public int? EmployeeId { get; set; }

    public int? LeaveRequestId { get; set; }

    public DateOnly? FromDate { get; set; }

    public DateOnly? ToDate { get; set; }

    public string? LeaveType { get; set; }

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? Remarks { get; set; }
}
