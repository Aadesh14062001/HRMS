// src/Dev/PayrollUpload.tsx
import { useEffect, useRef, useState } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { FileUpload } from "primereact/fileupload";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import api from "./api";

export default function PayrollUpload() {
  const [slipId, setSlipId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const toast = useRef<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Upload Payslip PDF";
  }, []);

  const onFileSelect = (e: any) => {
    const f = e.currentFiles?.[0] ?? null;
    setFile(f);
  };

  const onSubmit = async (e?: any) => {
    e?.preventDefault();
    if (!slipId.trim() || !file) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "SlipId and file are required",
        life: 3000,
      });
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("SlipId", slipId.trim());
      form.append("file", file);
      const res = await api.post("/PayrollSlips/UploadPDF", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res?.data?.result) {
        toast.current?.show({
          severity: "success",
          summary: "Uploaded",
          detail: "PDF uploaded",
          life: 3000,
        });
        setFile(null);
        setSlipId("");
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: res?.data?.message || "Upload failed",
        });
      }
    } catch (err: any) {
      toast.current?.show({
        severity: "error",
        summary: "Network",
        detail: err?.message || "Error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Toast ref={toast} />
      <h3>Upload Payslip PDF</h3>
      <Card className="p-4">
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div>
            <label>SlipId</label>
            <InputText
              value={slipId}
              onChange={(e) => setSlipId((e.target as any).value)}
            />
          </div>

          <div>
            <label>PDF File</label>
            <FileUpload
              chooseOptions={{ label: "Choose" }}
              accept="application/pdf"
              maxFileSize={10 * 1024 * 1024}
              customUpload
              uploadHandler={() => {}}
              onSelect={onFileSelect}
              auto={false}
            />
            <div style={{ marginTop: 8 }}>
              {file ? file.name : "No file chosen"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Button
              label={busy ? "Uploading..." : "Upload"}
              icon="pi pi-upload"
              disabled={busy}
              onClick={onSubmit}
            />
            <Button
              label="Clear"
              className="p-button-secondary"
              onClick={() => {
                setSlipId("");
                setFile(null);
              }}
            />
          </div>
        </form>
      </Card>
    </div>
  );
}
