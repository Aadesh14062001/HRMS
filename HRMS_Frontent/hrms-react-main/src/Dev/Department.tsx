

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  InputText,
  Toast,
  Dropdown,
} from "../primereact-components/primeImport";
import  api  from "./api";

interface Department {
  name: string;
  code: string;
  description: string;
  companyId: number;
  branchId: number;
  head: string;
  status: "Active" | "Inactive";
}

interface Branch {
  branchId: number;
  branchName: string;
  companyId: number;
}

const DepartmentMaster = () => {
  const companyId = 19;
  const companyName = "Agaram InfoTech Private Limited";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [head, setHead] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  const toastRef = useRef<Toast>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const generateCode = () => {
      const randomCode = "DEPT-" + Math.floor(1000 + Math.random() * 9000);
      return randomCode;
    };
    setCode(generateCode());
  }, []);

  const showToast = (
    severity: "success" | "error",
    summary: string,
    detail: string
  ) => {
    toastRef.current?.show({ severity, summary, detail, life: 3000 });
  };

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data } = await api.post("/Branches_GetAll", { BranchID: 0 });
        const branchData = data?.data?.v_BranchView;

        if (Array.isArray(branchData)) setBranches(branchData);
        else if (typeof branchData === "object") setBranches([branchData]);
      } catch (error) {
        console.error("Branch fetch error:", error);
        showToast("error", "Error", "Failed to load branches.");
      }
    };

    fetchBranches();
  }, []);

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setBranchId(null);
    setHead("");
    setStatus("Active");
  };

  const handleInsert = async () => {
    if (
      !name.trim() ||
      !code.trim() ||
      !description.trim() ||
      !branchId ||
      !head.trim()
    ) {
      showToast("error", "Validation Error", "All fields are required.");
      return;
    }

    setLoading(true);
    const payload: Department = {
      name: name.trim(),
      code: code.trim(),
      description: description.trim(),
      companyId,
      branchId,
      head: head.trim(),
      status,
    };

    try {
      const { data } = await api.post("/Department_Insert", payload);
      console.log("Insert Response:", data);
      showToast("success", "Success", "Department inserted successfully.");
      resetForm();
    } catch (error) {
      console.error("Insert Error:", error);
      showToast("error", "Error", "Failed to insert department.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Toast ref={toastRef} />
      <h2>Department Master</h2>
      <p style={{ marginBottom: "1rem", color: "#555" }}>
        Create a new department under <strong>{companyName}</strong>.
      </p>

      <div className="form-grid">
        <div className="field">
          <label>Company*</label>
          <InputText value={companyName} disabled />
        </div>

        <div className="field">
          <label>Branch*</label>
          <Dropdown
            value={branchId}
            options={branches.filter((b) => b.companyId === companyId)}
            optionLabel="branchName"
            optionValue="branchId"
            placeholder="Select Branch"
            onChange={(e) => setBranchId(e.value)}
          />
        </div>

        <div className="field">
          <label>Department Name*</label>
          <InputText
            placeholder="Department Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Code*</label>
          <InputText
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Description*</label>
          <InputText
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Department Head*</label>
          <InputText
            placeholder="Head"
            value={head}
            onChange={(e) => setHead(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Status*</label>
          <Dropdown
            value={status}
            options={[
              { label: "Active", value: "Active" },
              { label: "Inactive", value: "Inactive" },
            ]}
            placeholder="Select Status"
            onChange={(e) => setStatus(e.value)}
          />
        </div>
      </div>

      <div className="button-group">
        <Button
          label={loading ? "Inserting..." : "Insert Department"}
          icon="pi pi-check"
          className="p-button-success"
          onClick={handleInsert}
          disabled={loading}
        />
        <Button
          label="Department List"
          icon="pi pi-list"
          className="p-button-secondary"
          onClick={() => navigate("/DepartmentList")}
        />
      </div>
    </div>
  );
};

export default DepartmentMaster;
