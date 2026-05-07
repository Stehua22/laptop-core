"use client";

export default function Toast({ message, type }: { message: string; type: "success" | "error" }) {
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
      {message}
    </div>
  );
}
