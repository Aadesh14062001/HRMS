// src/Dev/ResetPassword.tsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import api from "./api";

const ResetPassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toastRef = useRef<Toast | null>(null);
  const navigate = useNavigate();

  const showToast = (
    severity: "success" | "error" | "info" | "warn",
    summary: string,
    detail: string
  ) => {
    (toastRef.current as any)?.show?.({
      severity,
      summary,
      detail,
      life: 3500,
    });
  };

  const handleReset = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast("error", "Validation", "All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("error", "Mismatch", "New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/Auth/ResetPassword", {
        oldPassword,
        newPassword,
      });
      const data = res?.data ?? {};
      if (data?.result === true || res.status === 200) {
        showToast(
          "success",
          "Success",
          data.message ?? "Password reset successful."
        );
        setTimeout(() => navigate("/Home", { replace: true }), 900);
      } else {
        showToast("error", "Failed", data?.message ?? "Reset failed.");
      }
    } catch (err: any) {
      showToast(
        "error",
        "Error",
        err?.response?.data?.message ?? err?.message ?? "Reset failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 480, margin: "20px auto" }}>
      <Toast ref={toastRef as any} />
      <h2>Reset Password</h2>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label>Old Password</label>
          <InputText
            type="password"
            value={oldPassword}
            onChange={(e: any) => setOldPassword(e.target.value)}
          />
        </div>
        <div>
          <label>New Password</label>
          <InputText
            type="password"
            value={newPassword}
            onChange={(e: any) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label>Confirm New Password</label>
          <InputText
            type="password"
            value={confirmPassword}
            onChange={(e: any) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button
          label={loading ? "Resetting..." : "Reset Password"}
          icon="pi pi-refresh"
          className="p-button-warning"
          onClick={handleReset}
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default ResetPassword;
