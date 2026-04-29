"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { AuthUser, AuthContextType } from "../types/auth";
import { authApi, ApiError } from "../lib/apiClient";

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "auth_token";
const USER_KEY  = "auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // ✅ true on start

  // ✅ Rehydrate session on app load
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser  = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser) as Omit<AuthUser, "token">;
        setUser({ ...parsedUser, token: storedToken });
      }
    } catch {
      // corrupted storage — clear it
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false); // ✅ done checking, render app
    }
  }, []);

  // ✅ Register — throws ApiError on failure so the page can show the message
  const register = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      // throws if API fails — caller handles the error
      await authApi.register({ name, email, password });
      // ✅ Don't auto-login after register — send to login page with success msg
    },
    []
  );

  // ✅ Login — sets user state and persists to localStorage
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await authApi.login({ email, password });

      const authUser: AuthUser = {
        name:  response.name,
        email: response.email,
        token: response.token,
      };

      // ✅ Persist session
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(
        USER_KEY,
        JSON.stringify({ name: response.name, email: response.email })
      );

      setUser(authUser);
    },
    []
  );

  // ✅ Logout — wipe everything
  const logout = useCallback((): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Custom hook with type guard
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth() must be used inside <AuthProvider>");
  }
  return context;
}