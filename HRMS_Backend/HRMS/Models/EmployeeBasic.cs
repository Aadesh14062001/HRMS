using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HRMS.Models;

public partial class EmployeeBasic
{
    public int EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = null!;

    public string FirstName { get; set; } = null!;

    public string? LastName { get; set; }

    public string Gender { get; set; } = null!;

    public DateOnly Dob { get; set; }

    public string ContactNo { get; set; } = null!;

    public string Email { get; set; } = null!;

    public DateOnly JoinDate { get; set; }

    public bool Status { get; set; }

    public int CompanyId { get; set; }

    public int BranchId { get; set; }

    public int DepartmentId { get; set; }

    public int SubDepartmentId { get; set; }

    public int DesignationId { get; set; }

    public int PositionId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public int? UserId { get; set; }

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
[JsonIgnore]
    public virtual Branch Branch { get; set; } = null!;
[JsonIgnore]
    public virtual Company Company { get; set; } = null!;
[JsonIgnore]
    public virtual Department Department { get; set; } = null!;
[JsonIgnore]
    public virtual Designation Designation { get; set; } = null!;

    public virtual ICollection<EmployeePersonal> EmployeePersonals { get; set; } = new List<EmployeePersonal>();

    public virtual ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
[JsonIgnore]
    public virtual Position Position { get; set; } = null!;
[JsonIgnore]
    public virtual SubDepartment SubDepartment { get; set; } = null!;
[JsonIgnore]
    public virtual User? User { get; set; }
}
