import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Column,
  DataTable,
  Button,
} from "../primereact-components/primeImport";
import api  from "./api";
interface SubDepartment {
  subDepartmentId: number;
  companyId: number;
  branchId: number;
  departmentId: number;
  subDepartmentCode: string;
  subDepartmentName: string;
  description: string;
  status: boolean;
  createdAt: string;
}

const SubDepartmentList = () => {
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await api.post("/SubDepartment_GetAll", {
          SubDepartmentID: 0,
        });

        const result = data?.data?.v_SubDepartmentView;
        const list = Array.isArray(result) ? result : result ? [result] : [];

        if (alive) setSubDepartments(list as SubDepartment[]);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load sub-departments");
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
      <h2>SubDepartment List</h2>

      {err && <div style={{ color: "#e74c3c", marginBottom: 12 }}>{err}</div>}

      <div className="card" style={{ minWidth: "80rem" }}>
        <DataTable
          value={subDepartments}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 30]}
          stripedRows
          responsiveLayout="scroll"
          emptyMessage={loading ? "Loading..." : "No sub-departments found"}
        >
          <Column
            field="subDepartmentId"
            header="ID"
            style={{ width: "6rem" }}
          />
          <Column field="subDepartmentCode" header="Code" />
          <Column field="subDepartmentName" header="Name" />
          <Column field="description" header="Description" />
          <Column
            field="status"
            header="Status"
            body={(row: SubDepartment) => (row.status ? "Active" : "Inactive")}
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
          label="Create SubDepartment"
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate("/SubDepartment")}
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

export default SubDepartmentList;
