// src/Dev/Dashboard.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Chart } from "primereact/chart";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { useDashboardData } from "./dashboardShared";

export default function Dashboard() {
  const navigate = useNavigate();
  const { modules, loading, lastFetched, headcountTrend, refresh } =
    useDashboardData(/* optional poll ms: e.g. 60000 */);

  // Colors chosen for good contrast and consistency with Prime theme
  const COLORS = [
    "#42A5F5",
    "#66BB6A",
    "#FFA726",
    "#AB47BC",
    "#FF7043",
    "#26C6DA",
    "#8D6E63",
  ];

  const donutData = useMemo(() => {
    const labels = modules.map((m) => m.title);
    const values = modules.map((m) => Math.max(0, Number(m.count || 0)));
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: COLORS.slice(0, labels.length),
          hoverOffset: 6,
        },
      ],
    };
  }, [modules]);

  const barData = useMemo(
    () => ({
      labels: modules.map((m) => m.title),
      datasets: [
        {
          label: "Entity Count",
          backgroundColor: COLORS[0],
          data: modules.map((m) => m.count),
        },
      ],
    }),
    [modules]
  );

  const sparkData = useMemo(
    () => ({
      labels: ["-5", "-4", "-3", "-2", "-1", "Now"],
      datasets: [
        {
          label: "Headcount",
          data: headcountTrend,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.06)",
          tension: 0.3,
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }),
    [headcountTrend]
  );

  const axisOpts = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  } as any;

  const sparkOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    elements: { point: { radius: 0 } },
  } as any;

  const totalCount = modules.reduce((s, m) => s + Number(m.count || 0), 0);

  return (
    <div className="dash-wrap" role="region" aria-label="Dashboard overview">
      <div className="header">
        <div>
          <h2>Analytics Overview</h2>
          <p className="muted">
            High-level HRMS metrics — access is role-based.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button
            icon="pi pi-refresh"
            onClick={() => refresh()}
            className="p-button-text"
            aria-label="Refresh dashboard"
          />
          {lastFetched ? (
            <div className="updated" aria-live="polite">
              Updated{" "}
              <strong>
                {lastFetched.toLocaleDateString()}{" "}
                {lastFetched.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="center">
          <div style={{ width: "100%", maxWidth: 1200 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: 12,
                }}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} height="84px" borderRadius="12px" />
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                <Skeleton height="260px" borderRadius="12px" />
                <Skeleton height="260px" borderRadius="12px" />
                <Skeleton height="260px" borderRadius="12px" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div
            className="kpi-grid"
            role="list"
            aria-label="Key performance indicators"
          >
            {modules.map((m) => (
              <div
                key={m.key}
                className="kpi-card"
                role="listitem"
                tabIndex={0}
                onClick={() => navigate(m.path)}
                onKeyDown={(e) => e.key === "Enter" && navigate(m.path)}
                aria-label={`${m.title}: ${m.count}`}
              >
                <div className="kpi-icon" aria-hidden>
                  <i className={m.icon} />
                </div>
                <div className="kpi-info">
                  <div className="kpi-value" data-testid={`kpi-${m.key}`}>
                    {m.count}
                  </div>
                  <div className="kpi-label">{m.title}</div>
                </div>
                <Tag value="View" className="kpi-cta" />
              </div>
            ))}

            {modules.length === 0 && (
              <div className="empty-note">
                You don’t have access to any dashboard modules. Contact your HR
                or system administrator for access.
              </div>
            )}
          </div>

          {/* Charts row */}
          {modules.length > 0 && (
            <div className="charts-grid" aria-hidden={totalCount === 0}>
              <div className="chart-card" aria-label="Distribution chart">
                <h4>Distribution</h4>

                {/* only show donut when there is at least one non-zero item */}
                {totalCount > 0 ? (
                  <Chart
                    type="doughnut"
                    data={donutData}
                    options={{ maintainAspectRatio: false }}
                  />
                ) : (
                  <div className="center" style={{ padding: 24 }}>
                    <div className="muted">No data to display</div>
                  </div>
                )}
              </div>

              <div className="chart-card">
                <h4>Counts by Module</h4>
                <Chart type="bar" data={barData} options={axisOpts} />
              </div>

              <div className="chart-card spark">
                <h4>Headcount Trend</h4>
                <Chart type="line" data={sparkData} options={sparkOpts} />
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .dash-wrap { padding: 1.25rem 1.25rem 2rem; max-width: 1200px; margin: 0 auto; }
        .muted { color: #6b7280; margin: 0; }
        .header { display: flex; justify-content: space-between; align-items: baseline; gap: .75rem; margin-bottom: .75rem; }
        .updated { color: #6b7280; font-size: .9rem; }
        .center { display: grid; place-items: center; padding: 1rem 0; }

        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: .9rem; margin-bottom: 1rem; }
        .kpi-card {
          display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .9rem;
          background: linear-gradient(180deg, #ffffff, #f9fbff);
          border: 1px solid #e9eef9; border-radius: 14px; padding: 1rem;
          box-shadow: 0 6px 18px rgba(0,0,0,.04);
          transition: transform .12s ease, box-shadow .12s ease;
          cursor: pointer; outline: none;
        }
        .kpi-card:focus { box-shadow: 0 10px 24px rgba(37,99,235,0.12); }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,.06); }
        .kpi-icon .pi { font-size: 1.5rem; color: var(--primary-600, #2563eb); }
        .kpi-value { font-size: 1.6rem; font-weight: 700; line-height: 1; }
        .kpi-label { color: #6b7280; margin-top: .2rem; }
        .kpi-cta { justify-self: end; }

        .charts-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
        .chart-card { background: #fff; border-radius: 14px; padding: .75rem; height: 360px; box-shadow: 0 4px 16px rgba(0,0,0,.04); display: grid; grid-template-rows: auto 1fr; }
        .chart-card h4 { margin: 0 0 .5rem 0; font-weight: 600; }
        .spark { height: 220px; }

        .empty-note { padding: .9rem; background: #f3f4f6; border-radius: 12px; color: #6b7280; grid-column: 1 / -1; }

        @media (max-width: 1200px) { .charts-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 860px) { .charts-grid { grid-template-columns: 1fr; } .kpi-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); } }
      `}</style>
    </div>
  );
}
