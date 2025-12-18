
import { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import api from "./api";
import {
  getUser,
  getToken,
  decodeJwtPayload,
  getEmployeeFromToken,
  getRoles,
} from "./auth";

/** helper to format date-like values */
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

/** Try to find the leaves array in any plausible shape */
function findLeavesArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.leaveRequests)) return data.leaveRequests;
  if (Array.isArray(data.LeaveRequests)) return data.LeaveRequests;
  if (data.data && Array.isArray(data.data.leaveRequests))
    return data.data.leaveRequests;
  if (data.data && Array.isArray(data.data.LeaveRequests))
    return data.data.LeaveRequests;

  for (const k of Object.keys(data)) {
    if (/leave/i.test(k) && Array.isArray((data as any)[k])) {
      return (data as any)[k];
    }
  }
  return [];
}

/** Normalize backend object */
function normalizeRow(r: any) {
  if (!r) return null;

  return {
    __raw: r,

    id:
      r.LeaveRequestID ??
      r.leaveRequestID ??
      r.LeaveRequestId ??
      r.leaveRequestId ??
      r.Id ??
      r.id ??
      null,

    employee:
      r.EmployeeCode ?? r.employeeCode ?? r.Employee ?? r.employee ?? "—",

    from: r.FromDate ?? r.fromDate ?? r.startDate ?? r.StartDate ?? null,

    to: r.ToDate ?? r.toDate ?? r.EndDate ?? r.endDate ?? null,

    type: r.LeaveType ?? r.leaveType ?? r.Type ?? r.type ?? "",

    days: r.Days ?? r.days ?? null,
    reason: r.Reason ?? r.reason ?? null,
  };
}

/** Resolve approver id */
function resolveApproverId(): number | null {
  try {
    const u = getUser();
    if (u && typeof u === "object") {
      const list = [u.UserId, u.userId, u.Id, u.id, u.UserID, u.userID];
      for (const v of list) {
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          const n = Number(v);
          if (!isNaN(n)) return n;
        }
      }
    }

    const token = getToken();
    if (token) {
      const payload: any = decodeJwtPayload(token);
      const list = [
        payload.UserId,
        payload.userId,
        payload.UserID,
        payload.userID,
        payload.sub,
        payload.username,
        payload.EmployeeID,
        payload.employeeId,
      ];
      for (const v of list) {
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          const n = Number(v);
          if (!isNaN(n)) return n;
        }
      }
    }

    const emp = getEmployeeFromToken();
    if (emp?.EmployeeID) return Number(emp.EmployeeID);
  } catch {}

  return null;
}

export default function LeaveApprovals() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const toastRef = useRef<Toast | null>(null);

  const roles = getRoles();
  const canApprove = roles.some((r) => ["Admin", "HR", "Manager"].includes(r));

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.post("/LeaveRequests/GetAll", {
        Status: "Pending",
      });
      const arr = findLeavesArray(res?.data ?? res);
      setRows(arr.map(normalizeRow).filter(Boolean));
    } catch (err: any) {
      toastRef.current?.show({
        severity: "error",
        summary: "Load failed",
        detail:
          err?.response?.data?.message ||
          err?.message ||
          "Could not load leave requests",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getRowId = (row: any): number | null => {
    if (!row) return null;
    if (row.id) return Number(row.id);

    const raw = row.__raw ?? row;
    const list = [
      raw.LeaveRequestID,
      raw.leaveRequestID,
      raw.LeaveRequestId,
      raw.leaveRequestId,
      raw.Id,
      raw.id,
    ];

    for (const v of list) {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        const n = Number(v);
        if (!isNaN(n)) return n;
      }
    }
    return null;
  };

  /** Approve/Reject the leave */
  const updateStatus = async (row: any, action: "Approve" | "Reject") => {
    const id = getRowId(row);
    if (!id) {
      toastRef.current?.show({
        severity: "error",
        summary: "Update failed",
        detail: "LeaveRequestID missing",
      });
      return;
    }

    const approverId = resolveApproverId();
    if (!approverId) {
      toastRef.current?.show({
        severity: "error",
        summary: "Update failed",
        detail: "ApproverId not found",
      });
      return;
    }

    const payload = {
      LeaveRequestID: id,
      Status: action === "Approve" ? "Approved" : "Rejected",
      ApproverId: approverId,
      ApproverRemarks: "",
    };

    try {
      const res = await api.post("/LeaveRequests/UpdateStatus", payload);

      if (res?.data?.result === false) {
        toastRef.current?.show({
          severity: "error",
          summary: "Update failed",
          detail: res.data?.message || "Request failed",
        });
        return;
      }

      toastRef.current?.show({
        severity: "success",
        summary: "Updated",
        detail: `Leave ${action}d successfully`,
      });

      load();
    } catch (err: any) {
      toastRef.current?.show({
        severity: "error",
        summary: "Update failed",
        detail: err?.response?.data?.message || err?.message || "Network error",
      });
    }
  };

  /** Approve / Reject buttons */
  const actionsBody = (row: any) => {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          label="Approve"
          className="p-button-success"
          onClick={() => updateStatus(row, "Approve")}
          disabled={!canApprove}
        />
        <Button
          label="Reject"
          className="p-button-danger p-button-outlined"
          onClick={() => updateStatus(row, "Reject")}
          disabled={!canApprove}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <Toast ref={toastRef} />

      <h3>Leave Approvals (Pending)</h3>

      <div style={{ marginBottom: 12 }}>
        <Button label="Refresh" icon="pi pi-refresh" onClick={load} />
      </div>

      <DataTable
        value={rows}
        loading={loading}
        paginator
        rows={10}
        emptyMessage="No leave requests"
      >
        <Column header="Employee" body={(r) => r.employee} />
        <Column header="From" body={(r) => toLocalDate(r.from)} />
        <Column header="To" body={(r) => toLocalDate(r.to)} />
        <Column header="Type" body={(r) => r.type} />
        <Column header="Days" body={(r) => r.days} />
        <Column header="Reason" body={(r) => r.reason} />
        <Column header="Actions" body={actionsBody} />
      </DataTable>
    </div>
  );
}
