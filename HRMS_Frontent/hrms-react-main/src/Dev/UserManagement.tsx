
import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { MultiSelect } from "primereact/multiselect";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { isAdmin, isHR, getUsername, getUser } from "./auth";
import  api  from "./api";

type UserRow = {
  userId: number;
  username: string;
  isActive: boolean;
  roles: string; // CSV from server
};

const ALL_ROLES = ["Admin", "HR", "Manager", "Employee"];

export default function UserManagement() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isActiveState, setIsActiveState] = useState(true);
  const [roles, setRoles] = useState<string[]>(["HR"]);
  const [msg, setMsg] = useState<string | null>(null);

  const currentUsername =
    getUsername() ??
    (typeof getUser === "function" ? getUser()?.username : null);

  const canCreate = isAdmin();
  const canSetPassword = isAdmin() || isHR();
  const canManageRoles = isAdmin();
  const canToggleActive = isAdmin();

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const r = await api.post("/Users/GetAll", {});
      const data = r?.data?.data ?? r?.data ?? [];
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data)
        ? data
        : data
        ? data
        : [];
      // server returns array of objects (UserId, Username, IsActive, Roles CSV)
      setRows(
        (list as any[]).map((x: any) => ({
          userId: Number(x.UserId ?? x.userId ?? x.Id ?? 0),
          username: String(x.Username ?? x.username ?? ""),
          isActive:
            (x.IsActive ?? x.isActive ?? true) === true ||
            (x.IsActive ?? x.isActive) === 1,
          roles: Array.isArray(x.Roles)
            ? (x.Roles as string[]).join(",")
            : String(x.Roles ?? x.roles ?? ""),
        }))
      );
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e.message || "Load failed");
      setRows([]);
      console.error("Load users error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createUser = async () => {
    setMsg(null);
    try {
      if (!canCreate) {
        setMsg("Not allowed to create users.");
        return;
      }
      if (!username.trim() || !password) {
        setMsg("Username and password required.");
        return;
      }
      await api.post("/Users/Create", {
        username: username.trim(),
        password,
        isActive: isActiveState,
        roles,
      });
      setMsg("User created.");
      setUsername("");
      setPassword("");
      setIsActiveState(true);
      setRoles(["HR"]);
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e.message || "Create failed");
    }
  };

  const setUserPassword = async (u: string) => {
    if (!canSetPassword) {
      setMsg("Not permitted to change password.");
      return;
    }
    const pwd = prompt(`New password for ${u}?`);
    if (!pwd) return;
    try {
      await api.post("/Users/SetPassword", { username: u, password: pwd });
      setMsg("Password updated.");
    } catch (e: any) {
      setMsg(
        e?.response?.data?.message || e.message || "Password update failed"
      );
    }
  };

  const toggleActive = async (userId: number) => {
    if (!canToggleActive) {
      setMsg("Not permitted to change status.");
      return;
    }
    try {
      await api.post("/Users/ToggleActive", { userId });
      setMsg("Status updated.");
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e.message || "Toggle failed");
    }
  };

  const setRolesFor = async (u: string) => {
    if (!canManageRoles) {
      setMsg("Not permitted to manage roles.");
      return;
    }
    const current =
      rows
        .find((r) => r.username === u)
        ?.roles?.split(",")
        .map((s) => s.trim()) ?? [];
    const newCsv = prompt(
      `Roles for ${u} (comma separated: Admin,HR,Manager,Employee):`,
      current.join(",")
    );
    if (newCsv == null) return;
    const parsed = newCsv
      .split(",")
      .map((s) => s.trim())
      .filter((s) => ALL_ROLES.includes(s));
    try {
      await api.post("/Users/SetRoles", { username: u, roles: parsed });
      setMsg("Roles updated.");
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e.message || "Set roles failed");
    }
  };

  return (
    <div
      className="card"
      style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}
    >
      <h2>User Management</h2>

      <div style={{ marginBottom: 12, color: "#6b7280" }}>
        Signed in as: <strong>{currentUsername ?? "—"}</strong>
      </div>

      {canCreate ? (
        <div
          className="p-fluid p-formgrid p-grid"
          style={{ gap: 12, marginBottom: 12 }}
        >
          <span
            className="p-inputgroup"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <span className="p-inputgroup-addon">Username</span>
            <InputText
              value={username}
              onChange={(e) => setUsername((e.target as any).value)}
            />
          </span>

          <span
            className="p-inputgroup"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <span className="p-inputgroup-addon">Password</span>
            <InputText
              type="password"
              value={password}
              onChange={(e) => setPassword((e.target as any).value)}
            />
          </span>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Checkbox
              inputId="active"
              checked={isActiveState}
              onChange={(e) => setIsActiveState(!!(e as any).checked)}
            />
            <label htmlFor="active" style={{ marginRight: 8 }}>
              Active
            </label>

            <MultiSelect
              value={roles}
              options={ALL_ROLES.map((r) => ({ label: r, value: r }))}
              onChange={(e) => setRoles(e.value)}
              placeholder="Select roles"
              display="chip"
              style={{ minWidth: 250 }}
            />

            <Button
              label="Create User"
              icon="pi pi-plus"
              onClick={createUser}
            />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12, color: "#6b7280" }}>
          Only Admins can create users.
        </div>
      )}

      {msg && <div style={{ marginTop: 10, color: "#2563eb" }}>{msg}</div>}

      <div className="card" style={{ marginTop: 20 }}>
        <DataTable
          value={rows}
          loading={loading}
          stripedRows
          paginator
          rows={10}
        >
          <Column
            field="userId"
            header="ID"
            style={{ width: 80 }}
            body={(r: UserRow) => r.userId}
          />
          <Column
            field="username"
            header="Username"
            body={(r: UserRow) => r.username}
          />
          <Column
            field="isActive"
            header="Active"
            body={(r: UserRow) => (r.isActive ? "Yes" : "No")}
          />
          <Column field="roles" header="Roles" body={(r: UserRow) => r.roles} />
          <Column
            header="Actions"
            body={(r: UserRow) => (
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  label="Set Password"
                  icon="pi pi-key"
                  className="p-button-sm"
                  onClick={() => setUserPassword(r.username)}
                  disabled={!canSetPassword}
                />
                <Button
                  label="Roles"
                  icon="pi pi-users"
                  className="p-button-sm p-button-secondary"
                  onClick={() => setRolesFor(r.username)}
                  disabled={!canManageRoles}
                />
                <Button
                  label={r.isActive ? "Deactivate" : "Activate"}
                  icon="pi pi-power-off"
                  className="p-button-sm p-button-warning"
                  onClick={() => toggleActive(r.userId)}
                  disabled={!canToggleActive}
                />
              </div>
            )}
          />
        </DataTable>
      </div>
    </div>
  );
}
