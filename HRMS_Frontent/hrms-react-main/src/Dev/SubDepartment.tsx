// import axios from "axios";
// import { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   Button,
//   InputText,
//   Dropdown,
//   Toast,
// } from "../primereact-components/primeImport";

// interface SubDepartment {
//   companyId: number;
//   branchId: number;
//   departmentId: number;
//   subDepartmentCode: string;
//   subDepartmentName: string;
//   description: string;
//   status: boolean;
// }

// interface Branch {
//   branchId: number;
//   branchName: string;
//   companyId: number;
// }

// interface Department {
//   departmentId: number;
//   name: string;
//   companyId: number;
//   branchId: number;
// }

// const SubDepartmentMaster = () => {
//   const companyId = 19; // ✅ Static company ID
//   const companyName = "Agaram InfoTech Private Limited"; // ✅ Static company name

//   const [branchId, setBranchId] = useState<number | null>(null);
//   const [departmentId, setDepartmentId] = useState<number | null>(null);
//   const [subDepartmentCode, setSubDepartmentCode] = useState("");
//   const [subDepartmentName, setSubDepartmentName] = useState("");
//   const [description, setDescription] = useState("");
//   const [status, setStatus] = useState(true);
//   const [loading, setLoading] = useState(false);

//   const [branches, setBranches] = useState<Branch[]>([]);
//   const [departments, setDepartments] = useState<Department[]>([]);

//   const toastRef = useRef<Toast>(null);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const generatecode = () => {
//       const randomCode = "SUBD-" + Math.floor(1000 + Math.random() * 9000);
//       return randomCode;
//     };
//     setSubDepartmentCode(generatecode());
//   }, []);

//   const showToast = (
//     severity: "success" | "error",
//     summary: string,
//     detail: string
//   ) => {
//     toastRef.current?.show({ severity, summary, detail, life: 3000 });
//   };

//   const resetForm = () => {
//     setBranchId(null);
//     setDepartmentId(null);
//     setSubDepartmentCode("");
//     setSubDepartmentName("");
//     setDescription("");
//     setStatus(true);
//   };

//   useEffect(() => {
//     const fetchDropdowns = async () => {
//       try {
//         const [branchRes, deptRes] = await Promise.all([
//           axios.post("http://localhost:5055/Branches_GetAll", { BranchID: 0 }),
//           axios.post("http://localhost:5055/Department_GetAll", {
//             DepartmentID: 0,
//           }),
//         ]);

//         const b = branchRes.data?.data?.v_BranchView;
//         const d = deptRes.data?.data?.v_DepartmentView;

//         setBranches(Array.isArray(b) ? b : b ? [b] : []);
//         setDepartments(Array.isArray(d) ? d : d ? [d] : []);
//       } catch (error) {
//         console.error("Dropdown fetch error:", error);
//       }
//     };

//     fetchDropdowns();
//   }, []);

//   const handleInsert = async () => {
//     if (
//       !branchId ||
//       !departmentId ||
//       !subDepartmentCode.trim() ||
//       !subDepartmentName.trim() ||
//       !description.trim()
//     ) {
//       showToast("error", "Validation Error", "All fields are required.");
//       return;
//     }

//     setLoading(true);
//     const payload: SubDepartment = {
//       companyId,
//       branchId,
//       departmentId,
//       subDepartmentCode: subDepartmentCode.trim(),
//       subDepartmentName: subDepartmentName.trim(),
//       description: description.trim(),
//       status,
//     };

//     try {
//       const response = await axios.post(
//         "http://localhost:5055/SubDepartment_Insert",
//         payload
//       );
//       console.log("Insert Response:", response.data);
//       showToast("success", "Success", "SubDepartment inserted successfully.");
//       resetForm();
//     } catch (error) {
//       console.error("Insert Error:", error);
//       showToast("error", "Error", "Failed to insert sub-department.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container">
//       <Toast ref={toastRef} />
//       <h2>SubDepartment Master</h2>
//       <p style={{ marginBottom: "1rem", color: "#555" }}>
//         Create a new sub-department under <strong>{companyName}</strong>.
//       </p>

//       <div className="form-grid">
//         <div className="field">
//           <label>Company*</label>
//           <InputText value={companyName} disabled />
//         </div>

//         <div className="field">
//           <label>Branch*</label>
//           <Dropdown
//             value={branchId}
//             options={branches.filter((b) => b.companyId === companyId)}
//             optionLabel="branchName"
//             optionValue="branchId"
//             placeholder="Select Branch"
//             onChange={(e) => {
//               setBranchId(e.value);
//               setDepartmentId(null);
//             }}
//           />
//         </div>

//         <div className="field">
//           <label>Department*</label>
//           <Dropdown
//             value={departmentId}
//             options={departments.filter(
//               (d) => d.companyId === companyId && d.branchId === branchId
//             )}
//             optionLabel="name"
//             optionValue="departmentId"
//             placeholder="Select Department"
//             onChange={(e) => setDepartmentId(e.value)}
//             disabled={!branchId}
//           />
//         </div>

//         <div className="field">
//           <label>SubDepartment Code*</label>
//           <InputText
//             placeholder="Enter code"
//             value={subDepartmentCode}
//             onChange={(e) => setSubDepartmentCode(e.target.value)}
//           />
//         </div>

//         <div className="field">
//           <label>SubDepartment Name*</label>
//           <InputText
//             placeholder="Enter name"
//             value={subDepartmentName}
//             onChange={(e) => setSubDepartmentName(e.target.value)}
//           />
//         </div>

//         <div className="field">
//           <label>Description*</label>
//           <InputText
//             placeholder="Enter description"
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//           />
//         </div>

//         <div className="field">
//           <label>Status*</label>
//           <Dropdown
//             value={status}
//             options={[
//               { label: "Active", value: true },
//               { label: "Inactive", value: false },
//             ]}
//             placeholder="Select Status"
//             onChange={(e) => setStatus(e.value)}
//           />
//         </div>
//       </div>

//       <div className="button-group">
//         <Button
//           label={loading ? "Inserting..." : "Insert SubDepartment"}
//           icon="pi pi-check"
//           className="p-button-success"
//           onClick={handleInsert}
//           disabled={loading}
//         />
//         <Button
//           label="SubDepartment List"
//           icon="pi pi-list"
//           className="p-button-secondary"
//           onClick={() => navigate("/SubDepartmentList")}
//         />
//       </div>
//     </div>
//   );
// };

// export default SubDepartmentMaster;

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  InputText,
  Dropdown,
  Toast,
} from "../primereact-components/primeImport";
import  api  from "./api";

interface SubDepartment {
  companyId: number;
  branchId: number;
  departmentId: number;
  subDepartmentCode: string;
  subDepartmentName: string;
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

const SubDepartmentMaster = () => {
  const companyId = 19;
  const companyName = "Agaram InfoTech Private Limited";

  const [branchId, setBranchId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [subDepartmentCode, setSubDepartmentCode] = useState("");
  const [subDepartmentName, setSubDepartmentName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const toastRef = useRef<Toast>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const generateCode = () => {
      const randomCode = "SUBD-" + Math.floor(1000 + Math.random() * 9000);
      return randomCode;
    };
    setSubDepartmentCode(generateCode());
  }, []);

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
    setSubDepartmentCode("");
    setSubDepartmentName("");
    setDescription("");
    setStatus(true);
  };

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [branchRes, deptRes] = await Promise.all([
          api.post("/Branches_GetAll", { BranchID: 0 }),
          api.post("/Department_GetAll", { DepartmentID: 0 }),
        ]);

        const b = branchRes.data?.data?.v_BranchView;
        const d = deptRes.data?.data?.v_DepartmentView;

        setBranches(Array.isArray(b) ? b : b ? [b] : []);
        setDepartments(Array.isArray(d) ? d : d ? [d] : []);
      } catch (error) {
        console.error("Dropdown fetch error:", error);
        showToast("error", "Error", "Failed to load dropdown data.");
      }
    };

    fetchDropdowns();
  }, []);

  const handleInsert = async () => {
    if (
      !branchId ||
      !departmentId ||
      !subDepartmentCode.trim() ||
      !subDepartmentName.trim() ||
      !description.trim()
    ) {
      showToast("error", "Validation Error", "All fields are required.");
      return;
    }

    setLoading(true);
    const payload: SubDepartment = {
      companyId,
      branchId,
      departmentId,
      subDepartmentCode: subDepartmentCode.trim(),
      subDepartmentName: subDepartmentName.trim(),
      description: description.trim(),
      status,
    };

    try {
      const { data } = await api.post("/SubDepartment_Insert", payload);
      console.log("Insert Response:", data);
      showToast("success", "Success", "SubDepartment inserted successfully.");
      resetForm();
    } catch (error) {
      console.error("Insert Error:", error);
      showToast("error", "Error", "Failed to insert sub-department.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Toast ref={toastRef} />
      <h2>SubDepartment Master</h2>
      <p style={{ marginBottom: "1rem", color: "#555" }}>
        Create a new sub-department under <strong>{companyName}</strong>.
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
            onChange={(e) => setDepartmentId(e.value)}
            disabled={!branchId}
          />
        </div>

        <div className="field">
          <label>SubDepartment Code*</label>
          <InputText
            placeholder="Enter code"
            value={subDepartmentCode}
            onChange={(e) => setSubDepartmentCode(e.target.value)}
          />
        </div>

        <div className="field">
          <label>SubDepartment Name*</label>
          <InputText
            placeholder="Enter name"
            value={subDepartmentName}
            onChange={(e) => setSubDepartmentName(e.target.value)}
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
          label={loading ? "Inserting..." : "Insert SubDepartment"}
          icon="pi pi-check"
          className="p-button-success"
          onClick={handleInsert}
          disabled={loading}
        />
        <Button
          label="SubDepartment List"
          icon="pi pi-list"
          className="p-button-secondary"
          onClick={() => navigate("/SubDepartmentList")}
        />
      </div>
    </div>
  );
};

export default SubDepartmentMaster;
