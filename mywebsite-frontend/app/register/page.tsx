"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/apiClient";
import InputField from "../components/ui/InputField";
import Alert from "../components/ui/Alert";

// ✅ Field-level validation types
interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const router       = useRouter();

  // ── Form state ─────────────────────────────────────────────────
  const [name,     setName]     = useState<string>("");
  const [email,    setEmail]    = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirm,  setConfirm]  = useState<string>("");

  // ── UI state ───────────────────────────────────────────────────
  const [fieldErrors,  setFieldErrors]  = useState<FormErrors>({});
  const [apiError,     setApiError]     = useState<string>("");
  const [successMsg,   setSuccessMsg]   = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ✅ Client-side validation before hitting the API
  function validate(): boolean {
    const errors: FormErrors = {};

    if (!name.trim())
      errors.name = "Full name is required";

    if (!email.trim())
      errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Enter a valid email address";

    if (!password)
      errors.password = "Password is required";
    else if (password.length < 6)
      errors.password = "Password must be at least 6 characters";

    if (!confirm)
      errors.confirm = "Please confirm your password";
    else if (confirm !== password)
      errors.confirm = "Passwords do not match";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(): Promise<void> {
    setApiError("");
    setSuccessMsg("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // ✅ Calls POST /api/auth/register on Spring Boot
      await register(name.trim(), email.trim(), password);

      // ✅ Show success message — then redirect to login after 2s
      setSuccessMsg("Account created successfully! Redirecting to login...");
      setTimeout(() => router.push("/login?registered=true"), 2000);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // ✅ Use the exact message from Spring Boot (e.g. "Email already registered")
        setApiError(err.message);
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

  return (
    <main style={pageStyle}>
      <div style={cardStyle} onKeyDown={handleKeyDown}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>✨</div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#111827" }}>
            Create your account
          </h1>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: "14px" }}>
            Join to read my biography
          </p>
        </div>

        {/* ✅ API-level success alert */}
        {successMsg && <Alert type="success" message={successMsg} />}

        {/* ✅ API-level error alert */}
        {apiError && <Alert type="error" message={apiError} />}

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>

          <InputField
            label="Full Name"
            type="text"
            value={name}
            onChange={(v) => { setName(v); setFieldErrors((p) => ({ ...p, name: undefined })); }}
            placeholder="John Doe"
            error={fieldErrors.name}
            disabled={isSubmitting || !!successMsg}
          />

          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={(v) => { setEmail(v); setFieldErrors((p) => ({ ...p, email: undefined })); }}
            placeholder="john@example.com"
            error={fieldErrors.email}
            disabled={isSubmitting || !!successMsg}
          />

          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={(v) => { setPassword(v); setFieldErrors((p) => ({ ...p, password: undefined })); }}
            placeholder="Minimum 6 characters"
            error={fieldErrors.password}
            disabled={isSubmitting || !!successMsg}
          />

          <InputField
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={(v) => { setConfirm(v); setFieldErrors((p) => ({ ...p, confirm: undefined })); }}
            placeholder="Re-enter your password"
            error={fieldErrors.confirm}
            disabled={isSubmitting || !!successMsg}
          />

          {/* ✅ Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !!successMsg}
            style={{
              ...submitButtonStyle,
              opacity: isSubmitting || !!successMsg ? 0.7 : 1,
              cursor:  isSubmitting || !!successMsg ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </div>

        {/* Footer link */}
        <p style={{ marginTop: "20px", fontSize: "14px", color: "#6b7280", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#0070f3", fontWeight: 600, textDecoration: "none" }}>
            Log in
          </Link>
        </p>

      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  backgroundColor: "#f3f4f6",
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
  backgroundColor: "#0070f3",
  color: "white",
  border: "none",
  borderRadius: "8px",
  width: "100%",
  marginTop: "4px",
  transition: "opacity 0.2s",
};