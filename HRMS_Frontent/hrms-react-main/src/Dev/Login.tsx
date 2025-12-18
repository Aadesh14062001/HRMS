// import { useRef, useState, useEffect } from "react";
// import { Toast } from "primereact/toast";
// import { Card } from "primereact/card";
// import { InputText } from "primereact/inputtext";
// import { Password } from "primereact/password";
// import { Checkbox } from "primereact/checkbox";
// import { Button } from "primereact/button";
// import api from "./api";
// import { normalizeRoles, setSession } from "./auth";

// function rolesFromJwt(token: string): string[] {
//   try {
//     const payload = JSON.parse(atob(token.split(".")[1]));
//     const claim = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
//     if (!claim) return [];
//     return Array.isArray(claim) ? claim.map(String) : [String(claim)];
//   } catch {
//     return [];
//   }
// }

// export default function Login() {
//   const toastRef = useRef<Toast>(null);
//   const [username, setUsername] = useState<string>(localStorage.getItem("hrms_username_hint") || "");
//   const [password, setPassword] = useState("");
//   const [remember, setRemember] = useState(localStorage.getItem("hrms_remember") === "1");
//   const [busy, setBusy] = useState(false);

//   useEffect(() => {
//     document.title = "HRMS • Sign in";
//   }, []);

//   const showError = (summary: string, detail?: string) =>
//     toastRef.current?.show({ severity: "error", summary, detail, life: 3500 });

//   const submit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!username.trim() || !password) return;
//     setBusy(true);
//     try {
//       const res = await api.post("/Auth/Login", { username: username.trim(), password });
//       const json = res?.data;
//       if (!json?.result) {
//         showError("Login failed", json?.message || "Invalid credentials");
//         return;
//       }
//       const { token, roles, username: returnedUsername, user } = json.data ?? {};
//       if (!token) {
//         showError("Login failed", "Missing token from server");
//         return;
//       }

//       const rolesFromApi = normalizeRoles(roles);
//       const rolesFromToken = rolesFromJwt(token);
//       const finalRoles = rolesFromApi.length > 0 ? rolesFromApi : rolesFromToken;

//       // store session (setSession attaches token + user + roles)
//       setSession(token, user ?? { username: returnedUsername ?? username.trim() }, finalRoles);

//       if (remember) {
//         localStorage.setItem("hrms_username_hint", username.trim());
//         localStorage.setItem("hrms_remember", "1");
//       } else {
//         localStorage.removeItem("hrms_username_hint");
//         localStorage.removeItem("hrms_remember");
//       }

//       window.location.href = "/Home";
//     } catch (err: any) {
//       showError("Network error", err?.response?.data?.message || err.message || "Please try again");
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
//     <div className="login-shell">
//       <Toast ref={toastRef} />
//       <Card className="login-card p-4">
//         <div className="brand">
//           <i className="pi pi-shield" />
//           <span>HRMS Portal</span>
//         </div>

//         <form onSubmit={submit} className="login-form">
//           <div className="p-field">
//             <InputText id="username" value={username} onChange={(e) => setUsername((e.target as any).value)} autoComplete="username" placeholder="Username" />
//           </div>

//           <div className="p-field">
//             <Password id="password" value={password} onChange={(e) => setPassword((e.target as any).value)} toggleMask feedback={false} placeholder="Password" />
//           </div>

//           <div className="p-field remember-line">
//             <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//               <Checkbox inputId="remember" checked={remember} onChange={(e) => setRemember(!!(e as any).checked)} />
//               <label htmlFor="remember">Remember me</label>
//             </div>

//             <button type="button" className="linklike" onClick={() => toastRef.current?.show({ severity: "info", summary: "Forgot Password", detail: "Contact HR/Administrator to reset password.", life: 3000 })}>
//               Forgot password?
//             </button>
//           </div>

//           <Button type="submit" label={busy ? "Signing in..." : "Sign in"} icon={busy ? "pi pi-spin pi-spinner" : "pi pi-sign-in"} disabled={busy || !username.trim() || !password} className="w-full p-button-primary" />
//         </form>
//       </Card>
//     </div>
//   );
// }

// src/Dev/Login.tsx
import { useRef, useState, useEffect } from "react";
import { Toast } from "primereact/toast";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import api from "./api";
import { normalizeRoles, setSession } from "./auth";

function rolesFromJwt(token: string): string[] {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const claim =
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    if (!claim) return [];
    return Array.isArray(claim) ? claim.map(String) : [String(claim)];
  } catch {
    return [];
  }
}

export default function Login() {
  const toastRef = useRef<Toast | null>(null);
  const usernameRef = useRef<HTMLInputElement | null>(null);

  const [username, setUsername] = useState<string>(
    localStorage.getItem("hrms_username_hint") || ""
  );
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(
    localStorage.getItem("hrms_remember") === "1"
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "HRMS • Sign in";
    // autofocus username
    usernameRef.current?.focus();
  }, []);

  const showError = (summary: string, detail?: string) =>
    toastRef.current?.show?.({
      severity: "error",
      summary,
      detail,
      life: 3500,
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      showError("Missing credentials", "Please enter username and password.");
      return;
    }

    setBusy(true);
    try {
      const res = await api.post("/Auth/Login", {
        username: username.trim(),
        password,
      });
      const json = res?.data;
      if (!json?.result) {
        showError("Login failed", json?.message || "Invalid credentials");
        return;
      }
      const {
        token,
        roles,
        username: returnedUsername,
        user,
      } = json.data ?? {};
      if (!token) {
        showError("Login failed", "Missing token from server");
        return;
      }

      const rolesFromApi = normalizeRoles(roles);
      const rolesFromToken = rolesFromJwt(token);
      const finalRoles =
        rolesFromApi.length > 0 ? rolesFromApi : rolesFromToken;

      // store session (setSession attaches token + user + roles)
      setSession(
        token,
        user ?? { username: returnedUsername ?? username.trim() },
        finalRoles
      );

      if (remember) {
        localStorage.setItem("hrms_username_hint", username.trim());
        localStorage.setItem("hrms_remember", "1");
      } else {
        localStorage.removeItem("hrms_username_hint");
        localStorage.removeItem("hrms_remember");
      }

      // redirect to home
      window.location.href = "/Home";
    } catch (err: any) {
      showError(
        "Network error",
        err?.response?.data?.message || err.message || "Please try again"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page-outer" role="main">
      <Toast ref={toastRef} />

      <Card className="login-card" aria-labelledby="login-heading">
        <div className="brand" aria-hidden>
          <i className="pi pi-shield" />
          <span>HRMS Portal</span>
        </div>

        <h1 id="login-heading" className="login-title">
          Sign in
        </h1>
        <p className="login-sub">
          Welcome back — sign in to continue to the HRMS portal
        </p>

        <form onSubmit={submit} className="login-form" noValidate>
          <div className="p-field">
            <label htmlFor="username" className="sr-only">
              Username
            </label>
            <InputText
              id="username"
              ref={usernameRef}
              value={username}
              onChange={(e) => setUsername((e.target as any).value)}
              autoComplete="username"
              placeholder="Username or Employee Code"
              className="w-full"
            />
          </div>

          <div className="p-field" style={{ position: "relative" }}>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <Password
              id="password"
              value={password}
              onChange={(e) => setPassword((e.target as any).value)}
              toggleMask
              feedback={false}
              placeholder="Password"
              className="w-full"
            />
          </div>

          <div className="p-field remember-line">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Checkbox
                inputId="remember"
                checked={remember}
                onChange={(e) => setRemember(!!(e as any).checked)}
              />
              <label htmlFor="remember">Remember me</label>
            </div>

            <button
              type="button"
              className="linklike"
              onClick={() =>
                toastRef.current?.show?.({
                  severity: "info",
                  summary: "Forgot Password",
                  detail: "Contact HR/Administrator to reset password.",
                  life: 3000,
                })
              }
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            label={busy ? "Signing in..." : "Sign in"}
            icon={busy ? "pi pi-spin pi-spinner" : "pi pi-sign-in"}
            disabled={busy}
            className="w-full p-button-primary"
          />
        </form>
      </Card>
    </div>
  );
}
