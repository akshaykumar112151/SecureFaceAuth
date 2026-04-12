import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => Promise.reject(error),
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint =
        error.config?.url?.includes("/auth/face-auth") ||
        error.config?.url?.includes("/auth/enroll-face") ||
        error.config?.url?.includes("/auth/enroll-voice") ||
        error.config?.url?.includes("/auth/step/");
      if (!isAuthEndpoint) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const enrollFace = (data) => API.post("/auth/enroll-face", data);
export const faceAuthenticate = (data) => API.post("/auth/face-auth", data);

// ── Step-wise Auth (new) ───────────────────────────
export const stepBlink = (data) => API.post("/auth/step/blink", data);
export const stepChallenge = (data) => API.post("/auth/step/challenge", data);
export const stepVoice = (data) => API.post("/auth/step/voice", data);
export const stepFinal = (data) => API.post("/auth/step/final", data);

// ── Voice ──────────────────────────────────────────
export const enrollVoice = (data) => API.post("/auth/enroll-voice", data);
export const getVoiceStatus = () => API.get("/auth/voice-status");

// ── Admin ──────────────────────────────────────────
export const getStats = () => API.get("/admin/stats");
export const getUsers = () => API.get("/admin/users");
export const getLogs = () => API.get("/admin/logs");
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);
export const toggleUser = (id) => API.put(`/admin/users/${id}/toggle`);

export default API;
