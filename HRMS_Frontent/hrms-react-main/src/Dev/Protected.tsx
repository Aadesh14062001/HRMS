// src/Dev/Protected.tsx
import { Navigate, useLocation } from "react-router-dom";
import type { JSX } from "react";
import { getToken, hasAnyRole, isAuthed } from "./auth";

/**
 * Role-based route guard for HRMS Portal
 * - Validates session token
 * - Validates roles
 * - Redirects to /Login if not authenticated
 * - Displays a styled 403 message if insufficient permission
 */
export default function Protected({
  children,
  roles = [],
}: {
  children: JSX.Element;
  roles?: string[];
}) {
  const location = useLocation();

  // 1) Check authentication
  const token = getToken();
  if (!token || !isAuthed()) {
    return (
      <Navigate
        to="/Login"
        replace
        state={{ from: location.pathname }} // redirect back after login
      />
    );
  }

  // 2) Check role access (IF roles array is provided)
  if (roles.length > 0 && !hasAnyRole(roles)) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <h1
          style={{ fontSize: "28px", marginBottom: "12px", color: "#7f1d1d" }}
        >
          403 – Forbidden
        </h1>
        <p style={{ fontSize: "16px", color: "#6b7280" }}>
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  // 3) Allow access
  return children;
}
