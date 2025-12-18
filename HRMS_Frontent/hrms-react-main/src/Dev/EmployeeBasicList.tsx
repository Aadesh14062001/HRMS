// src/Dev/EmployeeBasicList.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Column,
  DataTable,
  Button,
  Toast,
} from "../primereact-components/primeImport";
import api from "./api";

interface EmployeeBasic {
  employeeId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string | null;
  contactNo: string;
  email: string;
  joinDate: string | null;
  status: boolean;
}

const EmployeeBasicList: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeBasic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const toastRef = useRef<any>(null);
  const navigate = useNavigate();

  const showToast = useCallback(
    (
      severity: "success" | "error" | "info" | "warn",
      summary: string,
      detail: string,
      life = 3000
    ) => toastRef.current?.show({ severity, summary, detail, life }),
    []
  );

  const formatDate = useCallback((s?: string | null) => {
    if (!s) return "";
    const plain = String(s);
    return plain.includes("T") ? plain.split("T")[0] : plain.substring(0, 10);
  }, []);

  const normalizeEmployees = useCallback(
    (arr: any[]): EmployeeBasic[] => {
      const input = Array.isArray(arr) ? arr : arr ? [arr] : [];
      const pick = (obj: any, keys: string[]) => {
        for (const key of keys) {
          if (obj?.[key] !== undefined) return obj[key];
          const camel = key[0].toLowerCase() + key.slice(1);
          if (obj?.[camel] !== undefined) return obj[camel];
          const pascal = key[0].toUpperCase() + key.slice(1);
          if (obj?.[pascal] !== undefined) return obj[pascal];
        }
        return undefined;
      };

      return input.map((e: any) => ({
        employeeId: Number(
          pick(e, ["EmployeeID", "EmployeeId", "employeeId"]) || 0
        ),
        employeeCode: String(pick(e, ["EmployeeCode", "employeeCode"]) || ""),
        firstName: String(pick(e, ["FirstName", "firstName"]) || ""),
        lastName: String(pick(e, ["LastName", "lastName"]) || ""),
        gender: String(pick(e, ["Gender", "gender"]) || ""),
        dob: formatDate(
          pick(e, ["DOB", "Dob", "dob", "DateOfBirth", "dateOfBirth"]) || null
        ),
        contactNo: String(pick(e, ["ContactNo", "Phone", "contactNo"]) || ""),
        email: String(pick(e, ["Email", "email"]) || ""),
        joinDate: formatDate(
          pick(e, ["JoinDate", "joinDate", "DOJ", "doj"]) || null
        ),
        status:
          pick(e, ["Status", "status"]) === true ||
          pick(e, ["Status", "status"]) === 1 ||
          pick(e, ["Status", "status"]) === "1",
      }));
    },
    [formatDate]
  );

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // server expects { EmployeeId: 0 } to return all
      const res = await api.post("/EmpBasic_GetAll", { EmployeeId: 0 });

      // normalize possible payload shapes
      const payloadCandidates = [
        res?.data?.data?.V_EmployeeBasicView,
        res?.data?.data?.v_EmployeeBasicView,
        res?.data?.data?.V_EmpBasicView,
        res?.data?.data,
        res?.data,
      ];

      const result = payloadCandidates.find((p) => p !== undefined);

      if (!result) {
        showToast("warn", "No data", "Server returned no employee data");
        setEmployees([]);
        return;
      }

      const normalized = normalizeEmployees(result as any[]);
      setEmployees(normalized);
    } catch (err: any) {
      console.error("FetchEmployees error:", err);
      showToast(
        "error",
        "Error",
        err?.response?.data?.message || "Failed to load employees"
      );
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [normalizeEmployees, showToast]);

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusTemplate = (row: EmployeeBasic) => (
    <span
      className={`p-tag ${row.status ? "p-tag-success" : "p-tag-danger"}`}
      style={{ fontWeight: 600 }}
    >
      {row.status ? "Active" : "Inactive"}
    </span>
  );

  return (
    <div>
      <Toast ref={toastRef} />
      <h2>Employee Basic List</h2>

      <div className="card" style={{ minWidth: "100rem" }}>
        <DataTable
          value={employees}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 30]}
          stripedRows
          responsiveLayout="scroll"
        >
          <Column field="employeeId" header="ID" style={{ width: "6rem" }} />
          <Column field="employeeCode" header="Code" />
          <Column field="firstName" header="First Name" />
          <Column field="lastName" header="Last Name" />
          <Column field="gender" header="Gender" />
          <Column field="dob" header="DOB" />
          <Column field="contactNo" header="Contact No" />
          <Column field="email" header="Email" />
          <Column field="joinDate" header="Join Date" />
          <Column
            header="Status"
            body={statusTemplate}
            style={{ width: "8rem" }}
          />
        </DataTable>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        <Button
          label="Create Employee"
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate("/EmployeeBasic")}
        />
        <Button
          label="Back"
          icon="pi pi-arrow-left"
          className="p-button-secondary"
          onClick={() => navigate("/Home")}
        />
      </div>
    </div>
  );
};

export default EmployeeBasicList;
