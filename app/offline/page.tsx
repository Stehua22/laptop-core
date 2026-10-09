import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline | LaptopCore",
  robots: { index: false, follow: false },
};

// Shown by the service worker when you open a page you haven't visited before while offline.
export default function OfflinePage() {
  return (
    <main
      style={{
        position: "relative",
        zIndex: 1,
        maxWidth: 480,
        margin: "0 auto",
        padding: "120px 20px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u{1F4E1}"}</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>You&apos;re offline</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 24 }}>
        This page hasn&apos;t been saved on your device yet. Pages you&apos;ve already opened still work, and everything
        comes back as soon as you&apos;re connected.
      </p>
      <Link
        href="/tracker"
        style={{
          display: "inline-block",
          background: "var(--accent)",
          color: "#fff",
          textDecoration: "none",
          borderRadius: "var(--btn-radius, 10px)",
          padding: "12px 24px",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        Open the tracker
      </Link>
    </main>
  );
}
