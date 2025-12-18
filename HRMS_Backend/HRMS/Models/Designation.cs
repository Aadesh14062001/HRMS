using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HRMS.Models;

public partial class Designation
{
    public int DesignationId { get; set; }

    public int CompanyId { get; set; }

    public int BranchId { get; set; }

    public int DepartmentId { get; set; }

    public int SubDepartmentId { get; set; }

    public string DesignationCode { get; set; } = null!;

    public string DesignationName { get; set; } = null!;

    public string? Level { get; set; }

    public string? Description { get; set; }

    public bool Status { get; set; }

    public DateTime CreatedAt { get; set; }
[JsonIgnore]
    public virtual Branch Branch { get; set; } = null!;
[JsonIgnore]
    public virtual Company Company { get; set; } = null!;
[JsonIgnore]
    public virtual Department Department { get; set; } = null!;

    public virtual ICollection<EmployeeBasic> EmployeeBasics { get; set; } = new List<EmployeeBasic>();

    public virtual ICollection<Position> Positions { get; set; } = new List<Position>();
[JsonIgnore]
    public virtual SubDepartment SubDepartment { get; set; } = null!;
}
