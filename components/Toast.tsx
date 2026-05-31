"use client";

export default function Toast({ message, type }: { message: string; type: "success" | "error" }) {
<<<<<<< HEAD
  const isSuccess = type === "success";
  return (
    <div style={{
      background: isSuccess ? "rgba(106,247,184,0.1)" : "rgba(247,106,106,0.1)",
      border: `1px solid ${isSuccess ? "rgba(106,247,184,0.25)" : "rgba(247,106,106,0.25)"}`,
      borderRadius: 12,
      padding: "12px 18px",
      color: isSuccess ? "var(--accent-3)" : "var(--accent-red)",
      fontSize: 13, fontWeight: 500,
      backdropFilter: "blur(16px)",
      boxShadow: "var(--shadow-lg)",
      maxWidth: 320,
      display: "flex", alignItems: "center", gap: 8,
      animation: "slideInRight 0.3s cubic-bezier(0.22,1,0.36,1)",
    }}>
      <span style={{ fontSize: 16 }}>{isSuccess ? "✅" : "❌"}</span>
=======
  return (
    <div style={{
      background: type === "success" ? "rgba(106, 247, 184, 0.15)" : "rgba(247, 106, 106, 0.15)",
      border: `1px solid ${type === "success" ? "rgba(106, 247, 184, 0.3)" : "rgba(247, 106, 106, 0.3)"}`,
      borderRadius: 10,
      padding: "12px 18px",
      color: type === "success" ? "var(--accent-3)" : "#f76a6a",
      fontFamily: "'DM Mono', monospace",
      fontSize: 13,
      backdropFilter: "blur(12px)",
      animation: "slideInRight 0.3s ease",
      maxWidth: 320,
    }}>
>>>>>>> origin/fix/vercel-build-and-theme-toggle
      {message}
    </div>
  );
}
