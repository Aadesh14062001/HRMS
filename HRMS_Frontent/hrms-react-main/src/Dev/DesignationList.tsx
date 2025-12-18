import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Column,
  DataTable,
  Button,
} from "../primereact-components/primeImport";
import  api  from "./api"; // ✅ Centralized Axios instance with auth

interface Designation {
  designationId: number;
  companyId: number;
  branchId: number;
  departmentId: number;
  subDepartmentId: number;
  designationCode: string;
  designationName: string;
  level: string;
  description: string;
  status: boolean;
  createdAt: string;
}

const DesignationList = () => {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await api.post("/Designation_GetAll", {
          DesignationId: 0,
        });

        const result = data?.data?.v_DesignationView;
        const list = Array.isArray(result) ? result : result ? [result] : [];

        if (alive) setDesignations(list as Designation[]);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load designations");
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
      <h2>Designation List</h2>

      {err && <div style={{ color: "#e74c3c", marginBottom: 12 }}>{err}</div>}

      <div className="card" style={{ minWidth: "80rem" }}>
        <DataTable
          value={designations}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 30]}
          stripedRows
          responsiveLayout="scroll"
          emptyMessage={loading ? "Loading..." : "No designations found"}
        >
          <Column field="designationId" header="ID" style={{ width: "6rem" }} />
          <Column field="designationCode" header="Code" />
          <Column field="designationName" header="Name" />
          <Column field="level" header="Level" />
          <Column field="description" header="Description" />
          <Column
            field="status"
            header="Status"
            body={(row: Designation) => (row.status ? "Active" : "Inactive")}
          />
          <Column field="createdAt" header="Created At" />
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
          label="Create Designation"
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate("/Designation")}
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

export default DesignationList;
