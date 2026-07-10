import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:4000",
});

// Attach the saved token (if any) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vsp_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function saveToken(token: string) {
  localStorage.setItem("vsp_token", token);
}

export function clearToken() {
  localStorage.removeItem("vsp_token");
}

export function getToken() {
  return localStorage.getItem("vsp_token");
}
