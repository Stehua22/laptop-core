"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops, deleteLaptop } from "@/lib/supabase";

const ADMIN_PASSWORD = "admin2026.123";

export default function AdminPage() {
  const router = useRouter();
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetchLaptops().then((data) => { setLaptops(data); setLoading(false); });
  }, []);

  const submitAuth = () => {
    if (authInput === ADMIN_PASSWORD) { setUnlocked(true); setAuthError(""); }
    else setAuthError("Incorrect password.");
  };

  const handleDelete = async (id: number, model: string) => {
    if (!confirm(`Remove "${model}"?`)) return;
    setDeleting(id);
    await deleteLaptop(id);
    setLaptops(prev => prev.filter(l => l.id !== id));
    setDeleting(null);
  };

  const filtered = laptops.filter(l =>
    l.brand.toLowerCase().includes(search.toLowerCase()) ||
    l.model.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (!unlocked) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 380, margin: "1rem" }}>
        <button onClick={() => router.push("/")} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace", marginBottom: 20, padding: 0 }}>← Back</button>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8 }}>Admin Panel</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4 }}>🔒 Access Required</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "'DM Mono', monospace", marginBottom: 24 }}>Enter your admin password to continue.</p>
        <input
          type="password" placeholder="Password…" value={authInput}
          onChange={(e) => { setAuthInput(e.target.value); setAuthError(""); }}
          onKeyDown={(e) => e.key === "Enter" && submitAuth()}
          autoFocus
          style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "inherit", fontFamily: "inherit", outline: "none", marginBottom: 8, boxSizing: "border-box" }}
        />
        {authError && <p style={{ fontSize: 12, color: "#f76a6a", marginBottom: 8 }}>{authError}</p>}
        <button onClick={submitAuth} style={{ width: "100%", padding: "10px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>
          Unlock
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div>
            <button onClick={() => router.push("/")} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>← Back</button>
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>⚙️ Admin Panel</h1>
            <p style={{ color: "var(--text-muted)", fontFamily: "'DM Mono', monospace", fontSize: 13, marginTop: 6 }}>{laptops.length} laptops tracked</p>
          </div>
        </div>

        {/* Search */}
        <input
          placeholder="Search laptops..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", color: "inherit", fontFamily: "'DM Mono', monospace", outline: "none", marginBottom: 20, boxSizing: "border-box" }}
        />

        {/* Laptop list */}
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontFamily: "'DM Mono', monospace", fontSize: 13, padding: "3rem" }}>Loading...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((l) => (
              <div key={l.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 200 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text-dim)", width: 30, flexShrink: 0 }}>#{l.id}</div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--accent)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", marginBottom: 2 }}>{l.brand}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{l.model}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{l.specs?.slice(0, 60)}{(l.specs?.length ?? 0) > 60 ? "…" : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "var(--accent-3)" }}>{fmt(l.current_price ?? 0)}</span>
                  <button
                    onClick={() => router.push(`/laptop/${l.id}`)}
                    style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(l.id, l.model)}
                    disabled={deleting === l.id}
                    style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--accent-red, #f76a6a)", background: "rgba(247,106,106,0.1)", color: "var(--accent-red, #f76a6a)", cursor: "pointer", fontFamily: "'DM Mono', monospace", opacity: deleting === l.id ? 0.5 : 1 }}
                  >
                    {deleting === l.id ? "Removing..." : "🗑 Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
