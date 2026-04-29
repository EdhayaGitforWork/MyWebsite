// ✅ What we send to register
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// ✅ What we send to login
export interface LoginRequest {
  email: string;
  password: string;
}

// ✅ What Spring Boot sends back on success
export interface AuthResponse {
  token: string;
  name: string;
  email: string;
}

// ✅ Logged-in user stored in context (never store password!)
export interface AuthUser {
  name: string;
  email: string;
  token: string;
}

// ✅ Shape of our global auth context
export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ✅ API error shape — Spring Boot returns this on failure
export interface ApiErrorResponse {
  message: string;
  status: number;
  timestamp?: string;
}