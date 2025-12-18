// src/Dev/EmployeeBasicMaster.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  InputText,
  Dropdown,
  Calendar,
  Toast,
} from "../primereact-components/primeImport";
import api from "./api";

interface EmployeeBasic {
  employeeId?: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string; // yyyy-mm-dd
  contactNo: string;
  email: string;
  joinDate: string; // yyyy-mm-dd
  status: boolean;
  companyId: number;
  branchId: number;
  departmentId: number;
  subDepartmentId: number;
  designationId: number;
  positionId: number;
}

interface Branch {
  branchId: number | null;
  branchName: string | null;
  companyId: number | null;
}

interface Department {
  departmentId: number | null;
  name: string | null;
  companyId: number | null;
  branchId: number | null;
}

interface SubDepartment {
  subDepartmentId: number | null;
  subDepartmentName: string | null;
  companyId: number | null;
  branchId: number | null;
  departmentId: number | null;
}

interface Designation {
  designationId: number | null;
  designationName: string | null;
  companyId: number | null;
  branchId: number | null;
  departmentId: number | null;
  subDepartmentId: number | null;
}

interface Position {
  positionId: number | null;
  positionName: string | null;
  companyId: number | null;
  branchId: number | null;
  departmentId: number | null;
  subDepartmentId: number | null;
  designationId: number | null;
}

const companyId = 19;
const companyName = "Agaram InfoTech Private Limited";

const EmployeeBasicMaster: React.FC = () => {
  const { employeeId: routeEmployeeId } = useParams<{ employeeId?: string }>();
  const isEdit = !!routeEmployeeId;
  const numericEmployeeId = isEdit ? Number(routeEmployeeId) : null;

  // form fields
  const [employeeId, setEmployeeId] = useState<number | null>(
    numericEmployeeId
  );
  const [employeeCode, setEmployeeCode] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [gender, setGender] = useState<string | null>(null);
  const [dob, setDob] = useState<Date | null>(null);
  const [contactNo, setContactNo] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [joinDate, setJoinDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<boolean>(true);

  const [branchId, setBranchId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [subDepartmentId, setSubDepartmentId] = useState<number | null>(null);
  const [designationId, setDesignationId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);

  // dropdown data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(isEdit);

  const toastRef = useRef<any>(null);
  const navigate = useNavigate();

  // Helpers
  const showToast = useCallback(
    (
      severity: "success" | "error" | "info" | "warn",
      summary: string,
      detail: string,
      life = 3000
    ) => toastRef.current?.show({ severity, summary, detail, life }),
    []
  );

  const genRand3 = useCallback(() => Math.floor(100 + Math.random() * 900), []);
  const pad2 = useCallback(
    (v?: number | null) => (v != null ? String(v).padStart(2, "0") : "XX"),
    []
  );

  const formatDate = useCallback(
    (d: Date) => d.toISOString().split("T")[0],
    []
  );
  const parseDate = useCallback(
    (s?: string | null) => (s ? new Date(s) : null),
    []
  );

  const buildEmployeeCode = useCallback(
    (
      br?: number | null,
      dept?: number | null,
      sub?: number | null,
      desig?: number | null,
      pos?: number | null
    ) =>
      `EMP-${pad2(br)}-${pad2(dept)}-${pad2(sub)}-${pad2(desig)}-${pad2(
        pos
      )}-${genRand3()}`,
    [genRand3, pad2]
  );

  // robust normalize util (memoized)
  const normalize = useCallback(
    <T extends Record<string, any>>(
      arr: any[],
      mapping: Record<string, string | string[]>
    ): T[] => {
      const input = Array.isArray(arr) ? arr : [];
      return input.map((item: any) => {
        const out: Record<string, any> = {};
        Object.entries(mapping).forEach(([toKey, fromKeyOrList]) => {
          const keys = Array.isArray(fromKeyOrList)
            ? fromKeyOrList
            : [fromKeyOrList];
          let found: any = null;

          for (const k of keys) {
            if (!item) break;
            if (Object.prototype.hasOwnProperty.call(item, k)) {
              found = item[k];
              break;
            }
            const camel = k.charAt(0).toLowerCase() + k.slice(1);
            if (Object.prototype.hasOwnProperty.call(item, camel)) {
              found = item[camel];
              break;
            }
            const pascal = k.charAt(0).toUpperCase() + k.slice(1);
            if (Object.prototype.hasOwnProperty.call(item, pascal)) {
              found = item[pascal];
              break;
            }
          }

          if (
            found === null &&
            Object.prototype.hasOwnProperty.call(item, toKey)
          ) {
            found = item[toKey];
          }

          if (found !== null && found !== undefined) {
            if (/id$/i.test(toKey) || typeof found === "number") {
              const n = Number(found);
              out[toKey] = Number.isNaN(n) ? null : n;
            } else {
              out[toKey] = found;
            }
          } else {
            out[toKey] = null;
          }
        });
        return out as T;
      });
    },
    []
  );

  // ----------------------------
  // Load dropdowns once (robust extractor)
  // ----------------------------
  useEffect(() => {
    const extractList = (res: any, keys: string[]) => {
      if (!res) return [];
      const roots = [res?.data?.Data, res?.data?.data, res?.data, res].filter(
        (x) => x !== undefined && x !== null
      );

      for (const root of roots) {
        if (!root) continue;
        if (Array.isArray(root)) return root;
        for (const k of keys) {
          if (root && Object.prototype.hasOwnProperty.call(root, k)) {
            const v = root[k];
            if (Array.isArray(v)) return v;
            if (v && typeof v === "object") return [v];
          }
          const lower = k.charAt(0).toLowerCase() + k.slice(1);
          const upper = k.charAt(0).toUpperCase() + k.slice(1);
          if (root && Object.prototype.hasOwnProperty.call(root, lower)) {
            const v = root[lower];
            if (Array.isArray(v)) return v;
            if (v && typeof v === "object") return [v];
          }
          if (root && Object.prototype.hasOwnProperty.call(root, upper)) {
            const v = root[upper];
            if (Array.isArray(v)) return v;
            if (v && typeof v === "object") return [v];
          }
        }

        const nestedArray = Object.values(root).find((val) =>
          Array.isArray(val)
        );
        if (nestedArray) return nestedArray as any[];
      }

      return [];
    };

    const fetchDropdowns = async () => {
      try {
        const [branchRes, deptRes, subDeptRes, designationRes, positionRes] =
          await Promise.all([
            api.post("/Branches_GetAll", { BranchID: 0 }),
            api.post("/Department_GetAll", { DepartmentID: 0 }),
            api.post("/SubDepartment_GetAll", { SubDepartmentID: 0 }),
            api.post("/Designation_GetAll", { DesignationId: 0 }),
            api.post("/Position_GetAll", { PositionId: 0 }),
          ]);

        const rawBranches = extractList(branchRes, [
          "V_BranchView",
          "v_BranchView",
          "V_BranchView",
          "V_Branch",
          "branches",
        ]);
        const rawDepts = extractList(deptRes, [
          "V_DepartmentView",
          "v_DepartmentView",
          "V_Department",
          "departments",
        ]);
        const rawSubDepts = extractList(subDeptRes, [
          "V_SubDepartmentView",
          "v_SubDepartmentView",
          "V_SubDepartment",
          "subdepartments",
          "SubDepartmentView",
        ]);
        const rawDesignations = extractList(designationRes, [
          "V_DesignationView",
          "v_DesignationView",
          "V_Designation",
          "designations",
        ]);
        const rawPositions = extractList(positionRes, [
          "V_PositionView",
          "v_PositionView",
          "V_Position",
          "positions",
        ]);

        const normBranches = normalize<Branch>(rawBranches, {
          branchId: ["BranchID", "BranchId", "branchId", "Id"],
          branchName: ["BranchName", "branchName", "Name"],
          companyId: ["CompanyID", "CompanyId", "companyId"],
        });

        const normDepts = normalize<Department>(rawDepts, {
          departmentId: ["DepartmentID", "DepartmentId", "departmentId", "Id"],
          name: ["DepartmentName", "departmentName", "Name"],
          companyId: ["CompanyID", "CompanyId", "companyId"],
          branchId: ["BranchID", "BranchId", "branchId"],
        });

        const normSubDepts = normalize<SubDepartment>(rawSubDepts, {
          subDepartmentId: [
            "SubDepartmentID",
            "SubDepartmentId",
            "subDepartmentId",
            "Id",
          ],
          subDepartmentName: ["SubDepartmentName", "subDepartmentName", "Name"],
          companyId: ["CompanyID", "CompanyId", "companyId"],
          branchId: ["BranchID", "BranchId", "branchId"],
          departmentId: [
            "DepartmentID",
            "DepartmentId",
            "departmentId",
            "DeptId",
          ],
        });

        const normDesignations = normalize<Designation>(rawDesignations, {
          designationId: [
            "DesignationID",
            "DesignationId",
            "designationId",
            "Id",
          ],
          designationName: ["DesignationName", "designationName", "Name"],
          companyId: ["CompanyID", "CompanyId", "companyId"],
          branchId: ["BranchID", "BranchId", "branchId"],
          departmentId: ["DepartmentID", "DepartmentId", "departmentId"],
          subDepartmentId: [
            "SubDepartmentID",
            "SubDepartmentId",
            "subDepartmentId",
          ],
        });

        const normPositions = normalize<Position>(rawPositions, {
          positionId: ["PositionID", "PositionId", "positionId", "Id"],
          positionName: [
            "PositionTitle",
            "PositionName",
            "positionName",
            "Name",
          ],
          companyId: ["CompanyID", "CompanyId", "companyId"],
          branchId: ["BranchID", "BranchId", "branchId"],
          departmentId: ["DepartmentID", "DepartmentId", "departmentId"],
          subDepartmentId: [
            "SubDepartmentID",
            "SubDepartmentId",
            "subDepartmentId",
          ],
          designationId: ["DesignationID", "DesignationId", "designationId"],
        });

        setBranches(normBranches);
        setDepartments(normDepts);
        setSubDepartments(normSubDepts);
        setDesignations(normDesignations);
        setPositions(normPositions);
      } catch (error) {
        console.error("Dropdown fetch error:", error);
        showToast("error", "Error", "Failed to load dropdowns.");
      }
    };

    fetchDropdowns();
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalize, showToast]);

  // ----------------------------
  // Load employee in edit mode
  // ----------------------------
  useEffect(() => {
    if (!isEdit || !numericEmployeeId) {
      setLoadingInitial(false);
      return;
    }

    const loadEmployee = async (id: number) => {
      setLoadingInitial(true);
      try {
        const { data } = await api.post("/EmpBasic_GetAll", { EmployeeId: id });
        const empRaw = data?.data?.V_EmployeeBasicView ?? data?.data ?? data;
        if (!empRaw) {
          showToast("warn", "Not found", "Employee record not found.");
          setLoadingInitial(false);
          return;
        }
        const empObj = Array.isArray(empRaw) ? empRaw[0] : empRaw;

        const e = {
          employeeId:
            Number(
              empObj.EmployeeID ?? empObj.EmployeeId ?? empObj.employeeId ?? id
            ) || id,
          employeeCode: empObj.EmployeeCode ?? empObj.employeeCode ?? "",
          firstName: empObj.FirstName ?? empObj.firstName ?? "",
          lastName: empObj.LastName ?? empObj.lastName ?? "",
          gender: empObj.Gender ?? empObj.gender ?? null,
          dob: empObj.DOB ?? empObj.dob ?? empObj.DateOfBirth ?? null,
          contactNo: empObj.ContactNo ?? empObj.Phone ?? empObj.contactNo ?? "",
          email: empObj.Email ?? empObj.email ?? "",
          joinDate: empObj.JoinDate ?? empObj.joinDate ?? empObj.DOJ ?? null,
          status:
            (empObj.Status ?? empObj.status ?? 1) === 1 ||
            empObj.Status === true ||
            empObj.status === true,
          companyId: Number(
            empObj.CompanyID ??
              empObj.CompanyId ??
              empObj.companyId ??
              companyId
          ),
          branchId: Number(
            empObj.BranchID ?? empObj.BranchId ?? empObj.branchId ?? null
          ),
          departmentId: Number(
            empObj.DepartmentID ??
              empObj.DepartmentId ??
              empObj.departmentId ??
              null
          ),
          subDepartmentId: Number(
            empObj.SubDepartmentID ??
              empObj.SubDepartmentId ??
              empObj.subDepartmentId ??
              null
          ),
          designationId: Number(
            empObj.DesignationID ??
              empObj.DesignationId ??
              empObj.designationId ??
              null
          ),
          positionId: Number(
            empObj.PositionID ?? empObj.PositionId ?? empObj.positionId ?? null
          ),
        };

        setEmployeeId(e.employeeId ?? null);
        setEmployeeCode(e.employeeCode ?? "");
        setFirstName(e.firstName);
        setLastName(e.lastName);
        setGender(e.gender);
        setDob(parseDate(e.dob));
        setContactNo(e.contactNo);
        setEmail(e.email);
        setJoinDate(parseDate(e.joinDate));
        setStatus(!!e.status);

        setBranchId(e.branchId ?? null);
        setDepartmentId(e.departmentId ?? null);
        setSubDepartmentId(e.subDepartmentId ?? null);
        setDesignationId(e.designationId ?? null);
        setPositionId(e.positionId ?? null);
      } catch (err) {
        console.error("Load employee error:", err);
        showToast("error", "Error", "Failed to load employee details.");
      } finally {
        setLoadingInitial(false);
      }
    };

    loadEmployee(numericEmployeeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, numericEmployeeId]);

  // ----------------------------
  // Auto-generate employee code on mount (if not editing)
  // ----------------------------
  useEffect(() => {
    if (!isEdit) {
      const code = buildEmployeeCode(null, null, null, null, null);
      setEmployeeCode(code);
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-generate employee code only when hierarchy changes and if user hasn't manually entered a code
  const generatedCode = useMemo(
    () =>
      buildEmployeeCode(
        branchId,
        departmentId,
        subDepartmentId,
        designationId,
        positionId
      ),
    [
      branchId,
      departmentId,
      subDepartmentId,
      designationId,
      positionId,
      buildEmployeeCode,
    ]
  );

  useEffect(() => {
    if (!employeeCode || employeeCode.trim() === "") {
      if (
        branchId ||
        departmentId ||
        subDepartmentId ||
        designationId ||
        positionId
      ) {
        setEmployeeCode(generatedCode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    generatedCode,
    branchId,
    departmentId,
    subDepartmentId,
    designationId,
    positionId,
  ]);

  const resetForm = useCallback(() => {
    setEmployeeId(null);
    setFirstName("");
    setLastName("");
    setGender(null);
    setDob(null);
    setContactNo("");
    setEmail("");
    setJoinDate(null);
    setBranchId(null);
    setDepartmentId(null);
    setSubDepartmentId(null);
    setDesignationId(null);
    setPositionId(null);
    setStatus(true);
    setEmployeeCode(buildEmployeeCode(null, null, null, null, null));
  }, [buildEmployeeCode]);

  const buildPayload = useCallback((): EmployeeBasic => {
    if (!dob || !joinDate) throw new Error("Invalid dates.");
    return {
      employeeId: employeeId ?? undefined,
      employeeCode: employeeCode.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender: String(gender ?? ""),
      dob: formatDate(dob),
      contactNo: contactNo.trim(),
      email: email.trim(),
      joinDate: formatDate(joinDate),
      status,
      companyId,
      branchId: Number(branchId ?? 0),
      departmentId: Number(departmentId ?? 0),
      subDepartmentId: Number(subDepartmentId ?? 0),
      designationId: Number(designationId ?? 0),
      positionId: Number(positionId ?? 0),
    };
  }, [
    employeeId,
    employeeCode,
    firstName,
    lastName,
    gender,
    dob,
    contactNo,
    email,
    joinDate,
    status,
    branchId,
    departmentId,
    subDepartmentId,
    designationId,
    positionId,
  ]);

  const validate = useCallback(() => {
    const missing: string[] = [];
    if (!employeeCode || !employeeCode.trim()) missing.push("Employee Code");
    if (!firstName.trim()) missing.push("First Name");
    if (!lastName.trim()) missing.push("Last Name");
    if (!gender) missing.push("Gender");
    if (!dob) missing.push("Date of Birth");
    if (!contactNo.trim()) missing.push("Contact No");
    if (!email.trim()) missing.push("Email");
    if (!joinDate) missing.push("Join Date");
    if (!branchId) missing.push("Branch");
    if (!departmentId) missing.push("Department");
    if (!subDepartmentId) missing.push("Sub Department");
    if (!designationId) missing.push("Designation");
    if (!positionId) missing.push("Position");

    if (missing.length) {
      showToast(
        "error",
        "Validation Error",
        `Missing / invalid: ${missing.join(", ")}`
      );
      return false;
    }
    return true;
  }, [
    employeeCode,
    firstName,
    lastName,
    gender,
    dob,
    contactNo,
    email,
    joinDate,
    branchId,
    departmentId,
    subDepartmentId,
    designationId,
    positionId,
    showToast,
  ]);

  const handleInsert = useCallback(async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const payload = buildPayload();
      const { data } = await api.post("/EmpBasic_Insert", payload);
      showToast(
        "success",
        "Success",
        data?.message ?? "Employee inserted successfully."
      );
      resetForm();
      navigate("/EmployeeList");
    } catch (err: any) {
      console.error("Insert Error:", err);
      showToast(
        "error",
        "Error",
        err?.response?.data?.message ?? "Failed to insert employee."
      );
    } finally {
      setLoading(false);
    }
  }, [validate, buildPayload, resetForm, navigate, showToast]);

  const handleUpdate = useCallback(async () => {
    if (!validate()) return;
    if (!employeeId) {
      showToast("error", "Error", "Missing EmployeeId for update.");
      return;
    }
    try {
      setLoading(true);
      const payload = buildPayload();
      const { data } = await api.post("/EmpBasic_Update", {
        ...payload,
        EmployeeId: employeeId,
      });
      showToast(
        "success",
        "Updated",
        data?.message ?? "Employee updated successfully."
      );
      navigate("/EmployeeList");
    } catch (err: any) {
      console.error("Update Error:", err);
      showToast(
        "error",
        "Error",
        err?.response?.data?.message ?? "Failed to update employee."
      );
    } finally {
      setLoading(false);
    }
  }, [validate, buildPayload, employeeId, navigate, showToast]);

  // helpers for filters:
  const belongsToCompany = (itemCompanyId: number | null | undefined) =>
    itemCompanyId == null || itemCompanyId === companyId;

  // ----------------------------
  // Derive options (label/value) for Dropdowns (robust to nulls)
  // ----------------------------
  const branchOptions = useMemo(
    () =>
      branches
        .filter((b) => belongsToCompany(b.companyId))
        .map((b) => ({
          label: b.branchName ?? `Branch ${b.branchId ?? "?"}`,
          value: b.branchId,
        })),
    [branches]
  );

  const deptOptions = useMemo(
    () =>
      departments
        .filter(
          (d) =>
            belongsToCompany(d.companyId) &&
            (d.branchId == null || branchId == null
              ? true
              : d.branchId === branchId)
        )
        .map((d) => ({
          label: d.name ?? `Dept ${d.departmentId ?? "?"}`,
          value: d.departmentId,
        })),
    [departments, branchId]
  );

  const subDeptOptions = useMemo(
    () =>
      subDepartments
        .filter(
          (s) =>
            belongsToCompany(s.companyId) &&
            (s.branchId == null || branchId == null
              ? true
              : s.branchId === branchId) &&
            (s.departmentId == null || departmentId == null
              ? true
              : s.departmentId === departmentId)
        )
        .map((s) => ({
          label: s.subDepartmentName ?? `Sub ${s.subDepartmentId ?? "?"}`,
          value: s.subDepartmentId,
        })),
    [subDepartments, branchId, departmentId]
  );

  const designationOptions = useMemo(
    () =>
      designations
        .filter(
          (d) =>
            belongsToCompany(d.companyId) &&
            (d.branchId == null || branchId == null
              ? true
              : d.branchId === branchId) &&
            (d.departmentId == null || departmentId == null
              ? true
              : d.departmentId === departmentId) &&
            (d.subDepartmentId == null || subDepartmentId == null
              ? true
              : d.subDepartmentId === subDepartmentId)
        )
        .map((d) => ({
          label: d.designationName ?? `Desig ${d.designationId ?? "?"}`,
          value: d.designationId,
        })),
    [designations, branchId, departmentId, subDepartmentId]
  );

  const positionOptions = useMemo(
    () =>
      positions
        .filter(
          (p) =>
            belongsToCompany(p.companyId) &&
            (p.branchId == null || branchId == null
              ? true
              : p.branchId === branchId) &&
            (p.departmentId == null || departmentId == null
              ? true
              : p.departmentId === departmentId) &&
            (p.designationId == null || designationId == null
              ? true
              : p.designationId === designationId)
        )
        .map((p) => ({
          label: p.positionName ?? `Pos ${p.positionId ?? "?"}`,
          value: p.positionId,
        })),
    [positions, branchId, departmentId, designationId]
  );

  return (
    <div className="container">
      <Toast ref={toastRef} />
      <h2>{isEdit ? "Edit Employee" : "Employee Basic Master"}</h2>

      {loadingInitial ? (
        <p style={{ color: "#666" }}>Loading employee details…</p>
      ) : (
        <>
          <div className="form-grid">
            <div className="field">
              <label>Employee Code*</label>
              <InputText
                value={employeeCode}
                onChange={(e: any) => setEmployeeCode(e.target.value)}
                placeholder="Auto-generated (editable)"
              />
            </div>

            <div className="field">
              <label>First Name*</label>
              <InputText
                placeholder="Enter first name"
                value={firstName}
                onChange={(e: any) => setFirstName(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Last Name*</label>
              <InputText
                placeholder="Enter last name"
                value={lastName}
                onChange={(e: any) => setLastName(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Gender*</label>
              <Dropdown
                value={gender}
                options={["Male", "Female", "Other"].map((g) => ({
                  label: g,
                  value: g,
                }))}
                onChange={(e: any) => setGender(e.value)}
                placeholder="Select Gender"
              />
            </div>

            <div className="field">
              <label>Date of Birth*</label>
              <Calendar
                value={dob}
                onChange={(e: any) => setDob(e.value as Date)}
                dateFormat="yy-mm-dd"
                showIcon
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div className="field">
              <label>Contact No*</label>
              <InputText
                placeholder="Enter contact number"
                value={contactNo}
                onChange={(e: any) => setContactNo(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Email*</label>
              <InputText
                placeholder="Enter email"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Join Date*</label>
              <Calendar
                value={joinDate}
                onChange={(e: any) => setJoinDate(e.value as Date)}
                dateFormat="yy-mm-dd"
                showIcon
                placeholder="YYYY-MM-DD"
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
                onChange={(e: any) => setStatus(e.value)}
                placeholder="Select Status"
              />
            </div>

            <div className="field">
              <label>Company*</label>
              <InputText value={companyName} disabled />
            </div>

            <div className="field">
              <label>Branch*</label>
              <Dropdown
                value={branchId}
                options={branchOptions}
                onChange={(e: any) => {
                  setBranchId(e.value);
                  setDepartmentId(null);
                  setSubDepartmentId(null);
                  setDesignationId(null);
                  setPositionId(null);
                }}
                placeholder="Select Branch"
              />
            </div>

            <div className="field">
              <label>Department*</label>
              <Dropdown
                value={departmentId}
                options={deptOptions}
                onChange={(e: any) => {
                  setDepartmentId(e.value);
                  setSubDepartmentId(null);
                  setDesignationId(null);
                  setPositionId(null);
                }}
                disabled={
                  branchOptions.length === 0 &&
                  departments.every((d) => d.branchId != null)
                }
                placeholder="Select Department"
              />
            </div>

            <div className="field">
              <label>Sub Department*</label>
              <Dropdown
                value={subDepartmentId}
                options={subDeptOptions}
                onChange={(e: any) => {
                  setSubDepartmentId(e.value);
                  setDesignationId(null);
                  setPositionId(null);
                }}
                disabled={
                  deptOptions.length === 0 &&
                  subDepartments.every((s) => s.departmentId != null)
                }
                placeholder="Select Sub Department"
              />
            </div>

            <div className="field">
              <label>Designation*</label>
              <Dropdown
                value={designationId}
                options={designationOptions}
                onChange={(e: any) => {
                  setDesignationId(e.value);
                  setPositionId(null);
                }}
                disabled={
                  subDeptOptions.length === 0 &&
                  designations.every((d) => d.subDepartmentId != null)
                }
                placeholder="Select Designation"
              />
            </div>

            <div className="field">
              <label>Position*</label>
              <Dropdown
                value={positionId}
                options={positionOptions}
                onChange={(e: any) => setPositionId(e.value)}
                disabled={
                  designationOptions.length === 0 &&
                  positions.every((p) => p.designationId != null)
                }
                placeholder="Select Position"
              />
            </div>
          </div>

          <div className="button-group" style={{ marginTop: "1rem" }}>
            {!isEdit ? (
              <Button
                label={loading ? "Inserting..." : "Insert Employee"}
                icon="pi pi-check"
                className="p-button-success"
                onClick={handleInsert}
                disabled={loading}
              />
            ) : (
              <Button
                label={loading ? "Updating..." : "Update Employee"}
                icon="pi pi-save"
                className="p-button-warning"
                onClick={handleUpdate}
                disabled={loading}
              />
            )}

            <Button
              label="Employee List"
              icon="pi pi-list"
              className="p-button-secondary"
              onClick={() => navigate("/EmployeeList")}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeBasicMaster;
