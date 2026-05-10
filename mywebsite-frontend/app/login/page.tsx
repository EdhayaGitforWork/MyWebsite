"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/apiClient";
import InputField from "../components/ui/InputField";
import Alert from "../components/ui/Alert";

interface FormErrors {
  email?:    string;
  password?: string;
}

function LoginForm() {
  const { login, user, isLoading } = useAuth();
  const router                     = useRouter();
  const searchParams               = useSearchParams();

  const [email,        setEmail]        = useState<string>("");
  const [password,     setPassword]     = useState<string>("");
  const [fieldErrors,  setFieldErrors]  = useState<FormErrors>({});
  const [apiError,     setApiError]     = useState<string>("");
  const [successMsg,   setSuccessMsg]   = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ✅ Show success banner if user just registered
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMsg("Account registered successfully! Please log in.");
    }
  }, [searchParams]);

  // ✅ If already logged in — redirect straight to blog
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/blog");
    }
  }, [user, isLoading, router]);

  function validate(): boolean {
    const errors: FormErrors = {};

    if (!email.trim())
      errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Enter a valid email address";

    if (!password)
      errors.password = "Password is required";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(): Promise<void> {
    setApiError("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // ✅ Calls POST /api/auth/login — gets JWT from Spring Boot
      await login(email.trim(), password);

      // ✅ login() sets user in context → useEffect above fires → redirects to /blog
      router.push("/blog");

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          // ✅ Specific message for wrong credentials
          setApiError("Invalid email or password. Please try again.");
        } else {
          setApiError(err.message);
        }
      } else {
        setApiError("Unable to connect to server. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Enter") handleSubmit();
  }

  // ✅ Don't flash login form if already checking auth state
  if (isLoading) {
    return (
      <main style={pageStyle}>
        <p style={{ color: "#6b7280" }}>Loading...</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle} onKeyDown={handleKeyDown}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>👋</div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#111827" }}>
            Welcome back
          </h1>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: "14px" }}>
            Log in to read my biography
          </p>
        </div>

        {/* ✅ Post-registration success banner */}
        {successMsg && <Alert type="success" message={successMsg} />}

        {/* ✅ Login error from API */}
        {apiError && <Alert type="error" message={apiError} />}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>

          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={(v) => { setEmail(v); setFieldErrors((p) => ({ ...p, email: undefined })); setApiError(""); }}
            placeholder="john@example.com"
            error={fieldErrors.email}
            disabled={isSubmitting}
          />

          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={(v) => { setPassword(v); setFieldErrors((p) => ({ ...p, password: undefined })); setApiError(""); }}
            placeholder="Your password"
            error={fieldErrors.password}
            disabled={isSubmitting}
          />

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              ...submitButtonStyle,
              opacity: isSubmitting ? 0.7 : 1,
              cursor:  isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </div>

        <p style={{ marginTop: "20px", fontSize: "14px", color: "#6b7280", textAlign: "center" }}>
          Don't have an account?{" "}
          <Link href="/register" style={{ color: "#ec4899", fontWeight: 600, textDecoration: "none" }}>
            Register
          </Link>
        </p>

      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={pageStyle}><p style={{ color: "#6b7280" }}>Loading...</p></main>}>
      <LoginForm />
    </Suspense>
  );
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "linear-gradient(135deg, #fdf2f8 0%, #ffffff 100%)",
  fontFamily: "'Inter', system-ui, sans-serif",
  padding: "20px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  padding: "40px",
  borderRadius: "16px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  maxWidth: "440px",
};

const submitButtonStyle: React.CSSProperties = {
  padding: "13px",
  fontSize: "15px",
  fontWeight: 600,
  background: "linear-gradient(135deg, #a855f7, #ec4899)",
  color: "white",
  border: "none",
  borderRadius: "8px",
  width: "100%",
  marginTop: "4px",
};