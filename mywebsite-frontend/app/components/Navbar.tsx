"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router           = useRouter();

  function handleLogout(): void {
    logout();
    router.push("/login");
  }

  return (
    <nav style={navStyle}>
      <span style={{ fontWeight: 700, fontSize: "18px" }}>📖 My Biography</span>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {user && (
          <span style={{ fontSize: "14px", opacity: 0.9 }}>
            Hello, <strong>{user.name}</strong>
          </span>
        )}
        <button onClick={handleLogout} style={logoutButtonStyle}>
          Logout
        </button>
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 32px",
  backgroundColor: "#0070f3",
  color: "white",
  fontFamily: "'Inter', system-ui, sans-serif",
  boxShadow: "0 2px 8px rgba(0,112,243,0.3)",
};

const logoutButtonStyle: React.CSSProperties = {
  padding: "8px 18px",
  backgroundColor: "white",
  color: "#0070f3",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};