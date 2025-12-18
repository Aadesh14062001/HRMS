import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Column,
  DataTable,
  Button,
} from "../primereact-components/primeImport";
import api from "./api";

interface Position {
  positionId: number;
  companyId: number;
  branchId: number;
  departmentId: number;
  positionCode: string;
  positionTitle: string;
  description: string;
  status: boolean;
  createdAt: string;
}

const PositionList = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await api.post("/Position_GetAll", {
          PositionId: 0,
        });

        const result = data?.data?.v_PositionView;
        const list = Array.isArray(result) ? result : result ? [result] : [];

        if (alive) setPositions(list as Position[]);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load positions");
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
      <h2>Position List</h2>

      {err && <div style={{ color: "#e74c3c", marginBottom: 12 }}>{err}</div>}

      <div className="card" style={{ minWidth: "80rem" }}>
        <DataTable
          value={positions}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 30]}
          stripedRows
          responsiveLayout="scroll"
          emptyMessage={loading ? "Loading..." : "No positions found"}
        >
          <Column field="positionId" header="ID" style={{ width: "6rem" }} />
          <Column field="positionCode" header="Code" />
          <Column field="positionTitle" header="Title" />
          <Column field="description" header="Description" />
          <Column
            field="status"
            header="Status"
            body={(row: Position) => (row.status ? "Active" : "Inactive")}
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
          label="Create Position"
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate("/Position")}
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

export default PositionList;
