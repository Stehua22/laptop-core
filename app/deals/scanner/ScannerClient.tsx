"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

export default function ScannerClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("");

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

  async function triggerScan() {
    setScanning(true);
    try {
      // NEXT_PUBLIC_DEAL_SCAN_SECRET must match DEAL_SCAN_SECRET server-side.
      // Fine for a personal single-user project; don't reuse this pattern
      // for anything with real users hitting the client bundle.
      await fetch(`/api/deals/scan?secret=${process.env.NEXT_PUBLIC_DEAL_SCAN_SECRET}`);
      await loadDeals();
      setLastScan(new Date());
    } finally {
      setScanning(false);
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

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: scanning ? "var(--accent, #22c55e)" : "#9ca3af",
            animation: scanning ? "pulse 1s ease-in-out infinite" : "none",
          }}
        />
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Deal Scanner</h1>
      </div>
      <p style={{ color: "#6b7280", marginBottom: 20 }}>
        Refurbished Lenovo, Dell, HP &amp; more — scanned from eBay, Best Buy, and Facebook
        Marketplace.
        {lastScan && ` Last manual scan: ${lastScan.toLocaleTimeString()}.`}
      </p>

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
          }}
        >
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

      {loading ? (
        <p>Loading deals…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#6b7280" }}>
          No deals matching your filters yet. Try lowering the min score, clearing filters, or hit &quot;Scan now&quot;.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {filtered.map((deal) => (
            <a
              key={deal.id}
              href={deal.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
                gap: 8,
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
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
