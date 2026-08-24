"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { fetchMyListings, markListingSold, deleteListing } from "@/lib/supabase";
import type { Listing } from "@/lib/supabase";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { User } from "@supabase/supabase-js";

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const STATUS_COLOR: Record<string, string> = {
  active: "#4caf7d",
  sold: "var(--text-dim)",
  removed: "#f76a6a",
};

export default function MyListingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      setCheckingAuth(false);
      if (data.user) {
        const mine = await fetchMyListings(data.user.id);
        setListings(mine);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function handleMarkSold(id: number) {
    await markListingSold(id);
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "sold" } : l)));
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this listing permanently?")) return;
    await deleteListing(id);
    setListings((prev) => prev.filter((l) => l.id !== id));
  }

  if (checkingAuth || loading) {
    return (
      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <Sidebar activeKey="refurbished" />
        <div style={{ flex: 1, padding: "40px 20px", color: "var(--text-muted)" }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <Sidebar activeKey="refurbished" />
        <div style={{ flex: 1, maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>Sign in to view your listings</h1>
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="refurbished" />
      <div style={{ flex: 1, maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)" }}>
            My Listings
          </h1>
          <Link href="/refurbished/sell" style={{
            background: "var(--accent)", color: "#fff", textDecoration: "none",
            borderRadius: "var(--btn-radius, 10px)", padding: "10px 20px", fontWeight: 700, fontSize: 13.5,
          }}>
            + New Listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            You haven&apos;t listed anything yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {listings.map((l) => (
              <div key={l.id} style={{ display: "flex", gap: 16, alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: 8, background: "var(--surface-2)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {l.images?.[0] ? (
                    <img src={l.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 20, opacity: 0.2 }}>▭</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/refurbished/${l.id}`} style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)", textDecoration: "none" }}>
                    {l.brand} {l.model}
                  </Link>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{fmt(l.price)}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: STATUS_COLOR[l.status], textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {l.status}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {l.status === "active" && (
                    <button
                      onClick={() => handleMarkSold(l.id)}
                      style={{ fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      Mark Sold
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(l.id)}
                    style={{ fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(247,106,106,0.3)", background: "rgba(247,106,106,0.08)", color: "#f76a6a", cursor: "pointer" }}
                  >
                    Delete
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