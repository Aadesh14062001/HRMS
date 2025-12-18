using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HRMS.Models;

public partial class Department
{
    public int DepartmentId { get; set; }

    public string Name { get; set; } = null!;

    public string Code { get; set; } = null!;

    public string? Description { get; set; }

    public int CompanyId { get; set; }

    public int BranchId { get; set; }

    public string Head { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime UpdatedDate { get; set; }
[JsonIgnore]
    public virtual Branch Branch { get; set; } = null!;
[JsonIgnore]
    public virtual Company Company { get; set; } = null!;

    public virtual ICollection<Designation> Designations { get; set; } = new List<Designation>();

    public virtual ICollection<EmployeeBasic> EmployeeBasics { get; set; } = new List<EmployeeBasic>();

    public virtual ICollection<Position> Positions { get; set; } = new List<Position>();

    public virtual ICollection<SubDepartment> SubDepartments { get; set; } = new List<SubDepartment>();
}
