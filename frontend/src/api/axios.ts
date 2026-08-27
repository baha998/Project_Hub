import axios, { type AxiosError } from "axios";

const API_VERSION_PREFIX = "/api/v1";
const DEFAULT_API_URL = `http://localhost:8080${API_VERSION_PREFIX}`;

/** Backend routes are all mounted under /api/v1 (see internal/handler/http/router.go).
 * VITE_API_URL is meant to hold that full base (e.g. https://api.example.com/api/v1),
 * but it's an easy mistake to set it to just the bare origin — normalizing here means
 * either form ends up hitting the right path instead of a 404. */
function resolveBaseURL(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw) return DEFAULT_API_URL;
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith(API_VERSION_PREFIX) ? trimmed : `${trimmed}${API_VERSION_PREFIX}`;
}

export const BASE_URL: string = resolveBaseURL();

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
