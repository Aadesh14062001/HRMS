using System;
using System.Collections.Generic;

namespace HRMS.Models;

public partial class PayrollSlip
{
    public int SlipId { get; set; }

    public int EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = null!;

    public int Year { get; set; }

    public int Month { get; set; }

    public decimal GrossAmount { get; set; }

    public decimal NetAmount { get; set; }

    public byte[]? Pdffile { get; set; }

    public DateTime? CreatedAt { get; set; }
}
