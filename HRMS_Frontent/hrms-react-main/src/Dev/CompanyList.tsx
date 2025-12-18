

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Column,
  DataTable,
  Button,
} from "../primereact-components/primeImport";
import  api  from "./api";

interface Company {
  companyId: number;
  companyName: string;
  contactNo: string;
  address: string;
  email: string;
  website: string;
  status: boolean;
}

const CompanyList = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // your backend expects POST; use the key your API reads (CompanyID or CompanyId)
        const { data } = await api.post("/Company_GetAll", { CompanyID: 0 });

        // API shape: { result, data: { v_CompanyView: [...] } }
        const result = data?.data?.v_CompanyView;
        const list = Array.isArray(result) ? result : result ? [result] : [];

        if (alive) setCompanies(list as Company[]);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load companies");
        // errors will also be 401-handled by interceptor
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
      <h2>Company List</h2>

      {err && <div style={{ color: "#e74c3c", marginBottom: 12 }}>{err}</div>}

      <div className="card" style={{ minWidth: "80rem" }}>
        <DataTable
          value={companies}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 30]}
          stripedRows
          responsiveLayout="scroll"
          emptyMessage={loading ? "Loading..." : "No companies found"}
        >
          <Column field="companyId" header="ID" />
          <Column field="companyName" header="Company Name" />
          <Column field="contactNo" header="Contact No" />
          <Column field="address" header="Address" />
          <Column field="email" header="Email" />
          <Column field="website" header="Website" />
          <Column
            field="status"
            header="Status"
            body={(row: Company) => (row.status ? "Active" : "Inactive")}
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
          label="Create Company"
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate("/CompanyMaster")}
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

export default CompanyList;
