// src/Dev/AdminProfileMenu.tsx
import  { useRef, useMemo, useCallback, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import { getRoles, getUsername, logout } from "./auth"; // adjust path if auth.ts is elsewhere

export default function AdminProfileMenu(): JSX.Element {
  const menuRef = useRef<any>(null); // primereact Menu ref typing is a bit awkward; using any is pragmatic
  const navigate = useNavigate();

  const username = getUsername() ?? "User";
  const roles = getRoles() ?? []; // ensure array even if auth returns null/undefined

  // show Reset Password only to Admin or HR
  const isAdminOrHR = roles.includes("Admin") || roles.includes("HR");

  // keep commands stable across renders
  const goToProfile = useCallback(() => navigate("/EmployeeProfile"), [navigate]);
  const goToResetPassword = useCallback(() => navigate("/ResetPassword"), [navigate]);
  const doLogout = useCallback(() => {
    try {
      logout();
    } catch {
      // swallow any logout errors — but still navigate to login
    } finally {
      navigate("/Login", { replace: true });
    }
  }, [navigate]);

  // memoize menu items so PrimeReact doesn't rerender unnecessarily
  const items = useMemo(() => {
    const base = [
      {
        label: "My Profile",
        icon: "pi pi-user",
        command: () => goToProfile(),
      },
    ] as any[];

    if (isAdminOrHR) {
      base.push({
        label: "Reset Password",
        icon: "pi pi-key",
        command: () => goToResetPassword(),
      });
    }

    base.push({ separator: true });

    base.push({
      label: "Logout",
      icon: "pi pi-sign-out",
      command: () => doLogout(),
    });

    return base;
  }, [isAdminOrHR, goToProfile, goToResetPassword, doLogout]);

  // generate a stable id for accessibility
  const menuId = "admin-profile-menu";

  return (
    <div
      className="admin-profile"
      style={{ display: "inline-block", marginLeft: 12 }}
    >
      <Menu id={menuId} model={items} popup ref={menuRef} />
      <Button
        icon="pi pi-user"
        label={username}
        className="p-button-text"
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={(e) => menuRef.current?.toggle(e)}
      />
    </div>
  );
}
