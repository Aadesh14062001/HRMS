// src/Dev/EmployeeProfile.tsx
import { useEffect, useRef, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import api from "./api";

type Profile = {
  Username?: string;
  username?: string;
  Roles?: string[] | string;
  roles?: string[] | string;
  UserId?: string | number | null;
  userId?: string | number | null;
  fullName?: string;
  email?: string;
  phone?: string;
  [k: string]: any;
};

export default function EmployeeProfile(): JSX.Element {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const toastRef = useRef<Toast | null>(null);
  const navigate = useNavigate();

  const showToast = (
    severity: "success" | "info" | "warn" | "error",
    summary: string,
    detail?: string
  ) => {
    toastRef.current?.show?.({ severity, summary, detail, life: 3500 });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/Employee/Profile");
        // Expecting { result: true/false, data: {...} }
        if (res?.data?.result) {
          if (!cancelled)
            setProfile(res.data.data?.profile ?? res.data.data ?? null);
        } else {
          const msg = res?.data?.message ?? "Failed to load profile";
          if (!cancelled) setError(msg);
          showToast("error", "Load failed", msg);
        }
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // session expired / unauthorized
          showToast("warn", "Session", "Please sign in again");
          // clear local session info and redirect to login
          localStorage.removeItem("hrms_token");
          localStorage.removeItem("hrms_user");
          localStorage.removeItem("hrms_roles");
          setTimeout(() => navigate("/Login", { replace: true }), 450);
        } else {
          const msg =
            err?.response?.data?.message ?? err?.message ?? "Network error";
          if (!cancelled) setError(msg);
          showToast("error", "Error", msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("hrms_token");
    localStorage.removeItem("hrms_user");
    localStorage.removeItem("hrms_roles");
    showToast("info", "Logged out", "You have been signed out");
    setTimeout(() => navigate("/Login", { replace: true }), 300);
  };

  const copyToClipboard = async (text?: string | number | null) => {
    if (!text) return showToast("warn", "Copy", "Nothing to copy");
    try {
      await navigator.clipboard.writeText(String(text));
      showToast("success", "Copied", String(text));
    } catch {
      showToast("error", "Copy failed", "Unable to copy to clipboard");
    }
  };

  const rolesArray = (p?: Profile | null): string[] => {
    if (!p) return [];
    const r = p.Roles ?? p.roles ?? [];
    if (!r) return [];
    if (Array.isArray(r)) return r.filter(Boolean).map(String);
    if (typeof r === "string")
      return r
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    return [];
  };

  return (
    <div style={{ padding: 16, maxWidth: 920, margin: "0 auto" }}>
      <Toast ref={toastRef} />

      <Card title="My Profile" className="p-mb-4">
        {loading ? (
          <div style={{ padding: 24 }}>Loading...</div>
        ) : error ? (
          <div style={{ color: "#b91c1c", padding: 12 }}>
            <div style={{ marginBottom: 8 }}>Error: {error}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                label="Retry"
                icon="pi pi-refresh"
                onClick={() => window.location.reload()}
              />
              <Button
                label="Logout"
                icon="pi pi-sign-out"
                className="p-button-secondary"
                onClick={logout}
              />
            </div>
          </div>
        ) : profile ? (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {/* Username */}
            <div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Username</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span>{profile.Username ?? profile.username ?? "—"}</span>
                <Button
                  icon="pi pi-copy"
                  className="p-button-text p-button-sm"
                  onClick={() =>
                    copyToClipboard(profile.Username ?? profile.username)
                  }
                />
              </div>
            </div>

            {/* UserId */}
            <div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>User ID</div>
              <div style={{ fontSize: 16 }}>
                {profile.UserId ?? profile.userId ?? "—"}
              </div>
            </div>

            {/* Full name */}
            <div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Full name</div>
              <div style={{ fontSize: 16 }}>
                {profile.fullName ?? profile.fullname ?? "—"}
              </div>
            </div>

            {/* Email */}
            <div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Email</div>
              <div
                style={{
                  fontSize: 16,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span>{profile.email ?? "—"}</span>
                {profile.email ? (
                  <Button
                    icon="pi pi-copy"
                    className="p-button-text p-button-sm"
                    onClick={() => copyToClipboard(profile.email)}
                  />
                ) : null}
              </div>
            </div>

            {/* Phone */}
            <div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Phone</div>
              <div style={{ fontSize: 16 }}>
                {profile.phone ?? profile.phoneNumber ?? "—"}
              </div>
            </div>

            {/* Roles */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Roles</div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {rolesArray(profile).length === 0 ? (
                  <span style={{ color: "#6b7280" }}>No roles assigned</span>
                ) : (
                  rolesArray(profile).map((r) => (
                    <span
                      key={r}
                      style={{
                        display: "inline-block",
                        marginRight: 8,
                        padding: "6px 10px",
                        background: "#eef2ff",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {r}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                gridColumn: "1 / -1",
                marginTop: 12,
                display: "flex",
                gap: 8,
              }}
            >
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                onClick={() => window.location.reload()}
              />
              <Button
                label="Logout"
                icon="pi pi-sign-out"
                className="p-button-secondary"
                onClick={logout}
              />
            </div>
          </div>
        ) : (
          <div>No profile data available</div>
        )}
      </Card>
    </div>
  );
}
