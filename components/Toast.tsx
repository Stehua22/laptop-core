"use client";

export default function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  const isSuccess = type === "success";
  return (
    <div style={{
      background: isSuccess ? "rgba(106,247,184,0.1)" : "rgba(247,106,106,0.1)",
      border: `1px solid ${isSuccess ? "rgba(106,247,184,0.25)" : "rgba(247,106,106,0.25)"}`,
      borderRadius: 12, padding: "12px 18px",
      color: isSuccess ? "var(--accent-3)" : "var(--accent-red)",
      fontSize: 13, fontWeight: 500,
      backdropFilter: "blur(16px)", boxShadow: "var(--shadow-lg)",
      maxWidth: 320, display: "flex", alignItems: "center", gap: 8,
      animation: "slideInRight 0.3s cubic-bezier(0.22,1,0.36,1)",
    }}>
      <span style={{ fontSize: 16 }}>{isSuccess ? "✅" : "❌"}</span>
      {message}
    </div>
  );
}
