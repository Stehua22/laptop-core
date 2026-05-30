"use client";
import { useState, useEffect } from "react";

const SITE_PASSWORD = "laptop2026.123"; // ← change this

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem("site_unlocked");
    if (saved === "true") setUnlocked(true);
    setChecking(false);
  }, []);

  const submit = () => {
    if (input === SITE_PASSWORD) {
      sessionStorage.setItem("site_unlocked", "true");
      setUnlocked(true);
    } else {
      setError("Incorrect password.");
      setInput("");
    }
  };

  if (checking) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg, #0f1117)", fontFamily: "'Syne', sans-serif",
    }}>
      <div style={{
        background: "var(--surface, #1a1d27)", border: "1px solid var(--border, rgba(255,255,255,0.08))",
        borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 380, margin: "1rem",
      }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--accent, #8bb3f5)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8 }}>
          // private
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6, color: "var(--text, #f0f4ff)" }}>
          Laptop Tracker<span style={{ color: "var(--accent, #8bb3f5)" }}>.</span>
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted, #8892aa)", fontFamily: "'DM Mono', monospace", marginBottom: 24 }}>
          Enter password to continue.
        </p>
        <input
          type="password"
          placeholder="Password…"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
          style={{
            width: "100%", padding: "10px 12px", fontSize: 13,
            border: "1px solid var(--border, rgba(255,255,255,0.08))",
            borderRadius: 8, background: "var(--surface-2, rgba(255,255,255,0.05))",
            color: "var(--text, #f0f4ff)", fontFamily: "'DM Mono', monospace",
            outline: "none", marginBottom: 8, boxSizing: "border-box",
          }}
        />
        {error && <p style={{ fontSize: 12, color: "#f76a6a", marginBottom: 8 }}>{error}</p>}
        <button
          onClick={submit}
          style={{
            width: "100%", padding: "10px", fontSize: 13, fontWeight: 600,
            border: "none", borderRadius: 8, background: "var(--accent, #8bb3f5)",
            color: "#fff", cursor: "pointer", fontFamily: "'Syne', sans-serif",
          }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}