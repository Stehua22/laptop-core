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

type Plan = "free" | "premium" | "ultra";

const SOURCE_LABEL: Record<string, string> = {
  ebay: "eBay",
  bestbuy: "Best Buy",
  facebook: "Facebook Marketplace",
};

// How many Best Buy results each plan can see, ranked by deal score.
// Everything beyond a tier's count still gets scanned and stored — it's
// just shown as a locked card, same as an is_premium_deal listing.
const BESTBUY_LIMITS: Record<Plan, number> = {
  free: 155,
  premium: 250,
  ultra: 350,
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
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
  const [plan, setPlan] = useState<Plan>("free");

  const loadDeals = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    const { data } = await sb
      .from("deals")
      .select("*")
      .eq("is_active", true)
      .order("deal_score", { ascending: false, nullsFirst: false })
      // Bumped from 200 so the Ultra tier's 350-result Best Buy cap has
      // enough rows to actually draw from, on top of eBay/Facebook results.
      .limit(500);
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
      if (!sb) { setHasAccess(false); setPlan("free"); return; }
      const { data: sessionData } = await sb.auth.getSession();
      const session = sessionData.session;
      if (!session) { setHasAccess(false); setPlan("free"); return; }

      const { data: profile } = await sb
        .from("profiles")
        .select("plan")
        .eq("id", session.user.id)
        .single();

      const resolvedPlan: Plan =
        profile?.plan === "ultra" ? "ultra" : profile?.plan === "premium" ? "premium" : "free";
      setPlan(resolvedPlan);
      setHasAccess(resolvedPlan === "premium" || resolvedPlan === "ultra");
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

  // `filtered` is already ordered by deal_score desc (from the query), so
  // walking it in order and counting Best Buy rows gives the top-N Best Buy
  // deals by score for whichever limit this plan gets.
  const bestbuyLimit = BESTBUY_LIMITS[plan];
  let bestbuySeen = 0;
  const withLocks = filtered.map((d) => {
    let locked = !!(d.is_premium_deal && !hasAccess);
    if (d.source === "bestbuy") {
      bestbuySeen += 1;
      if (bestbuySeen > bestbuyLimit) locked = true;
    }
    return { deal: d, locked };
  });

  const unlockedCount = withLocks.filter((x) => !x.locked).length;
  const lockedCount = withLocks.length - unlockedCount;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px", position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes lc-scan-orb { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(28px,-22px) scale(1.1); } }
        @keyframes lc-scan-sheen { 0% { background-position: -120% 0; } 100% { background-position: 220% 0; } }
        @keyframes lc-scan-btn-glow { 0%,100% { box-shadow: 0 4px 16px var(--glow); } 50% { box-shadow: 0 4px 24px var(--glow); } }
        .lc-scan-orb { position: absolute; top: -140px; right: -100px; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, var(--accent) 0%, transparent 70%); opacity: 0.13; filter: blur(50px); pointer-events: none; z-index: 0; animation: lc-scan-orb 11s ease-in-out infinite; }
        .lc-scan-title { background: linear-gradient(100deg, var(--text) 30%, var(--accent) 45%, var(--text) 60%); background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: lc-scan-sheen 7s linear infinite; }
        .lc-scan-btn { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .lc-scan-btn:not(:disabled):hover { transform: translateY(-2px); }
        .lc-scan-btn:not(:disabled) { animation: lc-scan-btn-glow 2.4s ease-in-out infinite; }
        .lc-scan-select { transition: border-color 0.15s; }
        .lc-scan-select:hover { border-color: var(--accent) !important; }
        .lc-scan-card { transition: transform 0.2s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
        .lc-scan-card:hover { transform: translateY(-4px); border-color: var(--accent) !important; box-shadow: 0 14px 32px rgba(0,0,0,0.15); }
        .lc-scan-upgrade:hover { transform: translateY(-1px); box-shadow: 0 6px 18px var(--glow); }
        .lc-scan-shimmer { background-image: linear-gradient(90deg, var(--surface) 0px, var(--surface-2) 40px, var(--surface) 80px); background-size: 400px 100%; animation: shimmerMove 1.4s linear infinite; }
      `}} />
      <div className="lc-scan-orb" />

      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span style={{ position: "relative", width: 10, height: 10, display: "inline-block" }}>
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: scanning ? "#22c55e" : "var(--text-dim)",
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
        <h1 className="lc-scan-title" style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Deal Scanner</h1>
      </div>
      <p style={{ position: "relative", zIndex: 1, color: "var(--text-muted)", marginBottom: 12, fontSize: 13.5 }}>
        Refurbished Lenovo, Dell, HP &amp; more — scanned from eBay, Best Buy, and Facebook
        Marketplace. Best Buy results: {bestbuyLimit} on your plan.
        {lastScan && ` Last manual scan: ${lastScan.toLocaleTimeString()}.`}
      </p>

      {lockedCount > 0 && (
        <div
          style={{
            position: "relative", zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 18px",
            borderRadius: 10,
            background: "var(--glow)",
            border: "1px solid var(--accent-2)",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--accent-2)", fontWeight: 700 }}>
            🔒 {lockedCount} more deal{lockedCount !== 1 ? "s" : ""} available with {plan === "free" ? "Premium or Ultra" : "Ultra"}
          </span>
          <Link
            href="/premium"
            className="lc-scan-upgrade"
            style={{
              fontSize: 12,
              padding: "7px 16px",
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent-2), var(--accent))",
              color: "#fff",
              fontWeight: 700,
              textDecoration: "none",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            Upgrade
          </Link>
        </div>
      )}

      {scanning && (
        <div style={{ position: "relative", zIndex: 1, marginBottom: 20 }}>
          <div style={{ height: 6, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${scanProgress}%`,
                background: "linear-gradient(90deg, var(--accent), var(--accent-3))",
                borderRadius: 99,
                transition: "width 0.15s linear",
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6, fontFamily: "monospace" }}>
            Scanning eBay, Best Buy &amp; Facebook Marketplace…
          </p>
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <button
          className="lc-scan-btn"
          onClick={triggerScan}
          disabled={scanning}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: scanning ? "var(--text-dim)" : "linear-gradient(135deg, var(--accent), var(--accent-3))",
            color: "#fff",
            fontWeight: 700,
            cursor: scanning ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
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

        <select className="lc-scan-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={selectStyle}>
          <option value="all">All sources</option>
          <option value="ebay">eBay</option>
          <option value="bestbuy">Best Buy</option>
          <option value="facebook">Facebook Marketplace</option>
        </select>

        <select className="lc-scan-select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} style={selectStyle}>
          <option value="all">All brands</option>
          {brandOptions.map((b) => (
            <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
          ))}
        </select>

        <select className="lc-scan-select" value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} style={selectStyle}>
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
          className="lc-scan-select"
          style={{ ...selectStyle, width: 130 }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-muted)" }}>
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
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}
          >
            Clear filters
          </button>
        )}
      </div>

      <p style={{ position: "relative", zIndex: 1, fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
        {filtered.length} of {deals.length} deals shown
      </p>

      {loading || (scanning && deals.length === 0) ? (
        <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "var(--surface)",
              }}
            >
              <div className="lc-scan-shimmer" style={{ height: 140, borderRadius: 8 }} />
              <div className="lc-scan-shimmer" style={{ height: 14, width: "80%", borderRadius: 4 }} />
              <div className="lc-scan-shimmer" style={{ height: 18, width: "50%", borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ position: "relative", zIndex: 1, color: "var(--text-muted)" }}>
          No deals matching your filters yet. Try lowering the min score, clearing filters, or hit &quot;Scan now&quot;.
        </p>
      ) : (
        <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {withLocks.map(({ deal, locked }, i) => {
            if (locked) {
              return (
                <div
                  key={deal.id}
                  className="deal-card-in"
                  style={{
                    border: "1px solid var(--accent-2)",
                    borderRadius: 12,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    position: "relative",
                    animationDelay: `${Math.min(i, 20) * 0.03}s`,
                    background: "var(--glow)",
                  }}
                >
                  <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
                      <span>{SOURCE_LABEL[deal.source] ?? deal.source}</span>
                      <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>{deal.deal_score}/100</span>
                    </div>
                    {deal.image_url && (
                      <img
                        src={deal.image_url}
                        alt=""
                        style={{ width: "100%", height: 140, objectFit: "contain", background: "var(--surface-2)", borderRadius: 8, marginTop: 8 }}
                      />
                    )}
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8, color: "var(--text)" }}>{deal.title}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>
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
                      background: "rgba(10,14,24,0.5)",
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>🔒</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-2)" }}>
                      {deal.source === "bestbuy" ? "More results with a higher plan" : "Premium deal"}
                    </span>
                    <Link
                      href="/premium"
                      className="lc-scan-upgrade"
                      style={{
                        fontSize: 12,
                        padding: "6px 14px",
                        borderRadius: 8,
                        background: "linear-gradient(135deg, var(--accent-2), var(--accent))",
                        color: "#fff",
                        fontWeight: 700,
                        textDecoration: "none",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
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
                className="deal-card-in lc-scan-card"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 14,
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  animationDelay: `${Math.min(i, 20) * 0.03}s`,
                  background: "var(--surface)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
                  <span>{SOURCE_LABEL[deal.source] ?? deal.source}</span>
                  {deal.deal_score !== null && (
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          deal.deal_score >= 70 ? "var(--accent-3)" : deal.deal_score >= 40 ? "var(--accent-2)" : "var(--text-muted)",
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
                    style={{ width: "100%", height: 140, objectFit: "contain", background: "var(--surface-2)", borderRadius: 8 }}
                  />
                )}
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: "var(--text)" }}>{deal.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                    ${deal.price.toFixed(0)} {deal.currency}
                  </span>
                  {deal.market_price && (
                    <span style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "line-through" }}>
                      ${deal.market_price.toFixed(0)}
                    </span>
                  )}
                </div>
                {deal.condition && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{deal.condition}</span>}
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