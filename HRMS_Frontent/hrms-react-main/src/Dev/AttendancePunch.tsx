// src/Dev/AttendancePunch.tsx
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import api from "./api";

type ActionType = "checkin" | "checkout";

function getStoredUser(): any | null {
  try {
    const raw = localStorage.getItem("hrms_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function AttendancePunch(): JSX.Element {
  const [busyAction, setBusyAction] = useState<ActionType | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const toastRef = useRef<Toast | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (u) setUser(u);
  }, []);

  const fetchProfileIfMissing = useCallback(async () => {
    if (user) return user;
    try {
      const res = await api.get("/Employee/Profile");
      if (res?.data?.result) {
        const prof = res.data.data?.profile ?? res.data.data;
        if (prof) {
          localStorage.setItem("hrms_user", JSON.stringify(prof));
          setUser(prof);
          return prof;
        }
      }
    } catch (err) {
      // network/auth errors — leave user null
    }
    return null;
  }, [user]);

  const buildPayload = (prof: any | null, action: ActionType) => {
    const payload: any = { Action: action };

    if (prof) {
      // prefer numeric EmployeeID if present (case-insensitive)
      const id =
        prof.employeeId ??
        prof.EmployeeID ??
        prof.EmployeeId ??
        prof.UserId ??
        null;
      const code =
        prof.employeeCode ??
        prof.EmployeeCode ??
        prof.Username ??
        prof.username ??
        null;

      if (id) payload.EmployeeID = id;
      if (!id && code) payload.EmployeeCode = code;
    }

    return payload;
  };

  const doAction = useCallback(
    async (action: ActionType) => {
      setBusyAction(action);
      try {
        const prof = await fetchProfileIfMissing();

        const payload = buildPayload(prof, action);

        if (!payload.EmployeeID && !payload.EmployeeCode) {
          toastRef.current?.show({
            severity: "error",
            summary: "Missing identity",
            detail:
              "EmployeeID or EmployeeCode is required. Please login or set hrms_user in localStorage.",
            life: 6000,
          });
          return;
        }

        const res = await api.post("/Attendance/Insert", payload);

        if (res?.data?.result) {
          toastRef.current?.show({
            severity: "success",
            summary: action === "checkin" ? "Checked in" : "Checked out",
            detail: res.data.message ?? "Attendance recorded",
            life: 4000,
          });
        } else {
          toastRef.current?.show({
            severity: "warn",
            summary: "Failed",
            detail: res?.data?.message ?? "Server rejected request",
            life: 6000,
          });
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ??
          err?.response?.data ??
          err?.message ??
          "Network error";
        toastRef.current?.show({
          severity: "error",
          summary: "Error",
          detail: msg,
          life: 7000,
        });
      } finally {
        setBusyAction(null);
      }
    },
    [fetchProfileIfMissing]
  );

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <Toast ref={toastRef} />
      <h3>Attendance Punch</h3>

      <div style={{ display: "flex", gap: 12 }}>
        <Button
          aria-label="Check in"
          label="Check in"
          icon="pi pi-sign-in"
          onClick={() => doAction("checkin")}
          loading={busyAction === "checkin"}
          disabled={busyAction !== null && busyAction !== "checkin"}
        />

        <Button
          aria-label="Check out"
          label="Check out"
          icon="pi pi-sign-out"
          onClick={() => doAction("checkout")}
          loading={busyAction === "checkout"}
          disabled={busyAction !== null && busyAction !== "checkout"}
          className="p-button-secondary"
        />
      </div>

      <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
        <div>
          <strong>User:</strong>{" "}
          {user
            ? user.EmployeeCode ??
              user.employeeCode ??
              user.Username ??
              "Unknown"
            : "Not loaded"}
        </div>
        <div>
          <small>
            Tip: If your account info isn't showing, sign in again so the app
            can cache your profile.
          </small>
        </div>
      </div>
    </div>
  );
}
