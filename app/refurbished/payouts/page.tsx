"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { User } from "@supabase/supabase-js";

export default function PayoutsPage() {
  return (
    <Suspense fallback={null}>
      <PayoutsContent />
    </Suspense>
  );
}

function PayoutsContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [connectReady, setConnectReady] = useState(false);
  const [hasConnectId, setHasConnectId] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const justReturnedFromOnboarding = searchParams.get("onboarding") === "complete";

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        const { data: profile } = await supabaseBrowser
          .from("profiles")
          .select("stripe_connect_id, stripe_connect_ready")
          .eq("id", data.user.id)
          .single();
        setHasConnectId(!!profile?.stripe_connect_id);
        setConnectReady(!!profile?.stripe_connect_ready);
      }
      setChecking(false);
    });
  }, []);

  async function handleSetupPayouts() {
    if (!user || !user.email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const { url, error: apiError } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setError(apiError || "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  if (checking) {
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
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>Sign in first</h1>
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="refurbished" />
      <div style={{ flex: 1, maxWidth: 560, margin: "0 auto", padding: "60px 20px 80px" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", marginBottom: 10 }}>
          Get paid for your sales
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 32, lineHeight: 1.6 }}>
          LaptopCore uses Stripe to pay you directly when someone buys your listing. LaptopCore keeps 8% of each sale; you get the rest, deposited straight to your bank account.
        </p>

        {justReturnedFromOnboarding && !connectReady && (
          <div style={{ background: "rgba(247,194,106,0.1)", border: "1px solid rgba(247,194,106,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "var(--accent-2)", fontSize: 13 }}>
            Almost there — Stripe is still verifying your details. This page will update automatically once it's done (usually within a minute).
          </div>
        )}

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-radius, 16px)", padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{
              width: 12, height: 12, borderRadius: "50%",
              background: connectReady ? "#4caf7d" : hasConnectId ? "var(--accent-2)" : "var(--text-dim)",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>
              {connectReady ? "Payouts are active" : hasConnectId ? "Setup in progress" : "Not set up yet"}
            </span>
          </div>

          {error && <div style={{ color: "#f76a6a", fontSize: 13, marginBottom: 14 }}>{error}</div>}

          {connectReady ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              You're all set. Buyers can now purchase your active listings directly, and you'll be paid automatically.
            </p>
          ) : (
            <button
              onClick={handleSetupPayouts}
              disabled={loading}
              style={{
                background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--btn-radius, 10px)",
                padding: "13px 24px", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1, width: "100%",
              }}
            >
              {loading ? "Redirecting…" : hasConnectId ? "Finish setting up payouts" : "Set up payouts with Stripe"}
            </button>
          )}
        </div>

        <p style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 16, lineHeight: 1.6 }}>
          Stripe will ask for basic identity and bank details — this is handled entirely by Stripe, LaptopCore never sees your banking information.
        </p>
      </div>
    </div>
  );
}