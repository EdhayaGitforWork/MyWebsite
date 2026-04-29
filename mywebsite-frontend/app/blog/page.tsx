"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

// ✅ Type for each biography section
type BiographySection = {
  title: string;
  content: string;
  emoji: string;
};

// ✅ Typed constant array — fill this with YOUR real story!
const biographySections: BiographySection[] = [
  {
    emoji: "🌱",
    title: "Early Life",
    content:
      "Born and raised in a small town, my curiosity for technology started at an early age when I got my first computer...",
  },
  {
    emoji: "🎓",
    title: "Education",
    content:
      "I pursued my passion through formal education, studying Computer Science and falling in love with building things that matter...",
  },
  {
    emoji: "💼",
    title: "Career",
    content:
      "My career has taken me through exciting challenges — from startups to established companies, always chasing meaningful work...",
  },
  {
    emoji: "❤️",
    title: "Personal Life",
    content:
      "Outside of work, I love reading, traveling, and spending time with people who inspire me every day...",
  },
  {
    emoji: "🚀",
    title: "What's Next",
    content:
      "I'm currently learning TypeScript with Next.js, building cool things, and looking forward to whatever comes next...",
  },
];

export default function BlogPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // ✅ useEffect to guard the page — redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // ✅ Don't render anything while redirecting
  if (isLoading || !user) return null;

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", backgroundColor: "#f9f9f9" }}>
      <Navbar />

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "72px" }}>🧑‍💻</div>
          <h1 style={{ fontSize: "36px", margin: "16px 0 8px" }}>My Biography</h1>
          <p style={{ color: "#888" }}>A story of curiosity, learning, and growth</p>
        </div>

        {/* ✅ .map() over typed BiographySection[] */}
        {biographySections.map((section: BiographySection, index: number) => (
          <div
            key={index}
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "28px 32px",
              marginBottom: "20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "22px" }}>
              {section.emoji} {section.title}
            </h2>
            <p style={{ color: "#555", lineHeight: "1.8", margin: 0 }}>
              {section.content}
            </p>
          </div>
        ))}
      </main>
    </div>
  );
}