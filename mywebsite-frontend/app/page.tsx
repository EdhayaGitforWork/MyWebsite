"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router              = useRouter();

  useEffect(() => {
    if (!isLoading) {
      router.replace(user ? "/blog" : "/login");
    }
  }, [user, isLoading, router]);

  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        fontFamily: "sans-serif",
        color: "#6b7280",
      }}
    >
      Loading...
    </main>
  );
}