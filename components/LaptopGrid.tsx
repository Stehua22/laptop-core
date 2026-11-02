"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Laptop } from "@/lib/supabase";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import LaptopCard from "./LaptopCard";
import CompareModal from "./CompareModal";

type Props = {
  laptops: Laptop[];
  onSelect: (l: Laptop) => void;
  onHistory: (l: Laptop) => void;
  isAdmin?: boolean;
  onMoveToDeals?: (l: Laptop) => void;
  onDelete?: (id: number) => void;
  currency?: "CAD" | "USD";
  cadToUsd?: number;
  cardLayout?: "row" | "grid" | "compact";
};

const FREE_COMPARE_LIMIT = 3;
const PREMIUM_COMPARE_LIMIT = 6;

export default function LaptopGrid({ laptops, onSelect, onHistory, isAdmin, onMoveToDeals, onDelete, currency = "CAD", cadToUsd = 0.73, cardLayout = "row" }: Props) {
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function checkPremium() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const session = sessionData.session;
      if (!session) return;
      const { data: profile } = await supabaseBrowser
        .from("profiles")
        .select("is_premium")
        .eq("id", session.user.id)
        .single();
      setIsPremium(!!profile?.is_premium);
    }
    checkPremium();
  }, []);

  const limit = isPremium ? PREMIUM_COMPARE_LIMIT : FREE_COMPARE_LIMIT;

  const toggleCompare = (laptop: Laptop) => {
    setCompareIds(prev =>
      prev.includes(laptop.id)
        ? prev.filter(id => id !== laptop.id)
        : prev.length < limit ? [...prev, laptop.id] : prev
    );
  };

  const removeFromCompare = (id: number) => {
    const next = compareIds.filter(i => i !== id);
    setCompareIds(next);
    if (next.length === 0) setShowCompare(false);
  };

  const compareLaptops = laptops.filter(l => compareIds.includes(l.id));

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>
          All laptops <span style={{ color: "var(--accent)", marginLeft: 4 }}>({laptops.length})</span>
        </div>
        {compareIds.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>{compareIds.length}</span> selected to compare
            <button onClick={() => setCompareIds([])} style={{ marginLeft: 8, fontSize: 11, background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", textDecoration: "underline" }}>clear</button>
          </div>
        )}
      </div>

      {laptops.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)", fontSize: 13, background: "var(--surface)", borderRadius: "var(--card-radius, 10px)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No laptops found</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Try adjusting your search or filters</div>
        </div>
      ) : (
        <div style={cardLayout === "grid" ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, paddingBottom: compareIds.length > 0 ? 100 : 0 } : { display: "flex", flexDirection: "column" as const, gap: cardLayout === "compact" ? 6 : 12, paddingBottom: compareIds.length > 0 ? 100 : 0 }}>
          {laptops.map((l, i) => (
            <div key={l.id} style={{ animation: `lc-card-in 0.4s cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 0.03, 0.4)}s both` }}>
              <LaptopCard
                laptop={l} onSelect={onSelect} onHistory={onHistory}
                isAdmin={isAdmin} onMoveToDeals={onMoveToDeals} onDelete={onDelete}
                currency={currency} cadToUsd={cadToUsd}
                compareSelected={compareIds.includes(l.id)}
                onCompareToggle={toggleCompare}
                compareDisabled={compareIds.length >= limit && !compareIds.includes(l.id)}
                cardLayout={cardLayout}
              />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes lc-card-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lc-bar-in {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>

      {/* Sticky compare bar — rendered via portal so no ancestor styling can clip or misposition it */}
      {mounted && compareIds.length > 0 && createPortal(
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99999,
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          boxShadow: "0 -6px 24px rgba(0,0,0,0.12)",
          padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
          animation: "lc-bar-in 0.3s cubic-bezier(0.16,1,0.3,1) both",
        }}>
          {/* Laptop chips */}
          <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "flex-end" }}>
            {compareLaptops.map(l => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-2)", border: "1px solid var(--accent)", borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
                {(l as any).image_url && <img src={(l as any).image_url} alt={l.model} style={{ height: 24, width: 32, objectFit: "contain", background: "#fff", borderRadius: 3 }} />}
                <span style={{ fontWeight: 600, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.model}</span>
                <button onClick={() => removeFromCompare(l.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, limit - compareIds.length) }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px dashed var(--border)", borderRadius: 8, padding: "6px 20px", fontSize: 11, color: "var(--text-dim)", minWidth: 100 }}>
                + Add
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setCompareIds([])} style={{ fontSize: 13, padding: "9px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
              Clear
            </button>
            <button
              onClick={() => setShowCompare(true)}
              disabled={compareIds.length < 2}
              style={{ fontSize: 13, padding: "9px 22px", borderRadius: 8, border: "none", background: compareIds.length >= 2 ? "var(--accent)" : "var(--surface-2)", color: compareIds.length >= 2 ? "#fff" : "var(--text-dim)", cursor: compareIds.length >= 2 ? "pointer" : "not-allowed", fontWeight: 700, transition: "all 0.15s" }}
            >
              Compare {compareIds.length}/{limit}
            </button>
          </div>
        </div>,
        document.body
      )}

      {showCompare && (
        <CompareModal
          laptops={compareLaptops}
          onClose={() => setShowCompare(false)}
          onRemove={removeFromCompare}
          currency={currency}
          cadToUsd={cadToUsd}
        />
      )}
    </section>
  );
}