using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HRMS.Models;

public partial class LeaveRequest
{
    public int LeaveRequestId { get; set; }

    public int EmployeeId { get; set; }

    public string? EmployeeCode { get; set; }

    public string LeaveType { get; set; } = null!;

    public DateOnly FromDate { get; set; }

    public DateOnly ToDate { get; set; }

    public decimal? Days { get; set; }

    public string? Reason { get; set; }

    public string Status { get; set; } = null!;

    public int? ApproverId { get; set; }

    public string? ApproverRemarks { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User? Approver { get; set; }
[JsonIgnore]
    public virtual EmployeeBasic Employee { get; set; } = null!;
}
