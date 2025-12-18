// src/Dev/PayrollList.tsx
import { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import api from "./api";
import { getEmployeeId, getEmployeeCode } from "./auth";

export default function PayrollList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useRef<any>(null);

  async function load() {
    setLoading(true);
    try {
      const payload: any = {};
      const empId = getEmployeeId();
      const empCode = getEmployeeCode();
      if (empId) payload.EmployeeId = empId;
      else if (empCode) payload.EmployeeCode = empCode;
      const res = await api.post("/PayrollSlips/GetAll", payload);
      const data = res?.data?.data ?? res?.data ?? {};
      let arr: any[] = [];
      if (Array.isArray(data)) arr = data;
      else if (Array.isArray((data as any).payrolls))
        arr = (data as any).payrolls;
      else {
        for (const k of Object.keys(data || {})) {
          if (Array.isArray((data as any)[k])) {
            arr = (data as any)[k];
            break;
          }
        }
      }
      setRows(arr || []);
    } catch (err: any) {
      console.error("Payroll/GetAll error", err);
      toast.current?.show({
        severity: "error",
        summary: "Load failed",
        detail: err?.message || "Network error",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const downloadPdf = async (row: any) => {
    if (!row.SlipId && !row.slipId && !row.SlipId) {
      toast.current?.show({
        severity: "warn",
        summary: "Missing",
        detail: "Slip id missing",
      });
      return;
    }
    const id = row.SlipId ?? row.slipId ?? row.SlipId;
    try {
      // Try endpoint streaming (you may need to implement server endpoint /PayrollSlips/DownloadPdf)
      const res = await api.post("/PayrollSlips/GetAll", { SlipId: id }, {
        responseType: "arraybuffer",
      } as any);
      // if server returns PDF bytes, download
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      toast.current?.show({
        severity: "error",
        summary: "Download failed",
        detail: err?.message || "No PDF available",
      });
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Toast ref={toast} />
      <h3>Payroll / Payslips</h3>
      <div style={{ marginBottom: 12 }}>
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          onClick={() => load()}
          className="p-button-outlined"
        />
      </div>

      <DataTable
        value={rows}
        loading={loading}
        paginator
        rows={10}
        emptyMessage="No payslips found"
      >
        <Column
          header="Year / Month"
          body={(r: any) => `${r.Year ?? r.year} / ${r.Month ?? r.month}`}
        />
        <Column header="Employee" field="EmployeeCode" />
        <Column header="Gross" field="GrossAmount" />
        <Column header="Net" field="NetAmount" />
        <Column
          header="Created"
          body={(r: any) =>
            r.CreatedAt ? new Date(r.CreatedAt).toLocaleString() : "—"
          }
        />
        <Column
          header="Actions"
          body={(r: any) => (
            <Button
              label="View PDF"
              icon="pi pi-file-pdf"
              onClick={() => downloadPdf(r)}
              className="p-button-text"
            />
          )}
        />
      </DataTable>
    </div>
  );
}
