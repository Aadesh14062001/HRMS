import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Column,
  DataTable,
  Button,
} from "../primereact-components/primeImport";
import api  from "./api"; // ✅ Authenticated Axios instance

interface Department {
  departmentId: number;
  name: string;
  code: string;
  description: string;
  companyId: number;
  branchId: number;
  head: string;
  status: "Active" | "Inactive";
  createdDate: string;
  updatedDate: string;
}

const DepartmentList = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await api.post("/Department_GetAll", {
          DepartmentID: 0,
        });

        const result = data?.data?.v_DepartmentView;
        const list = Array.isArray(result) ? result : result ? [result] : [];

        if (alive) setDepartments(list as Department[]);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load departments");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <h2>Department List</h2>

      {err && <div style={{ color: "#e74c3c", marginBottom: 12 }}>{err}</div>}

      <div className="card" style={{ minWidth: "80rem" }}>
        <DataTable
          value={departments}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 30]}
          stripedRows
          responsiveLayout="scroll"
          emptyMessage={loading ? "Loading..." : "No departments found"}
        >
          <Column field="departmentId" header="ID" style={{ width: "6rem" }} />
          <Column field="name" header="Department Name" />
          <Column field="code" header="Code" />
          <Column field="description" header="Description" />
          <Column field="head" header="Department Head" />
          <Column field="status" header="Status" />
          <Column field="createdDate" header="Created Date" />
          <Column field="updatedDate" header="Updated Date" />
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
          label="Create Department"
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate("/Department")}
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

export default DepartmentList;
