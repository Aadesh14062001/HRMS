using System;
using System.Collections.Generic;

namespace HRMS.Models;

public partial class Company
{
    public int CompanyId { get; set; }

    public string CompanyName { get; set; } = null!;

    public string Address { get; set; } = null!;

    public string? ContactNo { get; set; }

    public string? Email { get; set; }

    public string? Website { get; set; }

    public bool? Status { get; set; }

    public virtual ICollection<Branch> Branches { get; set; } = new List<Branch>();

    public virtual ICollection<Department> Departments { get; set; } = new List<Department>();

    public virtual ICollection<Designation> Designations { get; set; } = new List<Designation>();

    public virtual ICollection<EmployeeBasic> EmployeeBasics { get; set; } = new List<EmployeeBasic>();

    public virtual ICollection<Position> Positions { get; set; } = new List<Position>();

    public virtual ICollection<SubDepartment> SubDepartments { get; set; } = new List<SubDepartment>();
}
