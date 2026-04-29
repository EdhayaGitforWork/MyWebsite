const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ✅ Custom error class so we can catch API errors specifically
export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ✅ Generic typed fetch wrapper
async function request<TResponse>(
  endpoint: string,
  options: RequestInit = {}
): Promise<TResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // ✅ Try to parse error body from Spring Boot
  if (!response.ok) {
    let errorMessage = "Something went wrong. Please try again.";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message ?? errorMessage;
    } catch {
      // response body wasn't JSON — use default message
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<TResponse>;
}

// ✅ Authenticated request — attaches JWT automatically
export async function authRequest<TResponse>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<TResponse> {
  return request<TResponse>(endpoint, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    },
  });
}

// ── Auth API calls ──────────────────────────────────────────────────

import type { AuthResponse, RegisterRequest, LoginRequest } from "../types/auth";

export const authApi = {
  register: (data: RegisterRequest): Promise<AuthResponse> =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: LoginRequest): Promise<AuthResponse> =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};