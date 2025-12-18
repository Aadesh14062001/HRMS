// src/Dev/dashboardShared.tsx
import { useEffect, useMemo, useState } from "react";
import  api  from "./api";
import { getRoles, isAuthed } from "./auth";

/**
 * Types & helpers
 */
export type Role = "Admin" | "HR" | "Manager";
export const isRole = (x: unknown): x is Role =>
  x === "Admin" || x === "HR" || x === "Manager";

export type ModuleKey =
  | "companies"
  | "branches"
  | "departments"
  | "subDepartments"
  | "designations"
  | "positions"
  | "employees";

export const labelFor: Record<ModuleKey, string> = {
  companies: "Companies",
  branches: "Branches",
  departments: "Departments",
  subDepartments: "Sub-Departments",
  designations: "Designations",
  positions: "Positions",
  employees: "Employees",
};

export const iconFor: Record<ModuleKey, string> = {
  companies: "pi pi-building",
  branches: "pi pi-map-marker",
  departments: "pi pi-sitemap",
  subDepartments: "pi pi-clone",
  designations: "pi pi-id-card",
  positions: "pi pi-briefcase",
  employees: "pi pi-users",
};

export const pathFor: Record<ModuleKey, string> = {
  companies: "/CompanyList",
  branches: "/BranchList",
  departments: "/DepartmentList",
  subDepartments: "/SubDepartmentList",
  designations: "/DesignationList",
  positions: "/PositionList",
  employees: "/EmployeeList",
};

/**
 * REQUIRED_ROLES controls which roles may *see* the module card.
 * Keep this minimal & conservative: only roles listed may see the module.
 * Employees typically should NOT see masters (companies/branches/etc).
 */
export const REQUIRED_ROLES: Record<ModuleKey, Role[]> = {
  companies: ["Admin", "HR"],
  branches: ["Admin", "HR"],
  departments: ["Admin", "HR"],
  subDepartments: ["Admin", "HR"],
  designations: ["Admin", "HR"],
  positions: ["Admin", "HR"],
  employees: ["Admin", "HR", "Manager"],
};

const arrLen = (v: any) => (Array.isArray(v) ? v.length : v ? 1 : 0);

/**
 * Robust extractor for many response shapes returned by your backend.
 * Accepts: { data: { v_View: [...] } }, { data: [...] }, [...], { ...singleObject }, null/undefined
 * Returns: array (possibly empty)
 */
const extractList = (res: any): any[] => {
  if (!res) return [];
  // Common shape: axios response => res.data
  const payload = res?.data ?? res;

  if (!payload) return [];

  // If payload is array already
  if (Array.isArray(payload)) return payload;

  // If payload is an object with keys; try to find an array inside
  if (typeof payload === "object") {
    // common internal shapes: { data: { v_View: [...] } } or { v_View: [...] }
    // If payload itself contains an array field, prefer the first array we find (v_* views typically)
    for (const k of Object.keys(payload)) {
      const v = payload[k];
      if (Array.isArray(v)) return v;
    }

    // if payload has a nested .data that is an array
    if (payload.data && Array.isArray(payload.data)) return payload.data;

    // if payload has object with single item -> treat as single-element list
    return Object.keys(payload).length ? [payload] : [];
  }

  return [];
};

export type Counts = Record<ModuleKey, number>;

export function useDashboardData(pollIntervalMs = 0) {
  // roles filtered to our Role type (ignore any extra roles)
  const userRoles = (getRoles() || []).filter(isRole);
  const authed = isAuthed();

  const [counts, setCounts] = useState<Counts>({
    companies: 0,
    branches: 0,
    departments: 0,
    subDepartments: 0,
    designations: 0,
    positions: 0,
    employees: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [failed, setFailed] = useState(false);

  // quick mockable headcount trend (6 historical points). Real implementation
  // should come from a dedicated endpoint; here we synthesize friendly numbers.
  const headcountTrend = useMemo(() => {
    const base = Math.max(5, counts.employees);
    return Array.from({ length: 6 }, (_, i) =>
      Math.max(0, Math.round(base * (0.6 + i * 0.08)))
    );
  }, [counts.employees]);

  // Check if the current user can see a given module.
  const canSee = (key: ModuleKey) =>
    REQUIRED_ROLES[key].some((r) => userRoles.includes(r));

  const visibleKeys = (Object.keys(counts) as ModuleKey[]).filter(canSee);

  // Core fetch function
  const fetchCounts = async () => {
    if (!authed) return;
    setLoading(true);
    setFailed(false);
    try {
      // Parallel calls to minimize latency
      const [
        companyRes,
        branchRes,
        deptRes,
        subDeptRes,
        desigRes,
        posRes,
        empRes,
      ] = await Promise.all([
        api
          .post("/Company_GetAll", { CompanyID: 0 })
          .catch((e) => e?.response ?? null),
        api
          .post("/Branches_GetAll", { BranchID: 0 })
          .catch((e) => e?.response ?? null),
        api
          .post("/Department_GetAll", { DepartmentID: 0 })
          .catch((e) => e?.response ?? null),
        api
          .post("/SubDepartment_GetAll", { SubDepartmentID: 0 })
          .catch((e) => e?.response ?? null),
        api
          .post("/Designation_GetAll", { DesignationId: 0 })
          .catch((e) => e?.response ?? null),
        api
          .post("/Position_GetAll", { PositionId: 0 })
          .catch((e) => e?.response ?? null),
        api
          .post("/EmpBasic_GetAll", { EmployeeId: 0 })
          .catch((e) => e?.response ?? null),
      ]);

      const companiesRaw = extractList(companyRes);
      const branchesRaw = extractList(branchRes);
      const deptsRaw = extractList(deptRes);
      const subDeptsRaw = extractList(subDeptRes);
      const desigsRaw = extractList(desigRes);
      const posRaw = extractList(posRes);
      const empRaw = extractList(empRes);

      setCounts({
        companies: arrLen(companiesRaw),
        branches: arrLen(branchesRaw),
        departments: arrLen(deptsRaw),
        subDepartments: arrLen(subDeptsRaw),
        designations: arrLen(desigsRaw),
        positions: arrLen(posRaw),
        employees: arrLen(empRaw),
      });

      setLastFetched(new Date());
    } catch (err) {
      console.error("Dashboard fetchCounts error:", err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authed) return;

    // initial fetch
    fetchCounts();

    // optional polling: only if pollIntervalMs > 0 (caller chooses)
    let timer: number | undefined;
    if (pollIntervalMs > 0) {
      timer = window.setInterval(() => {
        fetchCounts();
      }, pollIntervalMs);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, pollIntervalMs]);

  // produce sanitized modules list (only the ones the user may see)
  const modules = useMemo(
    () =>
      visibleKeys.map((key) => ({
        key,
        title: labelFor[key],
        icon: iconFor[key],
        count: counts[key],
        path: pathFor[key],
      })),
    // visibleKeys and counts determine the UI
    [visibleKeys.join(","), JSON.stringify(counts)]
  );

  return {
    userRoles,
    counts,
    modules,
    loading,
    failed,
    lastFetched,
    headcountTrend,
    refresh: fetchCounts,
  } as const;
}
