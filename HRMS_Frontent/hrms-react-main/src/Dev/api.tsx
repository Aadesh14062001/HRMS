// // src/api.ts
// import axios from "axios";
// import { getToken } from "./auth";

// /* ----------------------------------------------------------
//    ENVIRONMENT-SAFE BASE URL HANDLING
//    - Works in CRA, Vite, Webpack, Next.js CSR
// ----------------------------------------------------------- */

// // allow TypeScript compile where `process` may not be defined
// declare const process: any;

// const envApiUrl =
//   typeof process !== "undefined" ? process?.env?.REACT_APP_API_URL : "";
// const viteApiUrl =
//   typeof import.meta !== "undefined"
//     ? (import.meta as any)?.env?.VITE_API_URL
//     : "";
// const baseURL = envApiUrl || viteApiUrl || "http://localhost:5055";

// /* ----------------------------------------------------------
//    AXIOS INSTANCE
// ----------------------------------------------------------- */
// export const api = axios.create({
//   baseURL,
//   headers: {
//     "Content-Type": "application/json",
//     Accept: "application/json",
//   },
//   timeout: 20000,
// });

// /* ----------------------------------------------------------
//    REQUEST INTERCEPTOR → ATTACH JWT
// ----------------------------------------------------------- */
// api.interceptors.request.use((config) => {
//   const token = getToken();
//   if (token) {
//     config.headers = config.headers ?? {};
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// /* ----------------------------------------------------------
//    RESPONSE INTERCEPTOR → AUTO-LOGOUT ON 401/403
//    - This will clear stored auth and redirect to login.
// ----------------------------------------------------------- */
// api.interceptors.response.use(
//   (res) => res,
//   (err) => {
//     const status = err?.response?.status;
//     if (status === 401 || status === 403) {
//       try {
//         localStorage.removeItem("hrms_token");
//         localStorage.removeItem("hrms_user");
//         localStorage.removeItem("hrms_roles");
//       } catch {}
//       // hard redirect to login
//       window.location.href = "/Login";
//     }
//     return Promise.reject(err);
//   }
// );

// export default api;
// src/api.ts
// src/Dev/api.tsx  (or src/api.ts)
// src/api.ts
// src/Dev/api.ts
import axios from "axios";
import { getToken } from "./auth";

// allow TS to compile even if process doesn't exist in browser
declare const process: any;

const craUrl =
  typeof process !== "undefined" && process?.env?.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL
    : "";

const viteUrl =
  typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_API_URL
    ? (import.meta as any).env.VITE_API_URL
    : "";

const baseURL = craUrl || viteUrl || "http://localhost:5055";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      try {
        localStorage.removeItem("hrms_token");
        localStorage.removeItem("hrms_user");
        localStorage.removeItem("hrms_roles");
      } catch {}
      window.location.href = "/Login";
    }
    return Promise.reject(err);
  }
);

export default api;
