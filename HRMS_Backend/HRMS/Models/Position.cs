using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HRMS.Models;

public partial class Position
{
    public int PositionId { get; set; }

    public int CompanyId { get; set; }

    public int BranchId { get; set; }

    public int DepartmentId { get; set; }

    public int SubDepartmentId { get; set; }

    public int DesignationId { get; set; }

    public string PositionCode { get; set; } = null!;

    public string PositionTitle { get; set; } = null!;

    public string? Description { get; set; }

    public bool Status { get; set; }

    public DateTime CreatedAt { get; set; }
[JsonIgnore]
    public virtual Branch Branch { get; set; } = null!;
[JsonIgnore]
    public virtual Company Company { get; set; } = null!;

    public virtual Department Department { get; set; } = null!;
[JsonIgnore]
    public virtual Designation Designation { get; set; } = null!;

    public virtual ICollection<EmployeeBasic> EmployeeBasics { get; set; } = new List<EmployeeBasic>();
[JsonIgnore]
    public virtual SubDepartment SubDepartment { get; set; } = null!;
}
