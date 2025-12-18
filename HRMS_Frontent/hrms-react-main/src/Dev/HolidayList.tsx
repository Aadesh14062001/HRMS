// src/Dev/HolidayList.tsx
import { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import api from "./api";

type HolidayRow = {
  HolidayId?: number;
  HolidayDate?: string; // "2025-11-16" or ISO
  DayName?: string;
  Description?: string;
  IsRecurring?: boolean;
  Country?: string | null;
};

export default function HolidayList() {
  const toast = useRef<Toast | null>(null);
  const [rows, setRows] = useState<HolidayRow[]>([]);
  const [loading, setLoading] = useState(false);
  // removed unused setter to silence TS6133
  const [year] = useState<number>(new Date().getFullYear());

  const parseDate = (d?: any) => {
    if (!d) return null;
    // Accept DateOnly-like "yyyy-MM-dd" or ISO datetimes
    try {
      const s = String(d);
      // If string already contains "T", Date can parse it. If it's yyyy-mm-dd, append time to ensure no timezone shift.
      const iso = s.includes("T") ? s : `${s}T00:00:00`;
      const dt = new Date(iso);
      if (isNaN(dt.getTime())) return null;
      return dt;
    } catch {
      return null;
    }
  };

  async function load(y?: number) {
    setLoading(true);
    try {
      const payload = { Year: y ?? year };
      const res = await api.post("/Holiday/GetAll", payload);

      const data = res?.data?.data ?? res?.data ?? {};
      let arr: any[] = [];

      // backend returns { holidays: [...] }
      if (Array.isArray(data)) arr = data;
      else if (Array.isArray((data as any).holidays))
        arr = (data as any).holidays;
      else if (
        Array.isArray((data as any).Holiday) ||
        Array.isArray((data as any).HolidayList)
      ) {
        arr =
          (data as any).holidays ??
          (data as any).Holiday ??
          (data as any).HolidayList;
      } else {
        // fallback: find first array value
        for (const k of Object.keys(data || {})) {
          if (Array.isArray((data as any)[k])) {
            arr = (data as any)[k];
            break;
          }
        }
      }

      const mapped: HolidayRow[] = (arr || []).map((h: any) => {
        // Accept many shapes returned by different endpoints
        const id =
          h.HolidayId ??
          h.HolidayID ??
          h.holidayId ??
          h.holidayID ??
          h.id ??
          h.HolidayID;
        const rawDate =
          h.HolidayDate ??
          h.HolidayDateString ??
          h.date ??
          h.Date ??
          h.holidayDate ??
          h.holiday;
        const dt = parseDate(rawDate);
        const dateIso = dt
          ? dt.toISOString().split("T")[0]
          : typeof rawDate === "string"
          ? rawDate
          : undefined;
        const dayName = dt
          ? dt.toLocaleDateString(undefined, { weekday: "long" })
          : undefined;
        return {
          HolidayId: typeof id === "number" ? id : id ? Number(id) : undefined,
          HolidayDate: dateIso,
          DayName: dayName,
          Description:
            h.Description ?? h.description ?? h.Title ?? h.title ?? undefined,
          IsRecurring: !!(h.IsRecurring ?? h.isRecurring),
          Country: h.Country ?? h.country ?? null,
        };
      });

      setRows(mapped);
    } catch (err: any) {
      console.error("Holiday/GetAll error", err);
      toast.current?.show({
        severity: "error",
        summary: "Load failed",
        detail: err?.response?.data?.message || err?.message || "Network error",
        life: 5000,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function removeHoliday(id?: number) {
    if (!id) {
      toast.current?.show({
        severity: "warn",
        summary: "Delete",
        detail: "Invalid holiday id",
      });
      return;
    }
    if (!window.confirm("Delete this holiday?")) return;
    try {
      setLoading(true);
      // Your backend Delete expects body with HolidayId
      const res = await api.post("/Holiday/Delete", { HolidayId: id });
      if (res?.data?.result) {
        toast.current?.show({
          severity: "success",
          summary: "Deleted",
          detail: res.data.message || "Holiday deleted",
          life: 3000,
        });
        await load();
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Delete failed",
          detail: res?.data?.message || "Failed to delete",
          life: 5000,
        });
      }
    } catch (err: any) {
      console.error("Holiday/Delete error", err);
      toast.current?.show({
        severity: "error",
        summary: "Delete error",
        detail: err?.response?.data?.message || err?.message || "Network error",
        life: 6000,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((e) => {
      console.error("load() failed:", e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  return (
    <div style={{ padding: 16 }}>
      <Toast ref={toast} />
      <h3>Holiday List — {year}</h3>

      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          onClick={() => load()}
          className="p-button-outlined"
        />
        {/* future: year selector could go here */}
      </div>

      <DataTable
        value={rows}
        loading={loading}
        paginator
        rows={10}
        emptyMessage="No holidays found"
      >
        <Column
          header="Date"
          body={(r: HolidayRow) =>
            r.HolidayDate
              ? new Date(`${r.HolidayDate}T00:00:00`).toLocaleDateString()
              : "—"
          }
          sortable
        />
        <Column header="Day" field="DayName" />
        <Column header="Description" field="Description" />
        <Column
          header="Recurring"
          body={(r: HolidayRow) => (r.IsRecurring ? "Yes" : "No")}
        />
        <Column header="Country" field="Country" />
        <Column
          header="Actions"
          body={(r: HolidayRow) => (
            <>
              <Button
                icon="pi pi-trash"
                className="p-button-danger p-button-sm"
                onClick={() => removeHoliday(r.HolidayId)}
              />
            </>
          )}
        />
      </DataTable>
    </div>
  );
}
