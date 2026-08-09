"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";

let _supabase: SupabaseClient | null = null;
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!_supabase && url && key) {
    _supabase = createClient(url, key);
  }
  return _supabase;
}

type Deal = {
  id: string;
  source: string;
  title: string;
  brand: string | null;
  price: number;
  currency: string;
  condition: string | null;
  url: string;
  image_url: string | null;
  location: string | null;
  deal_score: number | null;
  market_price: number | null;
  is_premium_deal: boolean | null;
  seen_at: string;
  first_seen_at: string;
};

const SOURCE_LABEL: Record<string, string> = {
  ebay: "eBay",
  bestbuy: "Best Buy",
  facebook: "Facebook Marketplace",
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
};

const SKELETON_COUNT = 8;

export default function ScannerClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  const loadDeals = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    const { data } = await sb
      .from("deals")
      .select("*")
      .eq("is_active", true)
      .order("deal_score", { ascending: false, nullsFirst: false })
      .limit(200);
    if (data) setDeals(data as Deal[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDeals();
    // pick up new rows written by background cron scans without a manual trigger
    const interval = setInterval(loadDeals, 30000);
    return () => clearInterval(interval);
  }, [loadDeals]);

  useEffect(() => {
    async function checkPlan() {
      const sb = getSupabase();
      if (!sb) { setHasAccess(false); return; }
      const { data: sessionData } = await sb.auth.getSession();
      const session = sessionData.session;
      if (!session) { setHasAccess(false); return; }

      const { data: profile } = await sb
        .from("profiles")
        .select("plan")
        .eq("id", session.user.id)
        .single();

      setHasAccess(profile?.plan === "premium" || profile?.plan === "ultra");
    }
    checkPlan();
  }, []);

  // Smooth fake progress bar while a scan is running — the real scan is one
  // request with no incremental updates, so this eases from 0 toward ~90%
  // and then snaps to 100% when the response actually lands. Keeps the UI
  // honest (never claims "done" before the real fetch resolves) while still
  // feeling alive during the several-second wait.
  useEffect(() => {
    if (!scanning) return;
    setScanProgress(0);
    const start = Date.now();
    const estMs = 6000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(90, (elapsed / estMs) * 90);
      setScanProgress(pct);
    }, 120);
    return () => clearInterval(interval);
  }, [scanning]);

  async function triggerScan() {
    setScanning(true);
    try {
      // NEXT_PUBLIC_DEAL_SCAN_SECRET must match DEAL_SCAN_SECRET server-side.
      // Fine for a personal single-user project; don't reuse this pattern
      // for anything with real users hitting the client bundle.
      await fetch(`/api/deals/scan?secret=${process.env.NEXT_PUBLIC_DEAL_SCAN_SECRET}`);
      setScanProgress(100);
      await loadDeals();
      setLastScan(new Date());
    } finally {
      setTimeout(() => setScanning(false), 300); // let the bar visibly hit 100%
    }
  }

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    deals.forEach((d) => { if (d.brand) set.add(d.brand); });
    return Array.from(set).sort();
  }, [deals]);

  const conditionOptions = useMemo(() => {
    const set = new Set<string>();
    deals.forEach((d) => { if (d.condition) set.add(d.condition); });
    return Array.from(set).sort();
  }, [deals]);

  const maxPriceNum = maxPrice.trim() === "" ? null : Number(maxPrice);

  const filtered = deals.filter((d) => {
    if ((d.deal_score ?? 0) < minScore) return false;
    if (sourceFilter !== "all" && d.source !== sourceFilter) return false;
    if (brandFilter !== "all" && d.brand !== brandFilter) return false;
    if (conditionFilter !== "all" && d.condition !== conditionFilter) return false;
    if (maxPriceNum !== null && !Number.isNaN(maxPriceNum) && d.price > maxPriceNum) return false;
    return true;
  });

  const unlockedCount = filtered.filter((d) => !d.is_premium_deal || hasAccess).length;
  const lockedCount = filtered.length - unlockedCount;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span style={{ position: "relative", width: 10, height: 10, display: "inline-block" }}>
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: scanning ? "#22c55e" : "#9ca3af",
            }}
          />
          {scanning && (
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "#22c55e",
                animation: "radarPing 1.2s cubic-bezier(0,0,0.2,1) infinite",
              }}
            />
          )}
        </span>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Deal Scanner</h1>
      </div>
      <p style={{ color: "#6b7280", marginBottom: 12 }}>
        Refurbished Lenovo, Dell, HP &amp; more — scanned from eBay, Best Buy, and Facebook
        Marketplace.
        {lastScan && ` Last manual scan: ${lastScan.toLocaleTimeString()}.`}
      </p>

      {hasAccess === false && lockedCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 18px",
            borderRadius: 10,
            background: "rgba(147,51,234,0.08)",
            border: "1px solid rgba(147,51,234,0.25)",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, color: "#9333ea", fontWeight: 600 }}>
            🔒 {lockedCount} more deal{lockedCount !== 1 ? "s" : ""} available with Premium or Ultra
          </span>
          <Link
            href="/premium"
            style={{
              fontSize: 12,
              padding: "7px 16px",
              borderRadius: 8,
              background: "#9333ea",
              color: "#fff",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Upgrade
          </Link>
        </div>
      )}

      {scanning && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ height: 6, borderRadius: 99, background: "#e5e7eb", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${scanProgress}%`,
                background: "linear-gradient(90deg, #3b82f6, #22c55e)",
                borderRadius: 99,
                transition: "width 0.15s linear",
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontFamily: "monospace" }}>
            Scanning eBay, Best Buy &amp; Facebook Marketplace…
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={triggerScan}
          disabled={scanning}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: scanning ? "#9ca3af" : "#111827",
            color: "white",
            fontWeight: 600,
            cursor: scanning ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {scanning && (
            <span
              style={{
                width: 13,
                height: 13,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.35)",
                borderTopColor: "#fff",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }}
            />
          )}
          {scanning ? "Scanning…" : "Scan now"}
        </button>

        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={selectStyle}>
          <option value="all">All sources</option>
          <option value="ebay">eBay</option>
          <option value="bestbuy">Best Buy</option>
          <option value="facebook">Facebook Marketplace</option>
        </select>

        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} style={selectStyle}>
          <option value="all">All brands</option>
          {brandOptions.map((b) => (
            <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
          ))}
        </select>

        <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} style={selectStyle}>
          <option value="all">All conditions</option>
          {conditionOptions.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Max price ($)"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          style={{ ...selectStyle, width: 130 }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#374151" }}>
          Min deal score: {minScore}
          <input
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </label>

        {(sourceFilter !== "all" || brandFilter !== "all" || conditionFilter !== "all" || maxPrice !== "" || minScore !== 0) && (
          <button
            onClick={() => { setSourceFilter("all"); setBrandFilter("all"); setConditionFilter("all"); setMaxPrice(""); setMinScore(0); }}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "transparent", color: "#6b7280", cursor: "pointer", fontSize: 13 }}
          >
            Clear filters
          </button>
        )}
      </div>

      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
        {filtered.length} of {deals.length} deals shown
      </p>

      {loading || (scanning && deals.length === 0) ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div className="shimmer" style={{ height: 140, borderRadius: 8, background: "#f3f4f6" }} />
              <div className="shimmer" style={{ height: 14, width: "80%", borderRadius: 4, background: "#f3f4f6" }} />
              <div className="shimmer" style={{ height: 18, width: "50%", borderRadius: 4, background: "#f3f4f6" }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#6b7280" }}>
          No deals matching your filters yet. Try lowering the min score, clearing filters, or hit &quot;Scan now&quot;.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {filtered.map((deal, i) => {
            const isLocked = deal.is_premium_deal && !hasAccess;

            if (isLocked) {
              return (
                <div
                  key={deal.id}
                  className="deal-card-in"
                  style={{
                    border: "1px solid rgba(147,51,234,0.3)",
                    borderRadius: 12,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    position: "relative",
                    animationDelay: `${Math.min(i, 20) * 0.03}s`,
                    background: "rgba(147,51,234,0.03)",
                  }}
                >
                  <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
                      <span>{SOURCE_LABEL[deal.source] ?? deal.source}</span>
                      <span style={{ fontWeight: 700, color: "#6b7280" }}>{deal.deal_score}/100</span>
                    </div>
                    {deal.image_url && (
                      <img
                        src={deal.image_url}
                        alt=""
                        style={{ width: "100%", height: 140, objectFit: "contain", background: "#f9fafb", borderRadius: 8, marginTop: 8 }}
                      />
                    )}
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{deal.title}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                      ${deal.price.toFixed(0)} {deal.currency}
                    </div>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      background: "rgba(255,255,255,0.4)",
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>🔒</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#9333ea" }}>Premium deal</span>
                    <Link
                      href="/premium"
                      style={{
                        fontSize: 12,
                        padding: "6px 14px",
                        borderRadius: 8,
                        background: "#9333ea",
                        color: "#fff",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Upgrade to unlock
                    </Link>
                  </div>
                </div>
              );
            }

            return (
              <a
                key={deal.id}
                href={deal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="deal-card-in"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  animationDelay: `${Math.min(i, 20) * 0.03}s`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
                  <span>{SOURCE_LABEL[deal.source] ?? deal.source}</span>
                  {deal.deal_score !== null && (
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          deal.deal_score >= 70 ? "#16a34a" : deal.deal_score >= 40 ? "#ca8a04" : "#6b7280",
                      }}
                    >
                      {deal.deal_score}/100
                    </span>
                  )}
                </div>
                {deal.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={deal.image_url}
                    alt={deal.title}
                    style={{ width: "100%", height: 140, objectFit: "contain", background: "#f9fafb", borderRadius: 8 }}
                  />
                )}
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{deal.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>
                    ${deal.price.toFixed(0)} {deal.currency}
                  </span>
                  {deal.market_price && (
                    <span style={{ fontSize: 12, color: "#9ca3af", textDecoration: "line-through" }}>
                      ${deal.market_price.toFixed(0)}
                    </span>
                  )}
                </div>
                {deal.condition && <span style={{ fontSize: 12, color: "#6b7280" }}>{deal.condition}</span>}
              </a>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
        @keyframes radarPing {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmerMove {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .shimmer {
          background-image: linear-gradient(90deg, #f3f4f6 0px, #e5e7eb 40px, #f3f4f6 80px);
          background-size: 400px 100%;
          animation: shimmerMove 1.4s linear infinite;
        }
        @keyframes dealCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .deal-card-in {
          animation: dealCardIn 0.35s ease-out backwards;
        }
      `}</style>
    </div>
  );
}