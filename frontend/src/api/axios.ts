import axios, { type AxiosError } from "axios";

export const BASE_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1";

export const TOKEN_STORAGE_KEY = "project_hub_token";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface ApiErrorBody {
  success: boolean;
  error?: string;
}

/** Pulls the backend's `{ error }` message out of a failed request, falling
 * back to a generic message for network/unexpected errors. */
export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<ApiErrorBody>).response?.data;
    if (data?.error) return data.error;
    return err.message || "Не удалось выполнить запрос";
  }
  if (err instanceof Error) return err.message;
  return "Произошла непредвиденная ошибка";
}

export default api;
