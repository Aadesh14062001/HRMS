

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  InputText,
  Toast,
  Dropdown,
} from "../primereact-components/primeImport";
import api  from "./api";

interface Branch {
  companyId: number;
  branchName: string;
  location: string;
  contactNo: string;
  email: string;
  status: boolean;
}

const BranchMaster = () => {
  const companyId = 19;
  const companyName = "Agaram InfoTech Private Limited";

  const [branchName, setBranchName] = useState("");
  const [location, setLocation] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);

  const toastRef = useRef<Toast>(null);
  const navigate = useNavigate();

  const showToast = (
    severity: "success" | "error",
    summary: string,
    detail: string
  ) => {
    toastRef.current?.show({ severity, summary, detail, life: 3000 });
  };

  const resetForm = () => {
    setBranchName("");
    setLocation("");
    setContactNo("");
    setEmail("");
    setStatus(true);
  };

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInsert = async () => {
    if (
      !branchName.trim() ||
      !location.trim() ||
      !contactNo.trim() ||
      !email.trim()
    ) {
      showToast("error", "Validation Error", "All fields are required.");
      return;
    }

    if (!isValidEmail(email)) {
      showToast(
        "error",
        "Invalid Email",
        "Please enter a valid email address."
      );
      return;
    }

    setLoading(true);
    const payload: Branch = {
      companyId,
      branchName: branchName.trim(),
      location: location.trim(),
      contactNo: contactNo.trim(),
      email: email.trim(),
      status,
    };

    try {
      const response = await api.post("/Branches_Insert", payload); 
      console.log("Insert Response:", response.data);
      showToast("success", "Success", "Branch inserted successfully.");
      resetForm();
    } catch (error) {
      console.error("Insert Error:", error);
      showToast("error", "Error", "Failed to insert branch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Toast ref={toastRef} />
      <h2>Branch Master</h2>
      <p style={{ marginBottom: "1rem", color: "#555" }}>
        Create a new branch under <strong>{companyName}</strong>.
      </p>

      <div className="form-grid">
        <div className="field">
          <label>Company*</label>
          <InputText value={companyName} disabled />
        </div>

        <div className="field">
          <label>Branch Name*</label>
          <InputText
            placeholder="Enter branch name"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Location*</label>
          <InputText
            placeholder="Enter location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Contact Number*</label>
          <InputText
            placeholder="Enter contact number"
            value={contactNo}
            onChange={(e) => setContactNo(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Email*</label>
          <InputText
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Status</label>
          <Dropdown
            value={status}
            options={[
              { label: "Active", value: true },
              { label: "Inactive", value: false },
            ]}
            onChange={(e) => setStatus(e.value)}
            placeholder="Select status"
          />
        </div>
      </div>

      <div className="button-group">
        <Button
          label={loading ? "Inserting..." : "Insert Branch"}
          icon="pi pi-check"
          className="p-button-success"
          onClick={handleInsert}
          disabled={loading}
        />
        <Button
          label="Branch List"
          icon="pi pi-list"
          className="p-button-secondary"
          onClick={() => navigate("/BranchList")}
        />
      </div>
    </div>
  );
};

export default BranchMaster;
