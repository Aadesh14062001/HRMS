using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HRMS.Models;

public partial class SubDepartment
{
    public int SubDepartmentId { get; set; }

    public int CompanyId { get; set; }

    public int BranchId { get; set; }

    public int DepartmentId { get; set; }

    public string SubDepartmentCode { get; set; } = null!;

    public string SubDepartmentName { get; set; } = null!;

    public string? Description { get; set; }

    public bool Status { get; set; }

    public DateTime CreatedAt { get; set; }
[JsonIgnore]
    public virtual Branch Branch { get; set; } = null!;
[JsonIgnore]
    public virtual Company Company { get; set; } = null!;
[JsonIgnore]
    public virtual Department Department { get; set; } = null!;

    public virtual ICollection<Designation> Designations { get; set; } = new List<Designation>();

    public virtual ICollection<EmployeeBasic> EmployeeBasics { get; set; } = new List<EmployeeBasic>();

    public virtual ICollection<Position> Positions { get; set; } = new List<Position>();
}
