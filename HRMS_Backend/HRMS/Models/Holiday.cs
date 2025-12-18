using System;
using System.Collections.Generic;

namespace HRMS.Models;

public partial class Holiday
{
    public int HolidayId { get; set; }

    public DateOnly HolidayDate { get; set; }

    public string Description { get; set; } = null!;

    public bool IsRecurring { get; set; }

    public string? Country { get; set; }

    public int? CompanyId { get; set; }

    public DateTime? CreatedAt { get; set; }
}
