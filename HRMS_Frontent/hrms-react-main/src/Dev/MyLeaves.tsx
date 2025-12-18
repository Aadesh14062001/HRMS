// import { useEffect, useRef, useState } from "react";
// import { DataTable } from "primereact/datatable";
// import { Column } from "primereact/column";
// import { Button } from "primereact/button";
// import { Toast } from "primereact/toast";
// import { getEmployeeCode, getEmployeeId, getRoles } from "./auth";
// import api from "./api";

// function toLocalDate(d?: any) {
//   if (!d) return "";
//   try {
//     const s =
//       typeof d === "string" ? (d.includes("T") ? d : `${d}T00:00:00`) : d;
//     return new Date(s).toLocaleDateString();
//   } catch {
//     return String(d);
//   }
// }

// /** Accept many possible shapes */
// function findLeavesArray(data: any): any[] {
//   if (!data) return [];
//   if (Array.isArray(data)) return data;
//   if (Array.isArray(data.LeaveRequests)) return data.LeaveRequests;
//   if (Array.isArray(data.leaveRequests)) return data.leaveRequests;
//   if (Array.isArray(data.leaves)) return data.leaves;
//   if (data.data && Array.isArray(data.data.LeaveRequests))
//     return data.data.LeaveRequests;
//   if (data.data && Array.isArray(data.data.leaveRequests))
//     return data.data.leaveRequests;
//   for (const k of Object.keys(data)) {
//     if (/leave/i.test(k) && Array.isArray((data as any)[k]))
//       return (data as any)[k];
//   }
//   return [];
// }

// function normalize(r: any) {
//   if (!r) return null;
//   return {
//     __raw: r,
//     id: r.LeaveRequestID ?? r.LeaveRequestId ?? r.Id ?? null,
//     employee: r.EmployeeCode ?? r.Employee ?? r.employeeCode ?? "",
//     from: r.FromDate ?? r.fromDate ?? r.StartDate ?? null,
//     to: r.ToDate ?? r.toDate ?? r.EndDate ?? null,
//     type: r.LeaveType ?? r.Type ?? r.TypeName ?? "",
//     days: r.Days ?? r.days ?? null,
//     status: r.Status ?? r.status ?? null,
//     reason: r.Reason ?? r.reason ?? null,
//   };
// }

// export default function MyLeaves() {
//   const [rows, setRows] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const toastRef = useRef<Toast | null>(null);
//   const employeeId = getEmployeeId();
//   const employeeCode = getEmployeeCode();
//   const roles = getRoles();
//   const isPrivileged = roles.some((r) =>
//     ["Admin", "HR", "Manager"].includes(r)
//   );

//   const load = async (status?: string) => {
//     setLoading(true);
//     try {
//       const payload: any = {};
//       if (!isPrivileged) {
//         if (employeeId) payload.EmployeeID = employeeId;
//         else if (employeeCode) payload.EmployeeCode = employeeCode;
//       }
//       if (status) payload.Status = status;
//       const res = await api.post("/LeaveRequests/GetAll", payload);
//       console.log("MyLeaves/GetAll response:", res?.data);
//       const arr = findLeavesArray(res?.data ?? res);
//       const mapped = arr.map(normalize).filter(Boolean);
//       setRows(mapped);
//       if (!mapped.length) {
//         // optional info - comment out if you don't want it
//         // toastRef.current?.show({ severity: 'info', summary: 'No records', detail: 'No leave requests returned', life: 3000 });
//       }
//     } catch (err: any) {
//       console.error("MyLeaves load error:", err);
//       toastRef.current?.show({
//         severity: "error",
//         summary: "Error",
//         detail: err?.response?.data?.message || err?.message || "Network error",
//         life: 6000,
//       });
//       setRows([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load().catch((e) => console.error("MyLeaves load() failed:", e));
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <div style={{ padding: 16 }}>
//       <Toast ref={toastRef} />
//       <h3>My Leaves</h3>
//       <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
//         <Button label="Refresh" icon="pi pi-refresh" onClick={() => load()} />
//         <Button
//           label="Pending"
//           onClick={() => load("Pending")}
//           className="p-button-text"
//         />
//         <Button
//           label="Approved"
//           onClick={() => load("Approved")}
//           className="p-button-text"
//         />
//       </div>

//       <DataTable
//         value={rows}
//         loading={loading}
//         paginator
//         rows={10}
//         emptyMessage="No leave requests found."
//       >
//         {/* show employee column only for privileged users */}
//         {isPrivileged && (
//           <Column header="Employee" body={(r: any) => r.employee ?? "—"} />
//         )}
//         <Column header="From" body={(r: any) => toLocalDate(r.from)} />
//         <Column header="To" body={(r: any) => toLocalDate(r.to)} />
//         <Column header="Type" field="type" />
//         <Column header="Days" field="days" />
//         <Column header="Status" field="status" />
//         <Column header="Reason" field="reason" />
//       </DataTable>
//     </div>
//   );
// }
// src/Dev/MyLeaves.tsx
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

/** Accept many possible shapes */
function findLeavesArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.LeaveRequests)) return data.LeaveRequests;
  if (Array.isArray(data.leaveRequests)) return data.leaveRequests;
  if (Array.isArray(data.leaves)) return data.leaves;
  if (data.data && Array.isArray(data.data.LeaveRequests))
    return data.data.LeaveRequests;
  if (data.data && Array.isArray(data.data.leaveRequests))
    return data.data.leaveRequests;
  for (const k of Object.keys(data)) {
    if (/leave/i.test(k) && Array.isArray((data as any)[k]))
      return (data as any)[k];
  }
  return [];
}

function normalize(r: any) {
  if (!r) return null;
  return {
    __raw: r,
    id: r.LeaveRequestID ?? r.LeaveRequestId ?? r.Id ?? null,
    employee: r.EmployeeCode ?? r.Employee ?? r.employeeCode ?? "",
    from: r.FromDate ?? r.fromDate ?? r.StartDate ?? null,
    to: r.ToDate ?? r.toDate ?? r.EndDate ?? null,
    type: r.LeaveType ?? r.Type ?? r.TypeName ?? "",
    days: r.Days ?? r.days ?? null,
    status: r.Status ?? r.status ?? null,
    reason: r.Reason ?? r.reason ?? null,
  };
}

/** Safe getter for Type — checks normalized type then common raw keys */
function safeGetType(row: any) {
  if (!row) return "—";
  if (typeof row.type === "string" && row.type.trim()) return row.type;
  const raw = row.__raw ?? row;
  const candidates = [
    "LeaveType",
    "Type",
    "TypeName",
    "leaveType",
    "type",
    "leave",
    "LeaveName",
  ];
  for (const k of candidates) {
    if (k in raw && raw[k]) {
      return String(raw[k]);
    }
  }
  return "—";
}

export default function MyLeaves() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const toastRef = useRef<Toast | null>(null);
  const employeeId = getEmployeeId();
  const employeeCode = getEmployeeCode();
  const roles = getRoles();
  const isPrivileged = roles.some((r) =>
    ["Admin", "HR", "Manager"].includes(r)
  );

  const load = async (status?: string) => {
    setLoading(true);
    try {
      const payload: any = {};
      if (!isPrivileged) {
        if (employeeId) payload.EmployeeID = employeeId;
        else if (employeeCode) payload.EmployeeCode = employeeCode;
      }
      if (status) payload.Status = status;

      const res = await api.post("/LeaveRequests/GetAll", payload);
      console.log("MyLeaves/GetAll response:", res?.data);

      const arr = findLeavesArray(res?.data ?? res);
      const mapped = arr.map(normalize).filter(Boolean);
      setRows(mapped);
    } catch (err: any) {
      console.error("MyLeaves load error:", err);
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
    // don't return a Promise directly from useEffect
    load().catch((e) => console.error("MyLeaves load() failed:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <Toast ref={toastRef} />
      <h3>My Leaves</h3>
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <Button label="Refresh" icon="pi pi-refresh" onClick={() => load()} />
        <Button
          label="Pending"
          onClick={() => load("Pending")}
          className="p-button-text"
        />
        <Button
          label="Approved"
          onClick={() => load("Approved")}
          className="p-button-text"
        />
      </div>

      <DataTable
        value={rows}
        loading={loading}
        paginator
        rows={10}
        emptyMessage="No leave requests found."
      >
        {isPrivileged && (
          <Column header="Employee" body={(r: any) => r.employee ?? "—"} />
        )}
        <Column header="From" body={(r: any) => toLocalDate(r.from)} />
        <Column header="To" body={(r: any) => toLocalDate(r.to)} />

        {/* IMPORTANT: use body renderer so we can probe multiple keys */}
        <Column header="Type" body={(r: any) => safeGetType(r)} />

        <Column header="Days" field="days" />
        <Column header="Status" field="status" />
        <Column header="Reason" field="reason" />
      </DataTable>
    </div>
  );
}
