"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 9997,
        width: 42,
        height: 42,
        borderRadius: "50%",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text-muted)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.85)",
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.25s ease, transform 0.25s ease, border-color 0.15s ease, background 0.15s ease",
        boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.color = "var(--accent)";
        e.currentTarget.style.transform = "translateY(-3px) scale(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text-muted)";
        e.currentTarget.style.transform = visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.85)";
      }}
    >
      ↑
    </button>
  );
}