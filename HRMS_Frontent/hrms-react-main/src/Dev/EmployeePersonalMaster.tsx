// src/Dev/EmployeePersonalMaster.tsx
import { useCallback, useRef, useState } from "react";
import {
  Button,
  InputText,
  Dropdown,
  Toast,
} from "../primereact-components/primeImport";
import  api  from "./api";

interface EmployeePersonalPayload {
  EmployeeCode: string;
  FatherName: string;
  MaritalStatus: string;
  Nationality: string;
  BloodGroup: string;
  AadharNumber: string;
  PANNumber: string;
  PermanentAddress: string;
  CurrentAddress: string;
  IsSameAddress: boolean;
  State: string;
  City: string;
  Pincode: string;
  EmergencyContactName: string;
  EmergencyContactRelation: string;
  EmergencyContactNumber: string;
}

const MARITAL_OPTIONS = [
  { label: "Single", value: "Single" },
  { label: "Married", value: "Married" },
  { label: "Divorced", value: "Divorced" },
];

const BLOOD_OPTIONS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
  (b) => ({ label: b, value: b })
);

export default function EmployeePersonalMaster() {
  const [employeeCode, setEmployeeCode] = useState<string>("");
  const [fatherName, setFatherName] = useState<string>("");
  const [maritalStatus, setMaritalStatus] = useState<string>("");
  const [nationality, setNationality] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState<string>("");

  const [aadharNumber, setAadharNumber] = useState<string>("");
  const [panNumber, setPanNumber] = useState<string>("");

  const [permanentAddress, setPermanentAddress] = useState<string>("");
  const [currentAddress, setCurrentAddress] = useState<string>("");

  const [isSameAddress, setIsSameAddress] = useState<boolean>(false);

  const [stateName, setStateName] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");

  const [emergencyContactName, setEmergencyContactName] = useState<string>("");
  const [emergencyContactRelation, setEmergencyContactRelation] =
    useState<string>("");
  const [emergencyContactNumber, setEmergencyContactNumber] =
    useState<string>("");

  const [loading, setLoading] = useState(false);
  const toastRef = useRef<Toast | null>(null);

  const showToast = useCallback(
    (
      severity: "success" | "error" | "info" | "warn",
      summary: string,
      detail: string
    ) => toastRef.current?.show({ severity, summary, detail, life: 4000 }),
    []
  );

  // If user chooses same address, keep currentAddress in sync
  const onToggleSameAddress = useCallback(
    (v: boolean) => {
      setIsSameAddress(v);
      if (v) setCurrentAddress(permanentAddress);
    },
    [permanentAddress]
  );

  const validate = useCallback((payload: EmployeePersonalPayload) => {
    if (!payload.EmployeeCode?.trim()) return "Employee Code is required.";
    if (!payload.FatherName?.trim()) return "Father Name is required.";
    if (!payload.MaritalStatus?.trim()) return "Marital Status is required.";
    if (!payload.AadharNumber?.trim()) return "Aadhaar is required.";
    if (!payload.PANNumber?.trim()) return "PAN is required.";
    if (!payload.PermanentAddress?.trim())
      return "Permanent Address is required.";
    if (!payload.CurrentAddress?.trim()) return "Current Address is required.";
    if (!payload.State?.trim()) return "State is required.";
    if (!payload.City?.trim()) return "City is required.";
    if (!payload.Pincode?.trim()) return "Pincode is required.";
    if (!payload.EmergencyContactName?.trim())
      return "Emergency Contact Name is required.";
    if (!payload.EmergencyContactRelation?.trim())
      return "Emergency Contact Relation is required.";
    if (!payload.EmergencyContactNumber?.trim())
      return "Emergency Contact Number is required.";
    return null;
  }, []);

  const buildPayload = useCallback((): EmployeePersonalPayload => {
    return {
      EmployeeCode: employeeCode.trim(),
      FatherName: fatherName.trim(),
      MaritalStatus: maritalStatus.trim(),
      Nationality: nationality.trim(),
      BloodGroup: bloodGroup.trim(),
      AadharNumber: aadharNumber.trim(),
      PANNumber: panNumber.trim(),
      PermanentAddress: permanentAddress.trim(),
      CurrentAddress: (isSameAddress ? permanentAddress : currentAddress).trim(),
      IsSameAddress: Boolean(isSameAddress),
      State: stateName.trim(),
      City: city.trim(),
      Pincode: pincode.trim(),
      EmergencyContactName: emergencyContactName.trim(),
      EmergencyContactRelation: emergencyContactRelation.trim(),
      EmergencyContactNumber: emergencyContactNumber.trim(),
    };
  }, [
    employeeCode,
    fatherName,
    maritalStatus,
    nationality,
    bloodGroup,
    aadharNumber,
    panNumber,
    permanentAddress,
    currentAddress,
    isSameAddress,
    stateName,
    city,
    pincode,
    emergencyContactName,
    emergencyContactRelation,
    emergencyContactNumber,
  ]);

  const handleSave = useCallback(async () => {
    const payload = buildPayload();
    const err = validate(payload);
    if (err) {
      showToast("error", "Validation Error", err);
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/Emppersonal_Insert", payload);
      showToast(
        "success",
        "Saved",
        res?.data?.message ?? "Employee personal details saved successfully."
      );
    } catch (err) {
      console.error("Save error:", err);
      showToast("error", "Save Failed", "Unable to save employee personal details.");
    } finally {
      setLoading(false);
    }
  }, [buildPayload, validate, showToast]);

  const doReset = useCallback((clearCode = true) => {
    if (clearCode) setEmployeeCode("");
    setFatherName("");
    setMaritalStatus("");
    setNationality("");
    setBloodGroup("");
    setAadharNumber("");
    setPanNumber("");
    setPermanentAddress("");
    setCurrentAddress("");
    setIsSameAddress(false);
    setStateName("");
    setCity("");
    setPincode("");
    setEmergencyContactName("");
    setEmergencyContactRelation("");
    setEmergencyContactNumber("");
  }, []);

  return (
    <div className="container">
      <Toast ref={toastRef} />
      <h2>Employee Personal Master</h2>

      <div className="form-grid">
        <div className="field">
          <label>Employee Code*</label>
          <InputText
            value={employeeCode}
            onChange={(e: any) => setEmployeeCode(e.target.value)}
            placeholder="Enter an existing Employee Code"
          />
        </div>

        <div className="field">
          <label>Father Name*</label>
          <InputText
            value={fatherName}
            onChange={(e: any) => setFatherName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Marital Status*</label>
          <Dropdown
            value={maritalStatus}
            options={MARITAL_OPTIONS}
            onChange={(e: any) => setMaritalStatus(e.value)}
            placeholder="Select Status"
          />
        </div>

        <div className="field">
          <label>Nationality</label>
          <InputText
            value={nationality}
            onChange={(e: any) => setNationality(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Blood Group</label>
          <Dropdown
            value={bloodGroup}
            options={BLOOD_OPTIONS}
            onChange={(e: any) => setBloodGroup(e.value)}
            placeholder="Select Blood Group"
          />
        </div>

        <div className="field">
          <label>Aadhaar Number*</label>
          <InputText
            value={aadharNumber}
            onChange={(e: any) => setAadharNumber(e.target.value)}
          />
        </div>

        <div className="field">
          <label>PAN Number*</label>
          <InputText
            value={panNumber}
            onChange={(e: any) => setPanNumber(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Permanent Address*</label>
          <InputText
            value={permanentAddress}
            onChange={(e: any) => setPermanentAddress(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Same as Permanent Address</label>
          <Dropdown
            value={isSameAddress}
            options={[
              { label: "Yes", value: true },
              { label: "No", value: false },
            ]}
            onChange={(e: any) => onToggleSameAddress(Boolean(e.value))}
            placeholder="Select"
          />
        </div>

        <div className="field">
          <label>Current Address*</label>
          <InputText
            value={currentAddress}
            onChange={(e: any) => setCurrentAddress(e.target.value)}
            disabled={isSameAddress}
          />
        </div>

        <div className="field">
          <label>State*</label>
          <InputText
            value={stateName}
            onChange={(e: any) => setStateName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>City*</label>
          <InputText value={city} onChange={(e: any) => setCity(e.target.value)} />
        </div>

        <div className="field">
          <label>Pincode*</label>
          <InputText
            value={pincode}
            onChange={(e: any) => setPincode(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Emergency Contact Name*</label>
          <InputText
            value={emergencyContactName}
            onChange={(e: any) => setEmergencyContactName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Emergency Contact Relation*</label>
          <InputText
            value={emergencyContactRelation}
            onChange={(e: any) => setEmergencyContactRelation(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Emergency Contact Number*</label>
          <InputText
            value={emergencyContactNumber}
            onChange={(e: any) => setEmergencyContactNumber(e.target.value)}
          />
        </div>
      </div>

      <div className="button-group" style={{ marginTop: "1rem" }}>
        <Button
          label={loading ? "Saving..." : "Save"}
          icon="pi pi-save"
          className="p-button-success"
          onClick={handleSave}
          disabled={loading}
        />
        <Button
          label="Reset"
          icon="pi pi-refresh"
          className="p-button-secondary"
          onClick={() => doReset()}
        />
      </div>
    </div>
  );
}
