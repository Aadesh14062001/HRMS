// src/Dev/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Divider } from "primereact/divider";
import { Skeleton } from "primereact/skeleton";
import { InputText } from "primereact/inputtext";

import  api  from "./api";
import { useDashboardData } from "./dashboardShared";
import { getRoles } from "./auth";

type EmployeeLite = {
  employeeId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string;
};

export default function Home() {
  const navigate = useNavigate();
  // only take the pieces we actually use
  const { modules, loading } = useDashboardData();

  // get display username from stored hrms_user (object or legacy string)
  const rawUser = localStorage.getItem("hrms_user");
  const username =
    (rawUser &&
      (() => {
        try {
          const parsed = JSON.parse(rawUser);
          if (parsed && typeof parsed === "object") {
            return (
              parsed.username ??
              parsed.userName ??
              parsed.EmployeeCode ??
              parsed.employeeCode ??
              parsed.FullName ??
              parsed.fullName ??
              "User"
            );
          }
          return String(parsed);
        } catch {
          return rawUser;
        }
      })()) ||
    "User";

  const roles = getRoles();
  const isAdminOrHR = roles.includes("Admin") || roles.includes("HR");

  // Announcements (example, replace with API later)
  const [announcements] = useState([
    { id: 1, title: "Diwali Holiday", detail: "Office closed on Nov 14." },
    {
      id: 2,
      title: "Policy Update",
      detail: "Updated leave policy effective Dec 1.",
    },
  ]);

  // Pending approvals (only visible to HR/Admin)
  const [pending, setPending] = useState<{ type: string; count: number }[]>([]);
  useEffect(() => {
    if (!isAdminOrHR) {
      setPending([]);
      return;
    }
    setPending([
      { type: "Leave Requests", count: 3 },
      { type: "Document Verifications", count: 2 },
      { type: "Timesheets", count: 5 },
    ]);
  }, [isAdminOrHR]);

  // Quick employee search
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<EmployeeLite[]>([]);
  const doSearch = async () => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await api.post("/EmpBasic_GetAll", { EmployeeId: 0 });
      const raw =
        r?.data?.data?.v_EmployeeBasicView ??
        r?.data?.data?.v_EmpBasicView ??
        r?.data?.data ??
        r?.data ??
        [];
      const list: EmployeeLite[] = (Array.isArray(raw) ? raw : [raw]).map(
        (x: any, idx: number) => ({
          employeeId: Number(
            x.EmployeeID ?? x.EmployeeId ?? x.employeeId ?? idx
          ),
          employeeCode: String(x.EmployeeCode ?? x.employeeCode ?? ""),
          firstName: String(x.FirstName ?? x.firstName ?? ""),
          lastName: String(x.LastName ?? x.lastName ?? ""),
          email: String(x.Email ?? x.email ?? ""),
        })
      );
      const lower = term.toLowerCase();
      const filtered = list
        .filter(
          (e) =>
            e.employeeCode.toLowerCase().includes(lower) ||
            e.firstName.toLowerCase().includes(lower) ||
            e.lastName.toLowerCase().includes(lower) ||
            (e.email || "").toLowerCase().includes(lower)
        )
        .slice(0, 6);
      setResults(filtered);
    } catch (e) {
      console.error("quick search error", e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const quick = useMemo(
    () =>
      [
        isAdminOrHR && {
          label: "Add Employee",
          icon: "pi pi-user-plus",
          path: "/EmployeeBasic",
        },
        isAdminOrHR && {
          label: "Employee Personal",
          icon: "pi pi-id-card",
          path: "/EmployeePersonal",
        },
        isAdminOrHR && {
          label: "Employee Documents",
          icon: "pi pi-folder",
          path: "/EmployeeDocuments",
        },
        {
          label: "Open Dashboard",
          icon: "pi pi-chart-line",
          path: "/Dashboard",
        },
      ].filter(Boolean) as { label: string; icon: string; path: string }[],
    [isAdminOrHR]
  );

  return (
    <div className="home-wrap">
      {/* Hero */}
      <section className="hero">
        <div>
          <h2>Welcome, {username}</h2>
          <p className="muted">
            Quick actions, announcements, and your modules — your access is
            tailored to your role.
          </p>

          <div className="hero-actions">
            {quick.map((q) => (
              <Button
                key={q.label}
                label={q.label}
                icon={q.icon}
                onClick={() => navigate(q.path)}
              />
            ))}
          </div>
        </div>

        <Card className="highlight-card">
          <div className="line">
            <i className="pi pi-shield" />
            <span>Role-based access control</span>
          </div>
          <div className="line">
            <i className="pi pi-bolt" />
            <span>PrimeReact UI for speed</span>
          </div>
          <div className="line">
            <i className="pi pi-check-circle" />
            <span>Centralized masters & records</span>
          </div>
        </Card>
      </section>

      <Divider />

      {/* Announcements + Approvals + Quick Search */}
      <section className="widgets">
        <Card className="w-card">
          <div className="w-head">
            <i className="pi pi-megaphone" />
            <h4>Announcements</h4>
          </div>
          <ul className="w-list">
            {announcements.map((a) => (
              <li key={a.id}>
                <strong>{a.title}:</strong>{" "}
                <span className="muted">{a.detail}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="w-card">
          <div className="w-head">
            <i className="pi pi-briefcase" />
            <h4>Pending Approvals</h4>
          </div>
          {isAdminOrHR ? (
            <ul className="w-list">
              {pending.map((p) => (
                <li key={p.type}>
                  {p.type} <span className="pill">{p.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="muted">No approvals assigned to your role.</div>
          )}
        </Card>

        <Card className="w-card">
          <div className="w-head">
            <i className="pi pi-search" />
            <h4>Quick Employee Search</h4>
          </div>
          <div className="qs">
            <InputText
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Search by code, name, or email"
              className="qs-input"
            />
            <Button
              label={searching ? "Searching..." : "Search"}
              onClick={doSearch}
            />
          </div>
          <div className="qs-results">
            {results.map((r) => (
              <div
                key={r.employeeId}
                className="qs-item"
                onClick={() => navigate("/EmployeeList")}
              >
                <i className="pi pi-user" />
                <div>
                  <div className="qs-name">
                    {r.firstName} {r.lastName}{" "}
                    <span className="muted">({r.employeeCode})</span>
                  </div>
                  <div className="muted">{r.email}</div>
                </div>
              </div>
            ))}
            {q && !searching && results.length === 0 && (
              <div className="muted">No matches. Try a different keyword.</div>
            )}
          </div>
        </Card>
      </section>

      <Divider />

      {/* Modules grid */}
      <section>
        <div className="section-head">
          <h3>Management Modules</h3>
        </div>

        {loading ? (
          <div className="card-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height="110px" borderRadius="14px" />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div className="empty-note">
            You don’t have access to any modules yet. Contact Admin.
          </div>
        ) : (
          <div className="card-grid">
            {modules.map((m) => (
              <div
                key={m.key}
                className="module-card"
                onClick={() => navigate(m.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && navigate(m.path)}
              >
                <div className="icon-wrapper">
                  <i className={m.icon}></i>
                </div>
                <div className="card-info">
                  <h3>{m.title}</h3>
                  <p className="muted">{m.count} items</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .home-wrap { padding: 1.25rem 1.25rem 2rem; }
        .muted { color: #6b7280; }

        .hero { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1rem; align-items: stretch; }
        .hero-actions { display: flex; gap: .6rem; margin-top: .75rem; flex-wrap: wrap; }
        .highlight-card { border-radius: 14px; display: grid; align-content: center; }
        .highlight-card .line { display: flex; align-items: center; gap: .5rem; padding: .4rem 0; }
        .highlight-card .pi { color: var(--primary-color, #2563eb); }

        .widgets { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: .9rem; }
        .w-card { border-radius: 14px; }
        .w-head { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; }
        .w-list { list-style: none; padding: 0; margin: 0; display: grid; gap: .4rem; }
        .pill { background: #eef2ff; color: #3730a3; padding: 0 .5rem; border-radius: 999px; font-weight: 600; margin-left: .4rem; }

        .qs { display: grid; grid-template-columns: 1fr auto; gap: .5rem; }
        .qs-input { width: 100%; }
        .qs-results { margin-top: .5rem; display: grid; gap: .4rem; }
        .qs-item { display: grid; grid-template-columns: auto 1fr; gap: .5rem; align-items: center; padding: .4rem .5rem; border-radius: 10px; cursor: pointer; }
        .qs-item:hover { background: #f9fafb; }
        .qs-name { font-weight: 600; }

        .section-head { margin: .25rem 0 .75rem; }
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: .9rem; }
        .module-card {
          display: grid; grid-template-columns: auto 1fr; align-items: center; gap: .9rem;
          border-radius: 14px; padding: .9rem 1rem; background: #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,.05); transition: transform .12s ease, box-shadow .12s ease;
          cursor: pointer; outline: none;
        }
        .module-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.08); }
        .icon-wrapper .pi { font-size: 1.3rem; color: var(--primary-600, #2563eb); }
        .card-info h3 { margin: 0; font-size: 1.05rem; }
        .card-info p { margin: 0; }

        @media (max-width: 980px) { .hero { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
