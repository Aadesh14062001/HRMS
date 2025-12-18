

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  InputText,
  Dropdown,
  Toast,
} from "../primereact-components/primeImport";
import  api  from "./api";

interface Designation {
  companyId: number;
  branchId: number;
  departmentId: number;
  subDepartmentId: number;
  designationCode: string;
  designationName: string;
  description: string;
  status: boolean;
}

interface Branch {
  branchId: number;
  branchName: string;
  companyId: number;
}

interface Department {
  departmentId: number;
  name: string;
  companyId: number;
  branchId: number;
}

interface SubDepartment {
  subDepartmentId: number;
  subDepartmentName: string;
  departmentId: number;
  branchId: number;
  companyId: number;
}

const DesignationMaster = () => {
  const companyId = 19;
  const companyName = "Agaram InfoTech Private Limited";

  const [branchId, setBranchId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [subDepartmentId, setSubDepartmentId] = useState<number | null>(null);
  const [designationCode, setDesignationCode] = useState("");
  const [designationName, setDesignationName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);

  const toastRef = useRef<Toast>(null);
  const navigate = useNavigate();

  const genRand4 = () => Math.floor(1000 + Math.random() * 9000);

  const buildDesignationCode = (
    br?: number | null,
    dept?: number | null,
    sub?: number | null
  ) => {
    const brPart = br ? String(br).padStart(2, "0") : "XX";
    const deptPart = dept ? String(dept).padStart(2, "0") : "XX";
    const subPart = sub ? String(sub).padStart(2, "0") : "XX";
    return `DES-${brPart}-${deptPart}-${subPart}-${genRand4()}`;
  };

  const showToast = (
    severity: "success" | "error",
    summary: string,
    detail: string
  ) => {
    toastRef.current?.show({ severity, summary, detail, life: 3000 });
  };

  const resetForm = () => {
    setBranchId(null);
    setDepartmentId(null);
    setSubDepartmentId(null);
    setDesignationCode("");
    setDesignationName("");
    setDescription("");
    setStatus(true);
  };

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [branchRes, deptRes, subDeptRes] = await Promise.all([
          api.post("/Branches_GetAll", { BranchID: 0 }),
          api.post("/Department_GetAll", { DepartmentID: 0 }),
          api.post("/SubDepartment_GetAll", { SubDepartmentID: 0 }),
        ]);

        const b = branchRes.data?.data?.v_BranchView;
        const d = deptRes.data?.data?.v_DepartmentView;
        const s = subDeptRes.data?.data?.v_SubDepartmentView;

        setBranches(Array.isArray(b) ? b : b ? [b] : []);
        setDepartments(Array.isArray(d) ? d : d ? [d] : []);
        setSubDepartments(Array.isArray(s) ? s : s ? [s] : []);
      } catch (error) {
        console.error("Dropdown fetch error:", error);
        showToast("error", "Error", "Failed to load dropdowns.");
      }
    };

    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (designationCode && designationCode.trim().length > 0) return;

    if (
      branchId !== null ||
      departmentId !== null ||
      subDepartmentId !== null
    ) {
      const code = buildDesignationCode(
        branchId,
        departmentId,
        subDepartmentId
      );
      setDesignationCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, departmentId, subDepartmentId]);

  const handleInsert = async () => {
    if (
      !branchId ||
      !departmentId ||
      !subDepartmentId ||
      !designationCode.trim() ||
      !designationName.trim() ||
      !description.trim()
    ) {
      showToast("error", "Validation Error", "All fields are required.");
      return;
    }

    setLoading(true);
    const payload: Designation = {
      companyId,
      branchId,
      departmentId,
      subDepartmentId,
      designationCode: designationCode.trim(),
      designationName: designationName.trim(),
      description: description.trim(),
      status,
    };

    try {
      const { data } = await api.post("/Designation_Insert", payload);
      console.log("Insert Response:", data);
      showToast("success", "Success", "Designation inserted successfully.");
      resetForm();
    } catch (error) {
      console.error("Insert Error:", error);
      showToast("error", "Error", "Failed to insert designation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Toast ref={toastRef} />
      <h2>Designation Master</h2>
      <p style={{ marginBottom: "1rem", color: "#555" }}>
        Create a new designation under <strong>{companyName}</strong>.
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
            onChange={(e) => {
              setBranchId(e.value);
              setDepartmentId(null);
              setSubDepartmentId(null);
            }}
          />
        </div>

        <div className="field">
          <label>Department*</label>
          <Dropdown
            value={departmentId}
            options={departments.filter(
              (d) => d.companyId === companyId && d.branchId === branchId
            )}
            optionLabel="name"
            optionValue="departmentId"
            placeholder="Select Department"
            onChange={(e) => {
              setDepartmentId(e.value);
              setSubDepartmentId(null);
            }}
            disabled={!branchId}
          />
        </div>

        <div className="field">
          <label>SubDepartment*</label>
          <Dropdown
            value={subDepartmentId}
            options={subDepartments.filter(
              (s) =>
                s.companyId === companyId &&
                s.branchId === branchId &&
                s.departmentId === departmentId
            )}
            optionLabel="subDepartmentName"
            optionValue="subDepartmentId"
            placeholder="Select SubDepartment"
            onChange={(e) => setSubDepartmentId(e.value)}
            disabled={!departmentId}
          />
        </div>

        <div className="field">
          <label>Designation Code*</label>
          <InputText
            placeholder="Enter code"
            value={designationCode}
            onChange={(e) => setDesignationCode(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Designation Name*</label>
          <InputText
            placeholder="Enter name"
            value={designationName}
            onChange={(e) => setDesignationName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Description*</label>
          <InputText
            placeholder="Enter description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Status*</label>
          <Dropdown
            value={status}
            options={[
              { label: "Active", value: true },
              { label: "Inactive", value: false },
            ]}
            placeholder="Select Status"
            onChange={(e) => setStatus(e.value)}
          />
        </div>
      </div>

      <div className="button-group">
        <Button
          label={loading ? "Inserting..." : "Insert Designation"}
          icon="pi pi-check"
          className="p-button-success"
          onClick={handleInsert}
          disabled={loading}
        />
        <Button
          label="Designation List"
          icon="pi pi-list"
          onClick={() => navigate("/DesignationList")}
        />
      </div>
    </div>
  );
};

export default DesignationMaster;
