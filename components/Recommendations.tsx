"use client";

import type { Laptop } from "@/lib/supabase";
import LaptopCard from "./LaptopCard";

const CATEGORIES = [
  { key: "student",  label: "Students" },
  { key: "home",     label: "Home" },
  { key: "business", label: "Business" },
];

type Props = {
  laptops: Laptop[];
  category: string;
  onCategoryChange: (c: string) => void;
  onSelect: (l: Laptop) => void;
  onHistory: (l: Laptop) => void;
};

export default function Recommendations({ laptops, category, onCategoryChange, onSelect, onHistory }: Props) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}>
          // best picks
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => onCategoryChange(c.key)}
              style={{
                background: category === c.key ? "var(--accent)" : "transparent",
                border: `1px solid ${category === c.key ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8,
                color: category === c.key ? "#fff" : "var(--text-muted)",
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                padding: "6px 14px",
                cursor: "pointer",
                transition: "all 0.15s",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {laptops.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}>
          {laptops.map((l) => (
            <LaptopCard key={l.id} laptop={l} onSelect={onSelect} onHistory={onHistory} />
          ))}
        </div>
      ) : (
        <div style={{
          padding: "32px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          background: "var(--surface)",
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}>
          No picks yet for this category.
        </div>
      )}
    </section>
  );
}
