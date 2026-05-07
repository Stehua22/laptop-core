"use client";

import type { Laptop } from "@/lib/supabase";
import LaptopCard from "./LaptopCard";

type Props = {
  laptops: Laptop[];
  onSelect: (l: Laptop) => void;
  onHistory: (l: Laptop) => void;
};

export default function LaptopGrid({ laptops, onSelect, onHistory }: Props) {
  return (
    <section>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        marginBottom: 16,
      }}>
        // all laptops{" "}
        <span style={{ color: "var(--accent)" }}>({laptops.length})</span>
      </div>

      {laptops.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "80px 20px",
          color: "var(--text-muted)",
          fontFamily: "'DM Mono', monospace",
          fontSize: 13,
          background: "var(--surface)",
          borderRadius: 14,
          border: "1px solid var(--border)",
        }}>
          No laptops found.
        </div>
      ) : (
        <div
          className="stagger"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {laptops.map((l) => (
            <div key={l.id} className="animate-fade-up" style={{ opacity: 0 }}>
              <LaptopCard laptop={l} onSelect={onSelect} onHistory={onHistory} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
