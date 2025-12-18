import { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { getEmployeeCode, getEmployeeId, getRoles } from "./auth";
import api from "./api";

function toLocalDate(d?: any) {
  if (!d) return "";
  try {
    const s =
      typeof d === "string" ? (d.includes("T") ? d : `${d}T00:00:00`) : d;
    return new Date(s).toLocaleDateString();
  } catch {
    return String(d);
  }
}
function formatTime(t?: any) {
  if (!t) return "—";
  try {
    const s = String(t);
    if (s.includes("T"))
      return new Date(s).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    return s.split(".")[0].split(":").slice(0, 2).join(":");
  } catch {
    return String(t);
  }
}

/** find an array inside the usual response shapes in a case-insensitive way */
function findAttendanceArray(data: any): any[] {
  if (!data) return [];
  // common shapes: data.Attendance, data.attendance, data.data?.attendance, data.AttendanceList, etc.
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.Attendance)) return data.Attendance;
  if (Array.isArray(data.attendance)) return data.attendance;
  // sometimes the API returns wrapped: { data: { attendance: [...] } }
  if (data.data && Array.isArray(data.data.Attendance))
    return data.data.Attendance;
  if (data.data && Array.isArray(data.data.attendance))
    return data.data.attendance;
  // fallback: search any key that looks like attendance array
  for (const k of Object.keys(data)) {
    if (/attendance/i.test(k) && Array.isArray((data as any)[k]))
      return (data as any)[k];
  }
  // no array found
  return [];
}

function normalizeRow(r: any) {
  if (!r) return null;
  return {
    // store original for debugging if needed
    __raw: r,
    date: r.AttendanceDate ?? r.attendanceDate ?? r.date ?? r.Date ?? null,
    status: r.Status ?? r.status ?? "Present",
    checkIn: r.CheckInTime ?? r.checkInTime ?? r.CheckIn ?? r.checkIn ?? null,
    checkOut:
      r.CheckOutTime ?? r.checkOutTime ?? r.CheckOut ?? r.checkOut ?? null,
    hours: r.WorkHours ?? r.workHours ?? r.Hours ?? r.hours ?? null,
    remarks: r.Remarks ?? r.remarks ?? r.Remark ?? r.remark ?? null,
  };
}

export default function MyAttendance() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const toastRef = useRef<Toast | null>(null);

  const employeeId = getEmployeeId();
  const employeeCode = getEmployeeCode();
  const roles = getRoles();
  const isPrivileged = roles.some((r) =>
    ["Admin", "HR", "Manager"].includes(r)
  );

  const load = async () => {
    setLoading(true);
    try {
      const payload: any = {};
      if (!isPrivileged) {
        if (employeeId) payload.EmployeeID = employeeId;
        else if (employeeCode) payload.EmployeeCode = employeeCode;
      }
      const res = await api.post("/Attendance/GetAll", payload);
      console.log("Attendance/GetAll response:", res?.data);
      const arr = findAttendanceArray(res?.data ?? res);
      const mapped = arr.map(normalizeRow).filter(Boolean);
      setRows(mapped);
      if ((mapped || []).length === 0) {
        // optional toast: comment out if noisy
        // toastRef.current?.show({ severity: 'info', summary: 'No records', detail: 'No attendance records returned', life: 3000 });
      }
    } catch (err: any) {
      console.error("MyAttendance load error:", err);
      toastRef.current?.show({
        severity: "error",
        summary: "Error",
        detail: err?.response?.data?.message || err?.message || "Network error",
        life: 6000,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // call the async loader and handle promise explicitly
    load().catch((e) => console.error("Unexpected load() error:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <Toast ref={toastRef} />
      <h3>My Attendance</h3>
      <div style={{ marginBottom: 12 }}>
        <Button label="Refresh" icon="pi pi-refresh" onClick={() => load()} />
      </div>

      <DataTable
        value={rows}
        loading={loading}
        paginator
        rows={10}
        emptyMessage="No attendance records found."
      >
        <Column header="Date" body={(r: any) => toLocalDate(r.date)} sortable />
        <Column header="Status" field="status" />
        <Column header="Check In" body={(r: any) => formatTime(r.checkIn)} />
        <Column header="Check Out" body={(r: any) => formatTime(r.checkOut)} />
        <Column header="Hours" field="hours" />
        {/* <Column header="Remarks" field="remarks" /> */}
      </DataTable>
    </div>
  );
}
