"use client";
import { useState } from "react";
import type { Laptop } from "@/lib/supabase";
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

export default function LaptopGrid({ laptops, onSelect, onHistory, isAdmin, onMoveToDeals, onDelete, currency = "CAD", cadToUsd = 0.73, cardLayout = "row" }: Props) {
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const toggleCompare = (laptop: Laptop) => {
    setCompareIds(prev =>
      prev.includes(laptop.id)
        ? prev.filter(id => id !== laptop.id)
        : prev.length < 3 ? [...prev, laptop.id] : prev
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
        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600 }}>
          // all laptops <span style={{ color: "var(--accent)", marginLeft: 4 }}>({laptops.length})</span>
        </div>
        {compareIds.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>{compareIds.length}</span> selected to compare
            <button onClick={() => setCompareIds([])} style={{ marginLeft: 8, fontSize: 10, background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", textDecoration: "underline" }}>clear</button>
          </div>
        )}
      </div>

      {laptops.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)", fontSize: 13, background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No laptops found</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Try adjusting your search or filters</div>
        </div>
      ) : (
        <div style={cardLayout === "grid" ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, paddingBottom: compareIds.length > 0 ? 100 : 0 } : { display: "flex", flexDirection: "column" as const, gap: cardLayout === "compact" ? 6 : 10, paddingBottom: compareIds.length > 0 ? 100 : 0 }}>
          {laptops.map((l) => (
            <LaptopCard
              key={l.id} laptop={l} onSelect={onSelect} onHistory={onHistory}
              isAdmin={isAdmin} onMoveToDeals={onMoveToDeals} onDelete={onDelete}
              currency={currency} cadToUsd={cadToUsd}
              compareSelected={compareIds.includes(l.id)}
              onCompareToggle={toggleCompare}
              compareDisabled={compareIds.length >= 3 && !compareIds.includes(l.id)}
              cardLayout={cardLayout}
            />
          ))}
        </div>
      )}

      {/* Sticky compare bar */}
      {compareIds.length > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 500,
          background: "rgba(10,12,18,0.92)", backdropFilter: "blur(16px)",
          borderTop: "1px solid var(--border)",
          padding: "16px 24px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          {/* Laptop chips */}
          <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "flex-end" }}>
            {compareLaptops.map(l => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: 10, padding: "6px 12px", fontSize: 12 }}>
                {(l as any).image_url && <img src={(l as any).image_url} alt={l.model} style={{ height: 24, width: 32, objectFit: "contain" }} />}
                <span style={{ fontWeight: 600, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.model}</span>
                <button onClick={() => removeFromCompare(l.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: 3 - compareIds.length }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 10, padding: "6px 20px", fontSize: 11, color: "var(--text-dim)", minWidth: 100 }}>
                + Add
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setCompareIds([])} style={{ fontSize: 13, padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
              Clear
            </button>
            <button
              onClick={() => setShowCompare(true)}
              disabled={compareIds.length < 2}
              style={{ fontSize: 13, padding: "9px 22px", borderRadius: 10, border: "none", background: compareIds.length >= 2 ? "linear-gradient(135deg, var(--accent), #6ab4f5)" : "var(--surface)", color: compareIds.length >= 2 ? "#fff" : "var(--text-dim)", cursor: compareIds.length >= 2 ? "pointer" : "not-allowed", fontWeight: 700, boxShadow: compareIds.length >= 2 ? "0 4px 16px rgba(139,179,245,0.3)" : "none", transition: "all 0.15s" }}
            >
              Compare {compareIds.length}/3
            </button>
          </div>
        </div>
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
