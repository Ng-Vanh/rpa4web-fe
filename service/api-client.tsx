import axios from "axios";
import { getAuthHeaders } from "./auth-utils";

export const MAIN_API_BASE_URL =
  process.env.NEXT_PUBLIC_MAIN_BACKEND_URL || "http://localhost:8124/api";

export const AI_API_BASE_URL =
  process.env.NEXT_PUBLIC_AI_BACKEND_URL || "http://localhost:8130/api";

export const apiClient = axios.create({
  baseURL: MAIN_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  Object.assign(config.headers, getAuthHeaders());
  return config;
});

export function aiNotAvailable(feature: string): never {
  throw new Error(
    `${feature} chưa được triển khai trong rpa4web-fe-new. Chức năng này sẽ được nối qua rpa4web-ai ở phase tiếp theo.`
  );
}
