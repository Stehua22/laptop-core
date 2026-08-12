'use client';

import { useEffect } from 'react';

// Reads the same localStorage keys TrackerClient.tsx writes, and applies
// them to <html> on mount. Include this once in app/layout.tsx so every
// page (not just /tracker) picks up the saved theme immediately.
export default function ThemeInit() {
  useEffect(() => {
    const root = document.documentElement;

    const savedTheme = window.localStorage.getItem('lc-dark');
    if (savedTheme !== null) {
      root.setAttribute('data-theme', savedTheme === 'true' ? 'dark' : 'light');
    }

    const savedAccent = window.localStorage.getItem('lc-accent');
    if (savedAccent && savedAccent !== 'default') {
      root.setAttribute('data-accent', savedAccent);
    } else {
      root.removeAttribute('data-accent');
    }

    const savedFontScale = window.localStorage.getItem('lc-font-scale');
    if (savedFontScale) {
      root.style.setProperty('--app-zoom', savedFontScale);
    }

    const savedUiTheme = window.localStorage.getItem('lc-ui-theme');
    if (savedUiTheme && savedUiTheme !== 'default') {
      root.setAttribute('data-ui-theme', savedUiTheme);
    } else {
      root.removeAttribute('data-ui-theme');
    }

    const savedBgEffect = window.localStorage.getItem('lc-bg-effect');
    if (savedBgEffect && savedBgEffect !== 'grid') {
      root.setAttribute('data-bg-effect', savedBgEffect);
    } else {
      root.removeAttribute('data-bg-effect');
    }

    const savedAnimSpeed = window.localStorage.getItem('lc-anim-speed');
    if (savedAnimSpeed && savedAnimSpeed !== 'normal') {
      root.setAttribute('data-anim-speed', savedAnimSpeed);
    } else {
      root.removeAttribute('data-anim-speed');
    }
  }, []);

  return null;
}