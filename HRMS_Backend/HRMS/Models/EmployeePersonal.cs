using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HRMS.Models;

public partial class EmployeePersonal
{
    public int EmployeePersonalId { get; set; }

    public string EmployeeCode { get; set; } = null!;

    public string FatherName { get; set; } = null!;

    public string MaritalStatus { get; set; } = null!;

    public string Nationality { get; set; } = null!;

    public string BloodGroup { get; set; } = null!;

    public string AadharNumber { get; set; } = null!;

    public string Pannumber { get; set; } = null!;

    public string PermanentAddress { get; set; } = null!;

    public string CurrentAddress { get; set; } = null!;

    public bool IsSameAddress { get; set; }

    public string State { get; set; } = null!;

    public string City { get; set; } = null!;

    public string Pincode { get; set; } = null!;

    public string EmergencyContactName { get; set; } = null!;

    public string EmergencyContactRelation { get; set; } = null!;

    public string EmergencyContactNumber { get; set; } = null!;
[JsonIgnore]
    public virtual EmployeeBasic EmployeeCodeNavigation { get; set; } = null!;
}
