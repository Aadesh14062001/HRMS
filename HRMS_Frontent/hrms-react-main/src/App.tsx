// src/App.tsx
import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";
import { PanelMenu } from "primereact/panelmenu";
import { PrimeReactProvider } from "primereact/api";
import PrimeReact from "primereact/api";
import type { MenuItem } from "primereact/menuitem";

import "./App.css";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

/* Pages in src/Dev */
import Home from "./Dev/Home";
import Dashboard from "./Dev/Dashboard";
import CompanyMaster from "./Dev/CompanyMaster";
import CompanyList from "./Dev/CompanyList";
import BranchMaster from "./Dev/BranchMaster";
import BranchList from "./Dev/BranchList";
import DepartmentMaster from "./Dev/Department";
import DepartmentList from "./Dev/DepartmentList";
import SubDepartmentMaster from "./Dev/SubDepartment";
import SubDepartmentList from "./Dev/SubDepartmentList";
import DesignationMaster from "./Dev/DesignationMaster";
import DesignationList from "./Dev/DesignationList";
import PositionMaster from "./Dev/PositionMaster";
import PositionList from "./Dev/PositionList";
import EmployeeBasicMaster from "./Dev/EmployeeBasicMaster";
import EmployeeBasicList from "./Dev/EmployeeBasicList";
import EmployeePersonalMaster from "./Dev/EmployeePersonalMaster";
import EmployeePersonalList from "./Dev/EmployeePersonalList";
import Login from "./Dev/Login";
import ResetPassword from "./Dev/ResetPassword";
import UserManagement from "./Dev/UserManagement";
import EmployeeProfile from "./Dev/EmployeeProfile";
import AdminProfileMenu from "./Dev/AdminProfileMenu";

/* Attendance & Leave pages */
import AttendancePunch from "./Dev/AttendancePunch";
import MyAttendance from "./Dev/MyAttendance";
import LeaveRequestForm from "./Dev/LeaveRequestForm";
import MyLeaves from "./Dev/MyLeaves";
import LeaveApprovals from "./Dev/LeaveApprovals";

/* NEW: Holiday & Payroll pages */
import HolidayList from "./Dev/HolidayList";
import PayrollList from "./Dev/PayrollList";
import HolidayMaster from "./Dev/HolidayMaster";
import PayrollUpload from "./Dev/PayrollUpload";

import {
  getRoles,
  getToken,
  logout,
  tokenExpired,
  isAuthed,
  hasAnyRole,
} from "./Dev/auth";
import type { JSX } from "react/jsx-runtime";

/* small helpers */
const getAuthTick = () =>
  (localStorage.getItem("hrms_token") ? 1 : 0) +
  (localStorage.getItem("hrms_user") ? 1 : 0);

function PrivateRoute({ element }: { element: JSX.Element }) {
  const location = useLocation();
  const token = getToken();
  if (!token || tokenExpired(token) || !isAuthed()) {
    return <Navigate to="/Login" replace state={{ from: location.pathname }} />;
  }
  return element;
}

function RoleRoute({
  element,
  roles,
}: {
  element: JSX.Element;
  roles: string[];
}) {
  const location = useLocation();
  const token = getToken();
  if (!token || tokenExpired(token) || !isAuthed()) {
    return <Navigate to="/Login" replace state={{ from: location.pathname }} />;
  }
  if (!hasAnyRole(roles)) return <Navigate to="/Home" replace />;
  return element;
}

/* LayoutInner: expects to run inside a Router (index.tsx provides it) */
function LayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setTick] = useState(getAuthTick());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        [
          "hrms_token",
          "hrms_user",
          "hrms_roles",
          "accessToken",
          "authUser",
        ].includes(e.key || "")
      ) {
        setTick((t) => t + 1);
      }
    };
    window.addEventListener("storage", onStorage);

    const i = setInterval(() => {
      const t = getToken();
      if (t && tokenExpired(t)) {
        logout();
        navigate("/Login", { replace: true });
      }
    }, 15_000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(i);
    };
  }, [navigate]);

  const roles = getRoles();
  const isAdmin = roles.includes("Admin");
  const isHR = roles.includes("HR");
  const isMgr = roles.includes("Manager");
  const isEmp = roles.includes("Employee");

  const inAuthFlow =
    location.pathname === "/" || location.pathname.toLowerCase() === "/login";

  const menuItems: MenuItem[] = [
    ...(isAdmin || isHR
      ? [
          {
            label: "Organization",
            icon: "pi pi-building",
            items: [
              {
                label: "Company Master",
                command: () => navigate("/CompanyMaster"),
              },
              { label: "Branch Master", command: () => navigate("/Branch") },
              {
                label: "Department Master",
                command: () => navigate("/Department"),
              },
              {
                label: "SubDepartment Master",
                command: () => navigate("/SubDepartment"),
              },
              {
                label: "Designation Master",
                command: () => navigate("/Designation"),
              },
              {
                label: "Position Master",
                command: () => navigate("/Position"),
              },
            ],
          },
        ]
      : []),

    ...(isAdmin || isHR || isMgr
      ? [
          {
            label: "Employee",
            icon: "pi pi-users",
            items: [
              {
                label: "Employee Basic Master",
                command: () => navigate("/EmployeeBasic"),
              },
              {
                label: "Employee Personal Master",
                command: () => navigate("/EmployeePersonal"),
              },
            ],
          },
        ]
      : []),

    ...(isAdmin || isHR || isMgr
      ? [
          {
            label: "Reports & Lists",
            icon: "pi pi-chart-bar",
            items: [
              {
                label: "Company List",
                command: () => navigate("/CompanyList"),
              },
              { label: "Branch List", command: () => navigate("/BranchList") },
              {
                label: "Department List",
                command: () => navigate("/DepartmentList"),
              },
              {
                label: "SubDepartment List",
                command: () => navigate("/SubDepartmentList"),
              },
              {
                label: "Designation List",
                command: () => navigate("/DesignationList"),
              },
              {
                label: "Position List",
                command: () => navigate("/PositionList"),
              },
              {
                label: "Employee List",
                command: () => navigate("/EmployeeList"),
              },
              {
                label: "Employee Personal List",
                command: () => navigate("/EmployeePersonalList"),
              },
            ],
          },
        ]
      : []),

    ...(isAdmin
      ? [
          {
            label: "Admin",
            icon: "pi pi-shield",
            items: [
              { label: "User Management", command: () => navigate("/Users") },
            ],
          },
        ]
      : []),

    {
      label: "Holidays",
      icon: "pi pi-calendar",
      items: [
        { label: "Holiday List", command: () => navigate("/HolidayList") },
        ...(isAdmin || isHR
          ? [
              {
                label: "Manage Holidays",
                command: () => navigate("/HolidayMaster"),
              },
            ]
          : []),
      ],
    } as MenuItem,

    {
      label: "Payroll",
      icon: "pi pi-money-bill",
      items: [
        { label: "Payslips", command: () => navigate("/PayrollList") },
        ...(isAdmin || isHR
          ? [
              {
                label: "Upload Payslip PDF",
                command: () => navigate("/PayrollUpload"),
              },
            ]
          : []),
      ],
    } as MenuItem,

    ...(isEmp || isMgr || isHR || isAdmin
      ? [
          {
            label: "My Employee",
            icon: "pi pi-user",
            items: [
              {
                label: "My Profile",
                command: () => navigate("/EmployeeProfile"),
              },
              {
                label: "My Attendance",
                command: () => navigate("/MyAttendance"),
              },
              {
                label: "Attendance Punch",
                command: () => navigate("/AttendancePunch"),
              },
              {
                label: "Apply Leave",
                command: () => navigate("/LeaveRequest"),
              },
              { label: "My Leaves", command: () => navigate("/MyLeaves") },
            ],
          },
        ]
      : []),

    ...(isMgr || isHR || isAdmin
      ? [
          {
            label: "Approvals",
            icon: "pi pi-check-circle",
            items: [
              {
                label: "Leave Approvals",
                command: () => navigate("/LeaveApprovals"),
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="app-root">
      {!inAuthFlow && (
        <nav className="nav">
          <h1 className="nav-title">Human Resource Management System</h1>
          <div className="nav-links">
            <Link to="/Home" className="nav-link">
              Home
            </Link>
            <Link to="/Dashboard" className="nav-link">
              Dashboard
            </Link>

            {/* Use the profile pill for all users (not a Link) */}
            <div style={{ marginLeft: 12 }}>
              <AdminProfileMenu />
            </div>
          </div>
        </nav>
      )}

      {!inAuthFlow ? (
        <div className="app-container">
          <aside className="sidebar">
            <PanelMenu model={menuItems} className="menu" />
          </aside>
          <main className="content">
            <Routes>
              <Route
                path="/Home"
                element={<PrivateRoute element={<Home />} />}
              />
              <Route
                path="/Dashboard"
                element={<PrivateRoute element={<Dashboard />} />}
              />
              <Route
                path="/CompanyMaster"
                element={
                  <RoleRoute
                    roles={["Admin", "HR"]}
                    element={<CompanyMaster />}
                  />
                }
              />
              <Route
                path="/Branch"
                element={
                  <RoleRoute
                    roles={["Admin", "HR"]}
                    element={<BranchMaster />}
                  />
                }
              />
              <Route
                path="/Department"
                element={
                  <RoleRoute
                    roles={["Admin", "HR"]}
                    element={<DepartmentMaster />}
                  />
                }
              />
              <Route
                path="/SubDepartment"
                element={
                  <RoleRoute
                    roles={["Admin", "HR"]}
                    element={<SubDepartmentMaster />}
                  />
                }
              />
              <Route
                path="/Designation"
                element={
                  <RoleRoute
                    roles={["Admin", "HR"]}
                    element={<DesignationMaster />}
                  />
                }
              />
              <Route
                path="/Position"
                element={
                  <RoleRoute
                    roles={["Admin", "HR"]}
                    element={<PositionMaster />}
                  />
                }
              />
              <Route
                path="/EmployeeBasic"
                element={
                  <RoleRoute
                    roles={["Admin", "HR", "Manager"]}
                    element={<EmployeeBasicMaster />}
                  />
                }
              />
              <Route
                path="/EmployeePersonal"
                element={
                  <RoleRoute
                    roles={["Admin", "HR", "Manager"]}
                    element={<EmployeePersonalMaster />}
                  />
                }
              />
              <Route
                path="/CompanyList"
                element={
                  <RoleRoute
                    roles={["Admin", "HR", "Manager"]}
                    element={<CompanyList />}
                  />
                }
              />
              <Route
                path="/BranchList"
                element={
                  <RoleRoute
                    roles={["Admin", "HR", "Manager"]}
                    element={<BranchList />}
                  />
                }
              />
              <Route
                path="/DepartmentList"
                element={
                  <RoleRoute
                    roles={["Admin", "HR", "Manager"]}
                    element={<DepartmentList />}
                  />
                }
              />
              <Route
                path="/SubDepartmentList"
                element={
                  <RoleRoute
                    roles={["Admin", "HR", "Manager"]}
                    element={<SubDepartmentList />}
                  />
                }
              />
              <Route
                path="/DesignationList"
                element={
                  <RoleRoute
                    roles={["Admin", "HR", "Manager"]}
                    element={<DesignationList />}
                  />
                }
              />
              <Route
                path="/PositionList"
                element={
                  <RoleRoute
                    roles={["Admin", "HR", "Manager"]}
                    element={<PositionList />}
                  />
                }
              />
              <Route
                path="/EmployeeList"
                element={
                  <RoleRoute
                    roles={["Admin", "HR", "Manager"]}
                    element={<EmployeeBasicList />}
                  />
                }
              />
              <Route
                path="/EmployeePersonalList"
                element={
                  <RoleRoute
                    roles={["Admin", "HR", "Manager"]}
                    element={<EmployeePersonalList />}
                  />
                }
              />
              <Route
                path="/Users"
                element={
                  <RoleRoute roles={["Admin"]} element={<UserManagement />} />
                }
              />
              <Route
                path="/EmployeeProfile"
                element={<PrivateRoute element={<EmployeeProfile />} />}
              />
              <Route
                path="/ResetPassword"
                element={<PrivateRoute element={<ResetPassword />} />}
              />
              <Route
                path="/AttendancePunch"
                element={<PrivateRoute element={<AttendancePunch />} />}
              />
              <Route
                path="/MyAttendance"
                element={<PrivateRoute element={<MyAttendance />} />}
              />
              <Route
                path="/LeaveRequest"
                element={<PrivateRoute element={<LeaveRequestForm />} />}
              />
              <Route
                path="/MyLeaves"
                element={<PrivateRoute element={<MyLeaves />} />}
              />
              <Route
                path="/LeaveApprovals"
                element={
                  <RoleRoute
                    roles={["Manager", "HR", "Admin"]}
                    element={<LeaveApprovals />}
                  />
                }
              />

              {/* Holiday & Payroll */}
              <Route
                path="/HolidayList"
                element={<PrivateRoute element={<HolidayList />} />}
              />
              <Route
                path="/HolidayMaster"
                element={
                  <RoleRoute
                    roles={["HR", "Admin"]}
                    element={<HolidayMaster />}
                  />
                }
              />
              <Route
                path="/PayrollList"
                element={<PrivateRoute element={<PayrollList />} />}
              />
              <Route
                path="/PayrollUpload"
                element={
                  <RoleRoute
                    roles={["HR", "Admin"]}
                    element={<PayrollUpload />}
                  />
                }
              />

              <Route path="*" element={<Navigate to="/Home" replace />} />
            </Routes>
          </main>
        </div>
      ) : (
        <main className="auth-content">
          <Routes>
            <Route path="/" element={<Navigate to="/Login" replace />} />
            <Route path="/Login" element={<Login />} />
            <Route path="*" element={<Navigate to="/Login" replace />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

/* App outer wrapper — DO NOT add another <BrowserRouter> here; index.tsx provides it */
PrimeReact.ripple = true;
PrimeReact.hideOverlaysOnDocumentScrolling = false;

export default function App() {
  return (
    <PrimeReactProvider value={{ hideOverlaysOnDocumentScrolling: false }}>
      <LayoutInner />
    </PrimeReactProvider>
  );
}
