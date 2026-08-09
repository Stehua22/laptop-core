"use client";
import { useState, useEffect } from "react";
import Laptop3DViewer from "@/components/Laptop3dviewer";
import PremiumGate from "@/components/PremiumGate";

const ADMIN_PASSWORD = "admin2026.123";

export default function View3DPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
      setShowModal(false);
      setPwInput("");
      setPwError("");
    } else {
      setPwError("Incorrect password.");
      setPwInput("");
    }
  };

  const logout = () => {
    sessionStorage.removeItem("admin_3d_unlocked");
    setIsAdmin(false);
  };

  return (
    <PremiumGate featureName="3D Viewer">
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px", position: "relative" }}>
        {/* Buttons top-right */}
        <div style={{ position: "absolute", top: 32, right: 20, display: "flex", gap: 8, zIndex: 10 }}>
          <a
            href="/design"
            style={{
              background: "linear-gradient(135deg, rgba(99,232,140,0.15), rgba(61,214,140,0.1))",
              border: "1px solid rgba(99,232,140,0.3)",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              color: "#63e88c",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              letterSpacing: "0.04em",
            }}
          >
            ✦ Design Studio
          </a>
          <button
            onClick={() => isAdmin ? logout() : setShowModal(true)}
            title={isAdmin ? "Exit admin mode" : "Admin login"}
            style={{
              background: isAdmin ? "rgba(99,232,140,0.12)" : "rgba(255,255,255,0.06)",
              border: isAdmin ? "1px solid rgba(99,232,140,0.35)" : "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'DM Mono', monospace",
              color: isAdmin ? "#63e88c" : "#8892aa",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
              letterSpacing: "0.05em",
            }}
          >
            {isAdmin ? "🔓 ADMIN" : "🔒 Admin"}
          </button>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
          3D Model Viewer
        </h1>
        <p style={{ color: "var(--text-muted, #6b7280)", marginBottom: 20 }}>
          Drag to rotate, scroll to zoom. Use the filters on the right to change
          color, finish, and screen angle.
          {isAdmin && (
            <span style={{ marginLeft: 10, color: "#63e88c", fontWeight: 600, fontSize: 12 }}>
              ✦ Admin mode — select a laptop and click "Save Design" to persist its 3D look.
            </span>
          )}
        </p>

        <Laptop3DViewer isAdmin={isAdmin} />

        {/* Admin password modal */}
        {showModal && (
          <div
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div style={{
              background: "#1a1d27",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "2rem",
              width: "100%",
              maxWidth: 360,
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}>
              <p style={{
                fontSize: 10,
                color: "#8bb3f5",
                fontFamily: "'DM Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 8,
              }}>// admin</p>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 6, color: "#f0f4ff" }}>
                Design Editor
              </h2>
              <p style={{ fontSize: 13, color: "#8892aa", fontFamily: "'DM Mono', monospace", marginBottom: 20 }}>
                Enter admin password to unlock 3D design editing.
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
                  padding: "10px 12px",
                  fontSize: 13,
                  border: `1px solid ${pwError ? "#f76a6a" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.05)",
                  color: "#f0f4ff",
                  fontFamily: "'DM Mono', monospace",
                  outline: "none",
                  marginBottom: 8,
                  boxSizing: "border-box",
                }}
              />
              {pwError && <p style={{ fontSize: 12, color: "#f76a6a", marginBottom: 8 }}>{pwError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setShowModal(false); setPwInput(""); setPwError(""); }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    fontSize: 13,
                    fontWeight: 600,
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    background: "transparent",
                    color: "#8892aa",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitPassword}
                  style={{
                    flex: 2,
                    padding: "10px",
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 8,
                    background: "#8bb3f5",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Unlock
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PremiumGate>
  );
}