// src/auth.ts
export function clearAuthAndRedirectToLogin() {
  try {
    localStorage.removeItem("hrms_token");
    localStorage.removeItem("hrms_user");
    localStorage.removeItem("hrms_roles");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authUser");
  } catch {}
  window.location.href = "/Login";
}

export type Session = {
  token: string;
  username?: string;
  roles?: string[];
  [k: string]: any;
};

const KEY_TOKEN = "hrms_token";
const KEY_USER = "hrms_user";
const KEY_ROLES = "hrms_roles";

export function normalizeRoles(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .filter((x): x is string => typeof x === "string")
      .map((r) => r.trim())
      .filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
  }
  return [];
}

export function setSession(
  token: string,
  usernameOrUser: string | object,
  roles: unknown
) {
  const norm = normalizeRoles(roles);
  localStorage.setItem(KEY_TOKEN, token);

  if (typeof usernameOrUser === "string") {
    localStorage.setItem(KEY_USER, usernameOrUser);
  } else {
    try {
      let userObj: any = usernameOrUser as any;

      // Try to enrich from token claims if missing
      const payload = decodeJwtPayload(token);
      if (payload) {
        if (!userObj.EmployeeID && (payload.EmployeeID || payload.employeeId)) {
          userObj.EmployeeID = payload.EmployeeID ?? payload.employeeId;
        }
        if (
          !userObj.EmployeeCode &&
          (payload.EmployeeCode || payload.employeeCode || payload.sub)
        ) {
          userObj.EmployeeCode =
            payload.EmployeeCode ?? payload.employeeCode ?? payload.sub;
        }
        if (!userObj.username && (payload.sub || payload.username)) {
          userObj.username = payload.sub ?? payload.username;
        }
      }

      localStorage.setItem(KEY_USER, JSON.stringify(userObj));
    } catch {
      localStorage.setItem(KEY_USER, "");
    }
  }

  localStorage.setItem(KEY_ROLES, JSON.stringify(norm));
}

export function setUser(user: object | null) {
  if (user === null) {
    localStorage.removeItem(KEY_USER);
    return;
  }
  try {
    localStorage.setItem(KEY_USER, JSON.stringify(user));
  } catch {}
}

export function getUser(): any | null {
  const raw = localStorage.getItem(KEY_USER);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return raw;
  }
}

export function getEmployeeId(): number | null {
  const u = getUser();
  if (!u) return null;
  if (typeof u === "string") return null;
  const candidates = [
    "employeeId",
    "EmployeeId",
    "EmployeeID",
    "id",
    "Id",
    "UserId",
    "userId",
  ];
  for (const k of candidates) {
    if (k in u) {
      const v = u[k];
      if (typeof v === "number") return v;
      if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)))
        return Number(v);
    }
  }
  if (u.profile && typeof u.profile === "object") {
    for (const k of candidates) {
      if (k in u.profile) {
        const v = u.profile[k];
        if (typeof v === "number") return v;
        if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)))
          return Number(v);
      }
    }
  }
  // fallback: try token claims
  const tokenId = getEmployeeFromToken()?.EmployeeID;
  if (tokenId) return tokenId;
  return null;
}

export function getEmployeeCode(): string | null {
  const u = getUser();
  if (!u) return null;
  if (typeof u === "string") return u;
  const candidates = [
    "employeeCode",
    "EmployeeCode",
    "employeecode",
    "code",
    "username",
    "userName",
    "Email",
    "email",
  ];
  for (const k of candidates) {
    if (k in u && typeof u[k] === "string" && u[k].trim()) return u[k].trim();
  }
  if (u.profile && typeof u.profile === "object") {
    for (const k of candidates) {
      if (
        k in u.profile &&
        typeof u.profile[k] === "string" &&
        u.profile[k].trim()
      )
        return u.profile[k].trim();
    }
  }
  // fallback: from token claims
  const tokenCode = getEmployeeFromToken()?.EmployeeCode;
  if (tokenCode) return tokenCode;
  return null;
}

export function getToken(): string | null {
  return localStorage.getItem(KEY_TOKEN);
}

export function getUsername(): string | null {
  const raw = localStorage.getItem(KEY_USER);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj) return null;
    if (typeof obj.username === "string" && obj.username.trim())
      return obj.username;
    if (typeof obj.userName === "string" && obj.userName.trim())
      return obj.userName;
    if (typeof obj.EmployeeCode === "string" && obj.EmployeeCode.trim())
      return obj.EmployeeCode;
    if (typeof obj.employeeCode === "string" && obj.employeeCode.trim())
      return obj.employeeCode;
    if (typeof obj.email === "string" && obj.email.trim()) return obj.email;
    return null;
  } catch {
    return raw;
  }
}

export function getRoles(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_ROLES) || "[]") as string[];
  } catch {
    return [];
  }
}

export function logout(): void {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_ROLES);
  localStorage.removeItem("accessToken");
  localStorage.removeItem("authUser");
}

export function hasRole(role: string): boolean {
  return getRoles().includes(role);
}
export function hasAnyRole(required: string[]): boolean {
  const roles = getRoles();
  return required.length === 0 || roles.some((r) => required.includes(r));
}
export function isAdmin(): boolean {
  return hasRole("Admin");
}
export function isHR(): boolean {
  return hasRole("HR");
}
export function isManager(): boolean {
  return hasRole("Manager");
}
export function isEmployee(): boolean {
  return hasRole("Employee");
}

/** Decode JWT payload (no validation) */
export function decodeJwtPayload(token?: string): any | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    // standard base64 decode (handle urlsafe)
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // pad as needed
    const pad = b64.length % 4;
    const padded = pad === 2 ? b64 + "==" : pad === 3 ? b64 + "=" : b64;
    const jsonStr = atob(padded);
    try {
      return JSON.parse(jsonStr);
    } catch {
      // some JWTs may be compressed/encoded differently; return raw string fallback
      return null;
    }
  } catch {
    return null;
  }
}

/** Extract employee info from token claims if available */
export function getEmployeeFromToken(): {
  EmployeeID?: number;
  EmployeeCode?: string;
} | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const id =
    payload.EmployeeID ??
    payload.employeeId ??
    payload.empId ??
    payload.UserId ??
    null;
  const code =
    payload.EmployeeCode ??
    payload.employeeCode ??
    payload.username ??
    payload.sub ??
    null;
  return {
    EmployeeID: id ? Number(id) : undefined,
    EmployeeCode: code ? String(code) : undefined,
  };
}

export function tokenExpired(token?: string): boolean {
  const payload = decodeJwtPayload(token || getToken() || undefined);
  if (!payload || !payload.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}

export function isAuthed(): boolean {
  const token = getToken();
  if (!token) return false;
  if (tokenExpired(token)) return false;
  return true;
}
