"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    // Skip the animation on initial page load — only show on subsequent navigations.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setVisible(true);
    setProgress(20);

    const step1 = setTimeout(() => setProgress(55), 80);
    const step2 = setTimeout(() => setProgress(80), 220);
    const finish = setTimeout(() => {
      setProgress(100);
      timeoutRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }, 380);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(finish);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2.5,
        zIndex: 100000,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, var(--accent), var(--accent-3))",
          boxShadow: "0 0 8px var(--accent)",
          transition: "width 0.25s ease-out, opacity 0.2s ease",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}