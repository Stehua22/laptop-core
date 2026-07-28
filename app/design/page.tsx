"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Laptop3DViewer from "@/components/Laptop3dviewer";

const ADMIN_PASSWORD = "admin2026.123";

export default function DesignStudioPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("admin_3d_unlocked") === "true") {
      setIsAdmin(true);
    }
  }, []);

  const submitPassword = () => {
    if (pwInput === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_3d_unlocked", "true");
      setIsAdmin(true);
      setShowAuth(false);
      setPwInput("");
      setPwError("");
    } else {
      setPwError("Incorrect password.");
      setPwInput("");
    }
  };

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
        <Laptop3DViewer isAdmin={isAdmin} studioMode={true} />
      </div>

      {/* Admin Password Modal */}
      {showAuth && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowAuth(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div style={{
            background: "#1a1d27",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "2rem 2.2rem",
            width: "100%",
            maxWidth: 380,
            boxShadow: "0 32px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
          }}>
            <p style={{
              fontSize: 10, color: "#8bb3f5", fontFamily: "'DM Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8,
            }}>// admin</p>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 6, color: "#f0f4ff", letterSpacing: "-0.02em" }}>
              Design Studio
            </h2>
            <p style={{ fontSize: 13, color: "#8892aa", fontFamily: "'DM Mono', monospace", marginBottom: 24, lineHeight: 1.5 }}>
              Enter admin password to unlock saving and model import.
            </p>
            <input
              type="password"
              autoFocus
              placeholder="Password"
              value={pwInput}
              onChange={(e) => { setPwInput(e.target.value); setPwError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              style={{
                width: "100%",
                padding: "11px 14px",
                fontSize: 14,
                border: `1px solid ${pwError ? "#f76a6a" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                color: "#f0f4ff",
                fontFamily: "'DM Mono', monospace",
                outline: "none",
                marginBottom: 8,
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
            />
            {pwError && <p style={{ fontSize: 12, color: "#f76a6a", marginBottom: 8 }}>{pwError}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={() => { setShowAuth(false); setPwInput(""); setPwError(""); }}
                style={{
                  flex: 1, padding: "10px", fontSize: 13, fontWeight: 600,
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                  background: "transparent", color: "#8892aa", cursor: "pointer",
                }}
              >Cancel</button>
              <button
                onClick={submitPassword}
                style={{
                  flex: 2, padding: "10px", fontSize: 13, fontWeight: 700,
                  border: "none", borderRadius: 10,
                  background: "linear-gradient(135deg, #8bb3f5, #6690e0)",
                  color: "#fff", cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(139,179,245,0.25)",
                }}
              >Unlock →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
