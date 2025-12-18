// src/Dev/EmployeePersonalList.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Column,
  DataTable,
  InputText,
  Toast,
} from "../primereact-components/primeImport";
import  api  from "./api";

interface EmployeePersonalRow {
  employeeCode: string;
  fatherName: string;
  maritalStatus: string;
  nationality?: string;
  bloodGroup?: string;
  aadharNumber?: string;
  panNumber?: string;
  permanentAddress?: string;
  currentAddress?: string;
  isSameAddress?: boolean;
  state?: string;
  city?: string;
  pincode?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactNumber?: string;
  _raw?: any;
}

const tryKeys = (obj: any, keys: string[], fallback: any = ""): any => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
    const camel = k.charAt(0).toLowerCase() + k.slice(1);
    if (obj?.[camel] !== undefined && obj?.[camel] !== null) return obj[camel];
    const pascal = k.charAt(0).toUpperCase() + k.slice(1);
    if (obj?.[pascal] !== undefined && obj?.[pascal] !== null)
      return obj[pascal];
  }
  return fallback;
};

/** Normalize a single raw object into camelCase EmployeePersonalRow */
const normalizeRow = (raw: any): EmployeePersonalRow => {
  if (!raw) {
    return { employeeCode: "", fatherName: "", maritalStatus: "" };
  }

  const isSameAddressRaw = tryKeys(
    raw,
    ["IsSameAddress", "isSameAddress", "IsSameAddr"],
    false
  );
  const isSameAddress =
    typeof isSameAddressRaw === "boolean"
      ? isSameAddressRaw
      : typeof isSameAddressRaw === "number"
      ? isSameAddressRaw === 1
      : typeof isSameAddressRaw === "string"
      ? ["1", "true", "yes"].includes(isSameAddressRaw.toLowerCase())
      : Boolean(isSameAddressRaw);

  return {
    employeeCode: tryKeys(
      raw,
      ["EmployeeCode", "employeeCode", "EmployeeID", "EmployeeId"],
      ""
    ),
    fatherName: tryKeys(raw, ["FatherName", "fatherName", "Father"], ""),
    maritalStatus: tryKeys(raw, ["MaritalStatus", "maritalStatus"], ""),
    nationality: tryKeys(raw, ["Nationality", "nationality"], ""),
    bloodGroup: tryKeys(raw, ["BloodGroup", "bloodGroup"], ""),
    aadharNumber: tryKeys(
      raw,
      [
        "AadharNumber",
        "aadhaarNo",
        "AadhaarNumber",
        "AadharNo",
        "aadhaarNumber",
      ],
      ""
    ),
    panNumber: tryKeys(
      raw,
      ["PANNumber", "panNo", "PAN", "PanNumber", "panNumber"],
      ""
    ),
    permanentAddress: tryKeys(
      raw,
      [
        "PermanentAddress",
        "permanentAddress",
        "PermanentAddr",
        "Permanent_Address",
      ],
      ""
    ),
    currentAddress: tryKeys(
      raw,
      ["CurrentAddress", "currentAddress", "CurrentAddr"],
      ""
    ),
    isSameAddress,
    state: tryKeys(raw, ["State", "state"], ""),
    city: tryKeys(raw, ["City", "city"], ""),
    pincode: tryKeys(raw, ["Pincode", "PinCode", "pincode"], ""),
    emergencyContactName: tryKeys(
      raw,
      ["EmergencyContactName", "emergencyContactName", "EmergencyName"],
      ""
    ),
    emergencyContactRelation: tryKeys(
      raw,
      [
        "EmergencyContactRelation",
        "emergencyContactRelation",
        "EmergencyRelation",
      ],
      ""
    ),
    emergencyContactNumber: tryKeys(
      raw,
      ["EmergencyContactNumber", "emergencyContactNumber", "EmergencyNumber"],
      ""
    ),
    _raw: raw,
  };
};

const EmployeePersonalList: React.FC = () => {
  const [records, setRecords] = useState<EmployeePersonalRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const toastRef = useRef<Toast | null>(null);
  const navigate = useNavigate();

  const showToast = (
    severity: "success" | "error" | "info" | "warn",
    summary: string,
    detail: string
  ) => toastRef.current?.show({ severity, summary, detail, life: 3000 });

  // initial load
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async (): Promise<void> => {
      try {
        setLoading(true);
        const { data } = await api.post("/Emppersonal_GetAll", {
          EmployeePersonalId: 0,
        });

        const candidate =
          data?.data?.v_EmployeePersonalView ?? data?.data ?? data ?? null;

        let rawList: any[] = [];
        if (!candidate) rawList = [];
        else if (Array.isArray(candidate)) rawList = candidate;
        else rawList = [candidate];

        const normalized = rawList.map((r) => normalizeRow(r));
        if (!cancelled) {
          setRecords(normalized);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        if (!cancelled) {
          showToast("error", "Error", "Failed to load personal records.");
          setRecords([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedSearch(search.trim().toLowerCase()),
      300
    );
    return () => clearTimeout(t);
  }, [search]);

  // filtered results memoized
  const filtered = useMemo(() => {
    const q = debouncedSearch;
    if (!q) return records;
    return records.filter((r) =>
      [
        r.employeeCode,
        r.fatherName,
        r.emergencyContactName,
        r.city,
        r.state,
        r.pincode,
      ]
        .map((x) => (x || "").toString().toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [debouncedSearch, records]);

  // optional: double-click row to edit (navigate to personal master) if route exists
  const onRowDoubleClick = (e: any) => {
    const row: EmployeePersonalRow = e.data;
    if (row?.employeeCode) {
      // navigate to your EmployeePersonal edit page - adjust path if different
      navigate(`/EmployeePersonal/${encodeURIComponent(row.employeeCode)}`);
    }
  };

  return (
    <div>
      <Toast ref={toastRef} />
      <h2>Employee Personal List</h2>

      <div style={{ marginBottom: 12 }}>
        <InputText
          placeholder="Search by code, father name, emergency contact..."
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          style={{ width: "40%" }}
        />
      </div>

      <DataTable
        value={filtered}
        loading={loading}
        paginator
        rows={10}
        rowsPerPageOptions={[10, 20, 30]}
        stripedRows
        responsiveLayout="scroll"
        onRowDoubleClick={onRowDoubleClick}
        emptyMessage="No personal records found."
      >
        <Column field="employeeCode" header="Code" sortable />
        <Column field="fatherName" header="Father Name" sortable />
        <Column field="maritalStatus" header="Marital Status" />
        <Column field="aadharNumber" header="Aadhaar No" />
        <Column field="panNumber" header="PAN No" />
        <Column field="nationality" header="Nationality" />
        <Column field="bloodGroup" header="Blood Group" />
        <Column field="permanentAddress" header="Permanent Address" />
        <Column field="currentAddress" header="Current Address" />
        <Column
          field="isSameAddress"
          header="Same Address"
          body={(row: EmployeePersonalRow) =>
            row.isSameAddress ? "Yes" : "No"
          }
        />
        <Column field="state" header="State" />
        <Column field="city" header="City" />
        <Column field="pincode" header="Pincode" />
        <Column field="emergencyContactName" header="Emergency Contact Name" />
        <Column field="emergencyContactRelation" header="Relation" />
        <Column field="emergencyContactNumber" header="Contact Number" />
      </DataTable>
    </div>
  );
};

export default EmployeePersonalList;
