// ✅ Industry pattern: one file owns all API calls
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface ApiCallOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
}

// ✅ Generic fetch wrapper — works for any endpoint
async function apiCall<T>(endpoint: string, options: ApiCallOptions): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // ✅ Attach JWT token to every request that needs auth
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // ✅ Parse error response from Spring Boot
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message ?? "Something went wrong");
  }

  return response.json() as Promise<T>;
}

// ✅ Auth-specific API calls
import { AuthResponse } from "../types/auth";

export const authApi = {
  register: (name: string, email: string, password: string) =>
    apiCall<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: { name, email, password },
    }),

  login: (email: string, password: string) =>
    apiCall<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),
};