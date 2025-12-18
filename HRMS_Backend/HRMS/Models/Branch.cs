using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HRMS.Models;

public partial class Branch
{
    public int BranchId { get; set; }

    public int CompanyId { get; set; }

    public string BranchName { get; set; } = null!;

    public string Location { get; set; } = null!;

    public string ContactNo { get; set; } = null!;

    public string Email { get; set; } = null!;

    public bool? Status { get; set; }
[JsonIgnore]
    public virtual Company Company { get; set; } = null!;

    public virtual ICollection<Department> Departments { get; set; } = new List<Department>();

    public virtual ICollection<Designation> Designations { get; set; } = new List<Designation>();

    public virtual ICollection<EmployeeBasic> EmployeeBasics { get; set; } = new List<EmployeeBasic>();

    public virtual ICollection<Position> Positions { get; set; } = new List<Position>();

    public virtual ICollection<SubDepartment> SubDepartments { get; set; } = new List<SubDepartment>();
}
