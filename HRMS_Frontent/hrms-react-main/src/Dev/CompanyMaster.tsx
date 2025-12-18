

import axios from "axios";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  InputText,
  Dropdown,
  Toast,
} from "../primereact-components/primeImport";

interface Company {
  companyName: string;
  contactNo: string;
  address: string;
  email: string;
  website: string;
  status: boolean;
}

const CompanyMaster = () => {
  const [companyName, setCompanyName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
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
    setCompanyName("");
    setContactNo("");
    setAddress("");
    setEmail("");
    setWebsite("");
    setStatus(true);
  };

  const handleInsert = async () => {
    if (
      !companyName.trim() ||
      !contactNo.trim() ||
      !address.trim() ||
      !email.trim() ||
      !website.trim()
    ) {
      showToast("error", "Validation Error", "All fields are required.");
      return;
    }

    setLoading(true);
    const payload: Company = {
      companyName: companyName.trim(),
      contactNo: contactNo.trim(),
      address: address.trim(),
      email: email.trim(),
      website: website.trim(),
      status,
    };

    try {
      const response = await axios.post(
        "http://localhost:5055/Company_Insert",
        payload
      );
      console.log("Insert Response:", response.data);

      showToast("success", "Success", "Company inserted successfully.");
      resetForm();
    } catch (error: any) {
      console.error("Insert Error:", error);
      showToast("error", "Error", "Failed to insert company.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Toast ref={toastRef} />
      <h2>Company Master</h2>

      <div className="form-grid">
        <div className="field">
          <label>Company Name*</label>
          <InputText
            placeholder="Enter company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
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
          <label>Company Address*</label>
          <InputText
            placeholder="Enter address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
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
          <label>Website*</label>
          <InputText
            placeholder="Enter website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
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
            placeholder="Select Status"
          />
        </div>
      </div>

      <div className="button-group">
        <Button
          label={loading ? "Inserting..." : "Insert Company"}
          icon="pi pi-check"
          className="p-button-success"
          onClick={handleInsert}
          disabled={loading}
        />
        <Button
          label="Company List"
          icon="pi pi-list"
          className="p-button-secondary"
          onClick={() => navigate("/CompanyList")}
        />
        <Button
          label="Branch Entry"
          icon="pi pi-arrow-right"
          className="p-button-secondary"
          onClick={() => navigate("/Branch")}
        />
      </div>
    </div>
  );
};

export default CompanyMaster;
