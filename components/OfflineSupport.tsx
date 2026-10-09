"use client";
import { useEffect, useState } from "react";

// Registers the offline service worker (public/sw.js) and shows a small bar when the connection drops.
export default function OfflineSupport() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        padding: "10px 16px",
        textAlign: "center",
        fontSize: 13,
        fontWeight: 600,
        background: "var(--surface-2, #2a2a33)",
        color: "var(--text, #fff)",
        borderTop: "1px solid var(--border, #444)",
      }}
    >
      {"\u{1F4E1}"} You&apos;re offline. Showing saved laptops, so prices may be out of date.
    </div>
  );
}
