"use client";

import type { Laptop } from "@/lib/supabase";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

type Props = { laptop: Laptop; onClose: () => void };

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function PriceHistoryModal({ laptop, onClose }: Props) {
  const history = (laptop.price_history ?? []).map((h) => ({
    date: h.recorded_at,
    price: h.price,
  }));

  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const changed = min !== max;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1001,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      />
      <div style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border-hover)",
        borderRadius: 16,
        width: "100%",
        maxWidth: 720,
        overflow: "hidden",
        animation: "fadeUp 0.3s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: 4,
            }}>Price History</div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "1.2rem",
              color: "var(--text)",
            }}>{laptop.brand} {laptop.model}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text-muted)", cursor: "pointer",
              width: 36, height: 36, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 16,
            }}
          >×</button>
        </div>

        {/* Stats strip */}
        {prices.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            background: "var(--border)",
            borderBottom: "1px solid var(--border)",
          }}>
            {[
              { label: "Current", value: fmt(prices[prices.length - 1]) },
              { label: "Lowest",  value: fmt(min),  color: "var(--accent-3)" },
              { label: "Highest", value: fmt(max),  color: "#f76a6a" },
            ].map((s) => (
              <div key={s.label} style={{
                background: "var(--surface)",
                padding: "14px 20px",
                textAlign: "center",
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.2rem", color: s.color ?? "var(--text)" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div style={{ padding: "24px" }}>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
              No price history recorded yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={history} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  domain={changed ? ["auto", "auto"] : [0, "auto"]}
                  tickFormatter={fmt}
                  tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(v: number) => [fmt(v), "Price"]}
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-hover)",
                    borderRadius: 8,
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                  cursor={{ stroke: "var(--accent)", strokeWidth: 1, strokeDasharray: "4 2" }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ fill: "var(--accent-3)", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--accent)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* History table */}
          {history.length > 0 && (
            <div style={{ marginTop: 20, maxHeight: 160, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Date", "Price", "Change"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left",
                        padding: "6px 0",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        borderBottom: "1px solid var(--border)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h, i, arr) => {
                    const prev = arr[i + 1];
                    const delta = prev ? h.price - prev.price : null;
                    return (
                      <tr key={h.date + i}>
                        <td style={{ padding: "8px 0", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h.date}</td>
                        <td style={{ padding: "8px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{fmt(h.price)}</td>
                        <td style={{ padding: "8px 0", fontFamily: "'DM Mono', monospace", fontSize: 12, color: delta === null ? "var(--text-dim)" : delta < 0 ? "var(--accent-3)" : delta > 0 ? "#f76a6a" : "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                          {delta === null ? "—" : delta < 0 ? `▼ ${fmt(Math.abs(delta))}` : delta > 0 ? `▲ ${fmt(delta)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
