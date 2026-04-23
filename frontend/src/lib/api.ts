import type { ApiResponse } from "../../../shared/contracts";

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  token?: string | null;
  body?: unknown;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const hasJsonBody = response.headers.get("content-type")?.includes("application/json");
  const payload = hasJsonBody ? ((await response.json()) as ApiResponse<T>) : null;

  if (!response.ok || !payload?.success) {
    throw new ApiClientError(
      response.status,
      payload && !payload.success ? payload.error.code : "HTTP_ERROR",
      payload && !payload.success ? payload.error.message : "Request failed.",
      payload && !payload.success ? payload.error.details : undefined,
    );
  }

  return payload.data;
}
