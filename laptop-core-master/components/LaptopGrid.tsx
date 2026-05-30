"use client";
import type { Laptop } from "@/lib/supabase";
import LaptopCard from "./LaptopCard";

type Props = {
  laptops: Laptop[];
  onSelect: (l: Laptop) => void;
  onHistory: (l: Laptop) => void;
  isAdmin?: boolean;
  onMoveToDeals?: (l: Laptop) => void;
  onDelete?: (id: number) => void;
  currency?: "CAD" | "USD";
  cadToUsd?: number;
};

export default function LaptopGrid({ laptops, onSelect, onHistory, isAdmin, onMoveToDeals, onDelete, currency = "CAD", cadToUsd = 0.73 }: Props) {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600 }}>
          // all laptops <span style={{ color: "var(--accent)", marginLeft: 4 }}>({laptops.length})</span>
        </div>
      </div>
      {laptops.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)", fontSize: 13, background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No laptops found</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Try adjusting your search or filters</div>
        </div>
      ) : (
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {laptops.map((l) => (
            <div key={l.id} className="animate-fade-up" style={{ opacity: 0 }}>
              <LaptopCard laptop={l} onSelect={onSelect} onHistory={onHistory} isAdmin={isAdmin} onMoveToDeals={onMoveToDeals} onDelete={onDelete} currency={currency} cadToUsd={cadToUsd} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
