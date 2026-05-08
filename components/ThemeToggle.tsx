"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export default function ThemeToggle() {
  // Start as `null` so we don't render the wrong icon before we know which
  // theme the inline <script> in layout.tsx has already applied.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as Theme | null) ??
      "dark";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
    setTheme(next);
  };

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        width: 42,
        height: 42,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text)",
        cursor: "pointer",
        transition:
          "border-color 0.15s, color 0.15s, background 0.15s, transform 0.15s",
        fontSize: 18,
        lineHeight: 1,
        padding: 0,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--accent)";
        el.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border)";
        el.style.color = "var(--text)";
      }}
    >
      {/* Render nothing until we know the theme, to avoid an icon flash */}
      {theme === null ? (
        <span style={{ opacity: 0 }}>·</span>
      ) : isDark ? (
        /* Sun icon: shown in dark mode (click to go light) */
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        /* Moon icon: shown in light mode (click to go dark) */
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
