// src/Dev/SalarySlip.tsx
import { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import api from "./api";
import { getEmployeeCode, getRoles, getEmployeeId } from "./auth";

type SlipMeta = {
  SlipId: number | string;
  Year: number;
  Month: number; // 1-12
  PeriodLabel?: string; // "Nov 2025"
  Gross?: number;
  Net?: number;
  Status?: string;
  EmployeeCode?: string;
};

export default function SalarySlip() {
  const toast = useRef<any>(null);
  const [rows, setRows] = useState<SlipMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPdf, setFetchingPdf] = useState(false);
  const roles = getRoles();
  const isAdmin = roles.includes("Admin") || roles.includes("HR");

  async function load() {
    setLoading(true);
    try {
      const payload: any = {};
      // non-admin: load slips only for current employee
      if (!isAdmin) {
        const emp = getEmployeeId();
        const code = getEmployeeCode();
        if (emp) payload.EmployeeID = emp;
        else if (code) payload.EmployeeCode = code;
      }
      // optional: year filter could be added
      const res = await api.post("/Payroll/GetAvailableSlips", payload);
      const data = res?.data?.data ?? res?.data ?? {};
      // Permissive: accept array at root or data.slips
      let arr: any[] = [];
      if (Array.isArray(data)) arr = data;
      else if (Array.isArray((data as any).slips)) arr = (data as any).slips;
      else if (Array.isArray((res?.data))) arr = res.data;
      else {
        // find first array-like property
        for (const k of Object.keys(data || {})) {
          if (Array.isArray((data as any)[k])) {
            arr = (data as any)[k];
            break;
          }
        }
      }
      const mapped: SlipMeta[] = (arr || []).map((r: any) => ({
        SlipId: r.SlipId ?? r.slipId ?? r.id ?? r.SlipID,
        Year: r.Year ?? r.year ?? (r.Period ? new Date(r.Period).getFullYear() : undefined),
        Month: r.Month ?? r.month ?? (r.Period ? new Date(r.Period).getMonth() + 1 : undefined),
        PeriodLabel: r.PeriodLabel ?? r.periodLabel ?? r.Period ?? (r.Year && r.Month ? `${r.Month}/${r.Year}` : undefined),
        Gross: r.Gross ?? r.gross,
        Net: r.Net ?? r.net,
        Status: r.Status ?? r.status ?? "OK",
        EmployeeCode: r.EmployeeCode ?? r.employeeCode,
      }));
      setRows(mapped);
    } catch (err: any) {
      console.error("Payroll/GetAvailableSlips error", err);
      toast.current?.show({ severity: "error", summary: "Load failed", detail: err?.response?.data?.message || err?.message || "Network error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((e) => console.error(e));
  }, []);

  async function downloadSlip(s: SlipMeta) {
    if (!s?.SlipId) {
      toast.current?.show({ severity: "error", summary: "Missing", detail: "SlipId is missing" });
      return;
    }
    setFetchingPdf(true);
    try {
      // endpoint should return application/pdf as blob
      // using GET with query is fine if your server supports it
      const res = await api.get(`/Payroll/GetSlip`, { params: { slipId: s.SlipId }, responseType: "blob" });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      // open in new tab
      window.open(url, "_blank");
      // optional auto-download:
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `SalarySlip-${s.PeriodLabel || s.SlipId}.pdf`;
      // a.click();
      // URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("GetSlip error", err);
      toast.current?.show({ severity: "error", summary: "Download failed", detail: err?.response?.data?.message || err?.message || "Network error" });
    } finally {
      setFetchingPdf(false);
    }
  }

  function monthLabel(r: SlipMeta) {
    if (r.PeriodLabel) return r.PeriodLabel;
    if (r.Month && r.Year) {
      return new Date(r.Year, r.Month - 1, 1).toLocaleString(undefined, { month: "short", year: "numeric" });
    }
    return "-";
  }

  return (
    <div style={{ padding: 16 }}>
      <Toast ref={toast} />
      <h3>Salary Slips</h3>

      <DataTable value={rows} loading={loading} paginator rows={10} emptyMessage="No salary slips available">
        {isAdmin && <Column header="Employee" body={(r: any) => r.EmployeeCode ?? "—"} />}
        <Column header="Period" body={(r: any) => monthLabel(r)} />
        <Column header="Gross" body={(r: any) => (r.Gross != null ? r.Gross : "—")} />
        <Column header="Net" body={(r: any) => (r.Net != null ? r.Net : "—")} />
        <Column header="Status" body={(r: any) => r.Status ?? "—"} />
        <Column
          header="Actions"
          body={(r: SlipMeta) => (
            <div style={{ display: "flex", gap: 8 }}>
              <Button label="View / Download" icon="pi pi-file-pdf" onClick={() => downloadSlip(r)} disabled={fetchingPdf} />
            </div>
          )}
        />
      </DataTable>
    </div>
  );
}
