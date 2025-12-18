import React, { useRef, useState } from "react";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import api from "./api";
import { getEmployeeCode, getEmployeeId, setUser } from "./auth";


const LEAVE_TYPES = [{ label: "Casual", value: "Casual" }, { label: "Sick", value: "Sick" }, { label: "Earned", value: "Earned" }];

function ymd(d: Date) { return d.toISOString().split("T")[0]; }

async function resolveEmployeeIdentity(toast?: React.RefObject<Toast>) {
  const id = getEmployeeId();
  const code = getEmployeeCode();
  if (id) return { EmployeeID: id };
  if (code) return { EmployeeCode: code };

  // fallback: hit profile endpoint
  try {
    const res = await api.get("/Employee/Profile");
    if (res?.data?.result) {
      const profile = res.data.data?.profile ?? res.data.data;
      if (profile) { setUser(profile); const pId = profile?.EmployeeID ?? profile?.EmployeeId ?? profile?.UserId; const pCode = profile?.EmployeeCode ?? profile?.Username ?? profile?.username; if (pId) return { EmployeeID: Number(pId) }; if (pCode) return { EmployeeCode: String(pCode) }; }
      toast?.current?.show?.({ severity: "warn", summary: "Profile", detail: "Profile loaded but no employee identity found.", life: 4000 });
    } else {
      toast?.current?.show?.({ severity: "warn", summary: "Profile", detail: res?.data?.message || "Unable to resolve identity", life: 4000 });
    }
  } catch (err: any) {
    toast?.current?.show?.({ severity: "error", summary: "Error", detail: err?.response?.data?.message || err?.message || "Network error", life: 5000 });
  }
  return null;
}

export default function LeaveRequestForm() {
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [type, setType] = useState<string>("Casual");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const toastRef = useRef<Toast | null>(null);

  const validate = () => {
    if (!from || !to) return "Select both from and to dates";
    if (from > to) return "From must be <= To";
    if (!reason.trim()) return "Provide a reason";
    return null;
  };

  const submit = async () => {
    const v = validate();
    if (v) { toastRef.current?.show({ severity: "warn", summary: "Validation", detail: v, life: 3000 }); return; }
    setBusy(true);
    try {
      const identity = await resolveEmployeeIdentity(toastRef as any);
      if (!identity) { toastRef.current?.show({ severity: "error", summary: "Missing Identity", detail: "Please login or set profile", life: 4000 }); setBusy(false); return; }
      const payload = { LeaveType: type, FromDate: ymd(from!), ToDate: ymd(to!), Reason: reason.trim(), ...identity };
      const res = await api.post("/LeaveRequests/Insert", payload);
      if (res?.data?.result) {
        toastRef.current?.show({ severity: "success", summary: "Submitted", detail: res.data.message || "Leave submitted", life: 3000 });
        setFrom(null); setTo(null); setReason("");
      } else {
        toastRef.current?.show({ severity: "error", summary: "Failed", detail: res?.data?.message || "Submit failed", life: 5000 });
      }
    } catch (err: any) {
      toastRef.current?.show({ severity: "error", summary: "Error", detail: err?.response?.data?.message || err.message || "Network error", life: 6000 });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <Toast ref={toastRef} />
      <h3>Apply Leave</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><label>From</label><Calendar value={from} onChange={(e:any)=>setFrom(e.value)} dateFormat="yy-mm-dd" /></div>
        <div><label>To</label><Calendar value={to} onChange={(e:any)=>setTo(e.value)} dateFormat="yy-mm-dd" /></div>
        <div><label>Type</label><Dropdown value={type} options={LEAVE_TYPES} onChange={(e:any)=>setType(e.value)} /></div>
        <div><label>Reason</label><InputText value={reason} onChange={(e:any)=>setReason(e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 12 }}><Button label={busy ? "Submitting..." : "Submit"} icon="pi pi-send" onClick={submit} disabled={busy} /></div>
    </div>
  );
}
