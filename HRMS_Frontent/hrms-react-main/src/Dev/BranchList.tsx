

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Column,
  DataTable,
  Button,
} from "../primereact-components/primeImport";
import  api  from "./api";

interface Branch {
  branchId: number;
  companyId: number;
  branchName: string;
  location: string;
  contactNo: string;
  email: string;
  status: boolean;
}

const BranchList = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await api.post("/Branches_GetAll", { BranchID: 0 });

        const result = data?.data?.v_BranchView;
        const list = Array.isArray(result) ? result : result ? [result] : [];

        if (alive) setBranches(list as Branch[]);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load branches");
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
      <h2>Branch List</h2>

      {err && <div style={{ color: "#e74c3c", marginBottom: 12 }}>{err}</div>}

      <div className="card" style={{ minWidth: "70rem" }}>
        <DataTable
          value={branches}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 30]}
          stripedRows
          responsiveLayout="scroll"
          emptyMessage={loading ? "Loading..." : "No branches found"}
        >
          <Column field="branchId" header="ID" style={{ width: "6rem" }} />
          <Column field="branchName" header="Branch Name" />
          <Column field="location" header="Location" />
          <Column field="contactNo" header="Contact Number" />
          <Column field="email" header="Email" />
          <Column
            field="status"
            header="Status"
            body={(row: Branch) => (row.status ? "Active" : "Inactive")}
          />
        </DataTable>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginTop: "1.5rem",
          justifyContent: "center",
        }}
      >
        <Button
          label="Create Branch"
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate("/Branch")}
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

export default BranchList;
