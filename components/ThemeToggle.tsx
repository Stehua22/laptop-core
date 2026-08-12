'use client';

import { useEffect, useState } from 'react';

// Sun/moon toggle. Writes the same "lc-dark" localStorage key and
// data-theme attribute that TrackerClient.tsx uses, so flipping this
// anywhere (homepage, nav) stays in sync with the tracker's Settings panel.
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('lc-dark');
    const current = document.documentElement.getAttribute('data-theme');
    setIsDark(saved !== null ? saved === 'true' : current !== 'light');
  }, []);

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
      window.localStorage.setItem('lc-dark', String(next));
      return next;
    });
  }

  if (isDark === null) return null;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle light/dark mode"
      style={{
        width: 30,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border, currentColor)',
        borderRadius: 8,
        background: 'transparent',
        color: 'inherit',
        cursor: 'pointer',
        fontSize: 14,
        pointerEvents: 'auto',
      }}
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  );
}