

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  InputText,
  Dropdown,
  Toast,
} from "../primereact-components/primeImport";
import api  from "./api";

interface Position {
  companyId: number;
  branchId: number;
  departmentId: number;
  subDepartmentId: number;
  designationId: number;
  positionCode: string;
  positionTitle: string;
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
  companyId: number;
  branchId: number;
  departmentId: number;
}

interface Designation {
  designationId: number;
  designationName: string;
  companyId: number;
  branchId: number;
  departmentId: number;
  subDepartmentId: number;
}

const PositionMaster = () => {
  const companyId = 19;
  const companyName = "Agaram InfoTech Private Limited";

  const [branchId, setBranchId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [subDepartmentId, setSubDepartmentId] = useState<number | null>(null);
  const [designationId, setDesignationId] = useState<number | null>(null);

  const [positionCode, setPositionCode] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);

  const toastRef = useRef<Toast>(null);
  const navigate = useNavigate();

  // Generate random 4 digits
  const genRand4 = () => Math.floor(1000 + Math.random() * 9000);

  // Auto-generate Position Code similar to Designation pattern
  const buildPositionCode = (
    br?: number | null,
    dept?: number | null,
    sub?: number | null,
    desig?: number | null
  ) => {
    const brPart = br ? String(br).padStart(2, "0") : "XX";
    const deptPart = dept ? String(dept).padStart(2, "0") : "XX";
    const subPart = sub ? String(sub).padStart(2, "0") : "XX";
    const desigPart = desig ? String(desig).padStart(2, "0") : "XX";

    return `POS-${brPart}-${deptPart}-${subPart}-${desigPart}-${genRand4()}`;
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
    setDesignationId(null);
    setPositionCode("");
    setPositionTitle("");
    setDescription("");
    setStatus(true);
  };

  // Load dropdowns
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [branchRes, deptRes, subDeptRes, designationRes] =
          await Promise.all([
            api.post("/Branches_GetAll", { BranchID: 0 }),
            api.post("/Department_GetAll", { DepartmentID: 0 }),
            api.post("/SubDepartment_GetAll", { SubDepartmentID: 0 }),
            api.post("/Designation_GetAll", { DesignationId: 0 }),
          ]);

        const b = branchRes.data?.data?.v_BranchView;
        const d = deptRes.data?.data?.v_DepartmentView;
        const s = subDeptRes.data?.data?.v_SubDepartmentView;
        const g = designationRes.data?.data?.v_DesignationView;

        setBranches(Array.isArray(b) ? b : b ? [b] : []);
        setDepartments(Array.isArray(d) ? d : d ? [d] : []);
        setSubDepartments(Array.isArray(s) ? s : s ? [s] : []);
        setDesignations(Array.isArray(g) ? g : g ? [g] : []);
      } catch (err) {
        console.error(err);
        showToast("error", "Error", "Failed to load dropdowns.");
      }
    };

    loadDropdowns();
  }, []);

  // Auto-generate Position Code based on dropdown selections
  useEffect(() => {
    if (positionCode && positionCode.trim().length > 0) return;

    if (
      branchId !== null ||
      departmentId !== null ||
      subDepartmentId !== null ||
      designationId !== null
    ) {
      const code = buildPositionCode(
        branchId,
        departmentId,
        subDepartmentId,
        designationId
      );
      setPositionCode(code);
    }
  }, [branchId, departmentId, subDepartmentId, designationId]);

  const handleInsert = async () => {
    if (
      !branchId ||
      !departmentId ||
      !subDepartmentId ||
      !designationId ||
      !positionCode.trim() ||
      !positionTitle.trim() ||
      !description.trim()
    ) {
      showToast("error", "Validation Error", "All fields are required.");
      return;
    }

    setLoading(true);

    const payload: Position = {
      companyId,
      branchId,
      departmentId,
      subDepartmentId,
      designationId,
      positionCode,
      positionTitle: positionTitle.trim(),
      description: description.trim(),
      status,
    };

    try {
      const { data } = await api.post("/Position_Insert", payload);
      console.log("Insert Response:", data);
      showToast("success", "Success", "Position inserted successfully.");
      resetForm();
    } catch (err) {
      console.error(err);
      showToast("error", "Error", "Failed to insert position.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Toast ref={toastRef} />

      <h2>Position Master</h2>
      <p style={{ marginBottom: "1rem", color: "#555" }}>
        Create a new position under <strong>{companyName}</strong>.
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
              setDesignationId(null);
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
              setDesignationId(null);
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
            onChange={(e) => {
              setSubDepartmentId(e.value);
              setDesignationId(null);
            }}
            disabled={!departmentId}
          />
        </div>

        <div className="field">
          <label>Designation*</label>
          <Dropdown
            value={designationId}
            options={designations.filter(
              (d) =>
                d.companyId === companyId &&
                d.branchId === branchId &&
                d.departmentId === departmentId &&
                d.subDepartmentId === subDepartmentId
            )}
            optionLabel="designationName"
            optionValue="designationId"
            placeholder="Select Designation"
            onChange={(e) => setDesignationId(e.value)}
            disabled={!subDepartmentId}
          />
        </div>

        <div className="field">
          <label>Position Code*</label>
          <InputText
            value={positionCode}
            onChange={(e) => setPositionCode(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Position Title*</label>
          <InputText
            value={positionTitle}
            onChange={(e) => setPositionTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Description*</label>
          <InputText
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
            onChange={(e) => setStatus(e.value)}
          />
        </div>
      </div>

      <div className="button-group">
        <Button
          label={loading ? "Inserting..." : "Insert Position"}
          icon="pi pi-check"
          className="p-button-success"
          onClick={handleInsert}
          disabled={loading}
        />
        <Button
          label="Position List"
          icon="pi pi-list"
          className="p-button-secondary"
          onClick={() => navigate("/PositionList")}
        />
      </div>
    </div>
  );
};

export default PositionMaster;
