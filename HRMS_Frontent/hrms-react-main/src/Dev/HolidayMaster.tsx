// src/Dev/HolidayMaster.tsx
import { useEffect, useRef, useState } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import api from "./api";

export default function HolidayMaster() {
  const [holidayDate, setHolidayDate] = useState<Date | null>(null);
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useRef<any>(null);

  useEffect(() => {
    document.title = "Manage Holidays";
  }, []);

  const onSubmit = async (e?: any) => {
    e?.preventDefault();
    if (!holidayDate || !description.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Date & description required",
        life: 3000,
      });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        HolidayDate: holidayDate.toISOString().slice(0, 10),
        Description: description.trim(),
        IsRecurring: isRecurring,
        Country: country || null,
      };
      const res = await api.post("/Holiday/Insert", payload);
      if (res?.data?.result) {
        toast.current?.show({
          severity: "success",
          summary: "Saved",
          detail: "Holiday created",
          life: 3000,
        });
        setDescription("");
        setHolidayDate(null);
        setIsRecurring(false);
        setCountry("");
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: res?.data?.message || "Save failed",
        });
      }
    } catch (err: any) {
      toast.current?.show({
        severity: "error",
        summary: "Network",
        detail: err?.message || "Error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Toast ref={toast} />
      <h3>Manage Holiday</h3>
      <Card className="p-4">
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="p-mr-2">Holiday Date</label>
            <Calendar
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.value as Date)}
              dateFormat="yy-mm-dd"
              showIcon
            />
          </div>

          <div>
            <label>Description</label>
            <InputText
              value={description}
              onChange={(e) => setDescription((e.target as any).value)}
              className="w-full"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Checkbox
              inputId="rec"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(!!(e as any).checked)}
            />
            <label htmlFor="rec">Recurring</label>
            <InputText
              placeholder="Country (optional)"
              value={country}
              onChange={(e) => setCountry((e.target as any).value)}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Button
              type="submit"
              label={busy ? "Saving..." : "Save"}
              icon="pi pi-save"
              disabled={busy}
            />
            <Button
              type="button"
              label="Clear"
              className="p-button-secondary"
              onClick={() => {
                setDescription("");
                setHolidayDate(null);
                setIsRecurring(false);
                setCountry("");
              }}
            />
          </div>
        </form>
      </Card>
    </div>
  );
}
