"use client";
import type { Laptop } from "@/lib/supabase";
import LaptopCard from "./LaptopCard";

const CATEGORIES = [
  { key: "student", label: "Students", icon: "🎓" },
  { key: "home", label: "Home", icon: "🏠" },
  { key: "business", label: "Business", icon: "💼" },
];

type Props = {
  laptops: Laptop[]; allLaptops: Laptop[]; category: string;
  recommendationIds: Record<string, number[]>;
  onCategoryChange: (c: string) => void; onSelect: (l: Laptop) => void;
  onHistory: (l: Laptop) => void; isAdmin: boolean;
  onToggleRecommendation: (category: string, laptopId: number) => void;
  onUnlockAdmin: () => void; currency?: "CAD" | "USD"; cadToUsd?: number;
};

export default function Recommendations({ laptops, allLaptops, category, recommendationIds, onCategoryChange, onSelect, onHistory, isAdmin, onToggleRecommendation, onUnlockAdmin, currency = "CAD", cadToUsd = 0.73 }: Props) {
  const currentIds = recommendationIds[category] ?? [];

  function fmtPrice(price: number) {
    const value = currency === "USD" ? price * cadToUsd : price;
    return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  }

  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600 }}>// best picks</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => onCategoryChange(c.key)}
              style={{ background: category === c.key ? "var(--accent)" : "var(--surface)", border: `1px solid ${category === c.key ? "var(--accent)" : "var(--border)"}`, borderRadius: 99, color: category === c.key ? "#fff" : "var(--text-muted)", fontSize: 12, fontWeight: category === c.key ? 600 : 400, padding: "6px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: category === c.key ? "0 4px 12px rgba(139,179,245,0.3)" : "none" }}
            ><span>{c.icon}</span> {c.label}</button>
          ))}
          {isAdmin ? (
            <span style={{ fontSize: 10, color: "var(--accent-3)", border: "1px solid var(--accent-3)", borderRadius: 99, padding: "5px 12px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>✏ Editing</span>
          ) : (
            <button onClick={onUnlockAdmin}
              style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 12px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border-hover)"; el.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; }}
            >🔒 Edit picks</button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="animate-scale-in" style={{ background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
            Select laptops for <span style={{ color: "var(--accent)" }}>{CATEGORIES.find(c => c.key === category)?.label}</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, maxHeight: 260, overflowY: "auto" }}>
            {allLaptops.map((l) => {
              const selected = currentIds.includes(l.id);
              return (
                <button key={l.id} onClick={() => onToggleRecommendation(category, l.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`, background: selected ? "rgba(139,179,245,0.1)" : "transparent", color: "inherit", textAlign: "left" }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`, background: selected ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>{selected ? "✓" : ""}</span>
                  <span style={{ fontSize: 12, lineHeight: 1.3 }}>
                    <span style={{ display: "block", fontWeight: 500 }}>{l.model}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{l.brand} · {fmtPrice(l.current_price ?? 0)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {laptops.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {laptops.map((l) => <LaptopCard key={l.id} laptop={l} onSelect={onSelect} onHistory={onHistory} currency={currency} cadToUsd={cadToUsd} />)}
        </div>
      ) : (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: 13, background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
          {isAdmin ? "Check laptops above to add them to this category." : "No picks yet for this category."}
        </div>
      )}
    </section>
  );
}