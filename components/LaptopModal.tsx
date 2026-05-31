"use client";
import type { Laptop } from "@/lib/supabase";

function fmt(n: number, currency: "CAD" | "USD" = "CAD", rate = 0.73) {
  const value = currency === "USD" ? n * rate : n;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

type Props = { laptop: Laptop; onClose: () => void; onUpdatePrice: (id: number) => void; onDelete: (id: number) => void; onHistory: (l: Laptop) => void; currency?: "CAD" | "USD"; cadToUsd?: number; };

export default function LaptopModal({ laptop, onClose, onUpdatePrice, onDelete, onHistory, currency = "CAD", cadToUsd = 0.73 }: Props) {
  const price = laptop.current_price ?? 0;
  const retail = laptop.retail_price ?? price;
  const hasDiscount = retail > price;
  const discountPct = hasDiscount ? ((retail - price) / retail * 100).toFixed(1) : null;

  const rows: [string, string][] = [
    ["Brand", laptop.brand], ["Model", laptop.model], ["Store", laptop.store],
    ["Release Year", String(laptop.release_year ?? "—")], ["Date Added", laptop.date_added],
    ["Current Price", fmt(price, currency, cadToUsd)], ["Retail Price", fmt(retail, currency, cadToUsd)],
    ...(discountPct ? [["Discount", `${discountPct}% off`] as [string, string]] : []),
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} className="modal-backdrop" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} />
      <div className="modal-content" style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--border-hover)", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3))" }} />
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 6, fontWeight: 600 }}>{laptop.brand}</div>
            <h2 style={{ fontWeight: 800, fontSize: "1.35rem", color: "var(--text)", lineHeight: 1.2 }}>{laptop.model}</h2>
          </div>
          <button onClick={onClose} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-muted)", cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent-red)"; el.style.color = "var(--accent-red)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; }}>×</button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7, borderLeft: "3px solid var(--accent)" }}>{laptop.specs}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "rgba(139,179,245,0.1)", border: "1px solid rgba(139,179,245,0.25)", borderRadius: 99, padding: "3px 10px", letterSpacing: "0.08em" }}>Prices in {currency}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "11px 0", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", width: "40%", fontWeight: 600 }}>{label}</td>
                  <td style={{ padding: "11px 0", fontWeight: 600, fontSize: 14, color: label === "Current Price" ? "var(--accent-3)" : "var(--text)" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {laptop.url && (<div style={{ marginTop: 16 }}><div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Store URL</div><a href={laptop.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", wordBreak: "break-all" }}>{laptop.url}</a></div>)}
        </div>
        <div style={{ padding: "14px 24px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "+ Update Price", onClick: () => onUpdatePrice(laptop.id), bg: "var(--accent)", color: "#fff", border: "none" },
            { label: "📈 History", onClick: () => onHistory(laptop), bg: "transparent", color: "var(--text-muted)", border: "var(--border)" },
            { label: "🔗 Visit Store", onClick: () => window.open(laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`, "_blank"), bg: "transparent", color: "var(--text-muted)", border: "var(--border)" },
          ].map(({ label, onClick, bg, color, border }) => (
            <button key={label} onClick={onClick} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 9, color, fontSize: 12, padding: "9px 16px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}
              onMouseEnter={(e) => { if (bg === "transparent") { const el = e.currentTarget as HTMLElement; el.style.background = "var(--surface-2)"; el.style.color = "var(--text)"; } }}
              onMouseLeave={(e) => { if (bg === "transparent") { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "var(--text-muted)"; } }}
            >{label}</button>
          ))}
          <button onClick={() => onDelete(laptop.id)} style={{ marginLeft: "auto", background: "rgba(247,106,106,0.08)", border: "1px solid rgba(247,106,106,0.3)", borderRadius: 9, color: "var(--accent-red)", fontSize: 12, padding: "9px 16px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,106,106,0.15)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,106,106,0.08)"; }}>🗑 Remove</button>
        </div>
      </div>
    </div>
  );
}
