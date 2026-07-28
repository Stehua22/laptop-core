"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Laptop3DViewer from "@/components/Laptop3dviewer";

const ADMIN_PASSWORD = "admin2026.123";

function AdminLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const router = useRouter();
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [shaking, setShaking] = useState(false);

  const submit = () => {
    if (pwInput === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_3d_unlocked", "true");
      onUnlock();
    } else {
      setPwError("Incorrect password.");
      setPwInput("");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0c0e14",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Syne', 'Inter', sans-serif",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        top: "30%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 500,
        height: 500,
        background: "radial-gradient(circle, rgba(139,179,245,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <button
        onClick={() => router.push("/view3d")}
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: "6px 14px",
          color: "#8892aa",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "'DM Mono', monospace",
        }}
      >← Back</button>

      <div style={{
        width: "100%",
        maxWidth: 400,
        padding: "0 24px",
        animation: shaking ? "shake 0.4s ease" : "none",
      }}>
        {/* Lock icon */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "rgba(139,179,245,0.08)",
          border: "1px solid rgba(139,179,245,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          marginBottom: 28,
          boxShadow: "0 0 40px rgba(139,179,245,0.1)",
        }}>🔒</div>

        <p style={{
          fontSize: 10,
          color: "#8bb3f5",
          fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase",
          letterSpacing: "0.22em",
          marginBottom: 10,
        }}>// restricted access</p>

        <h1 style={{
          fontSize: "2rem",
          fontWeight: 800,
          color: "#f0f4ff",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          marginBottom: 10,
        }}>
          Design Studio
        </h1>

        <p style={{
          fontSize: 14,
          color: "#8892aa",
          fontFamily: "'DM Mono', monospace",
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          Admin access only. Enter your password to continue.
        </p>

        <div style={{ position: "relative", marginBottom: 10 }}>
          <input
            type="password"
            autoFocus
            placeholder="Admin password"
            value={pwInput}
            onChange={(e) => { setPwInput(e.target.value); setPwError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: 14,
              border: `1px solid ${pwError ? "rgba(247,106,106,0.5)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              color: "#f0f4ff",
              fontFamily: "'DM Mono', monospace",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxShadow: pwError ? "0 0 0 3px rgba(247,106,106,0.1)" : "none",
            }}
          />
        </div>

        {pwError && (
          <p style={{ fontSize: 12, color: "#f76a6a", marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
            ✕ {pwError}
          </p>
        )}

        <button
          onClick={submit}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: 14,
            fontWeight: 700,
            border: "none",
            borderRadius: 12,
            background: "linear-gradient(135deg, #8bb3f5 0%, #5f8de0 100%)",
            color: "#fff",
            cursor: "pointer",
            letterSpacing: "0.02em",
            boxShadow: "0 8px 32px rgba(139,179,245,0.2)",
            transition: "opacity 0.2s, transform 0.15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Unlock Studio →
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

export default function DesignStudioPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem("admin_3d_unlocked") === "true");
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (!isAdmin) return <AdminLockScreen onUnlock={() => setIsAdmin(true)} />;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0c0e14",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Syne', 'Inter', sans-serif",
      overflow: "hidden",
    }}>

      {/* Top Bar */}
      <header style={{
        height: 52,
        background: "rgba(17,19,24,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/view3d")}
            title="Back to 3D Viewer"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "5px 12px",
              color: "#8892aa",
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "linear-gradient(135deg, #63e88c, #3dd68c)",
              boxShadow: "0 0 8px rgba(99,232,140,0.5)",
            }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: "#f0f4ff", letterSpacing: "-0.01em" }}>
              Design Studio
            </span>
            <span style={{
              fontSize: 10, color: "#63e88c",
              fontFamily: "'DM Mono', monospace",
              background: "rgba(99,232,140,0.1)",
              border: "1px solid rgba(99,232,140,0.2)",
              borderRadius: 4, padding: "2px 6px",
              letterSpacing: "0.05em",
            }}>BETA</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#8892aa", fontFamily: "'DM Mono', monospace" }}>
            {isAdmin ? "Admin mode active" : "Login to save designs"}
          </span>
          <button
            onClick={() => {
              if (isAdmin) {
                sessionStorage.removeItem("admin_3d_unlocked");
                setIsAdmin(false);
              } else {
                setShowAuth(true);
              }
            }}
            style={{
              background: isAdmin ? "rgba(99,232,140,0.12)" : "rgba(255,255,255,0.06)",
              border: isAdmin ? "1px solid rgba(99,232,140,0.3)" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "6px 14px",
              color: isAdmin ? "#63e88c" : "#8892aa",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              letterSpacing: "0.02em",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {isAdmin ? "🔓 ADMIN" : "🔒 Admin Login"}
          </button>
        </div>
      </header>

      {/* Main: full-screen viewer */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Laptop3DViewer isAdmin={true} studioMode={true} />
      </div>
    </div>
  );
}

