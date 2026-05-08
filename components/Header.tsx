"use client";

import ThemeToggle from "./ThemeToggle";

export default function Header({ onAdd }: { onAdd: () => void }) {
  return (
    <header style={{
      marginBottom: 40,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 20,
      flexWrap: "wrap",
    }}>
      <div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: "var(--accent)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}>
          // price intelligence
        </div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(2rem, 5vw, 3.25rem)",
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: "var(--text)",
        }}>
          Laptop Tracker<span style={{ color: "var(--accent)" }}>.</span>
        </h1>
        <p style={{
          marginTop: 10,
          color: "var(--text-muted)",
          fontFamily: "'DM Mono', monospace",
          fontSize: 13,
        }}>
          Monitor prices · compare specs · track history
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <ThemeToggle />
        <button
          onClick={onAdd}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "12px 24px",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            transition: "opacity 0.15s, transform 0.15s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          + Add Laptop
        </button>
      </div>
    </header>
  );
}
