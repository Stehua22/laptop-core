import type { Metadata } from "next";
import Link from "next/link";
import { loadPicks } from "@/lib/picksData";
import { REASON_TEXT, type ExcludeReason, type Scored } from "@/lib/picksEngine";
import { SLOTS } from "@/lib/todaysPicks";

// Behind-the-scenes view of how Today's Picks decides. Not linked anywhere and hidden from search engines.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Today's Picks diagnostics", robots: { index: false, follow: false } };

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const pct = (n: number | null) => (n === null ? "-" : `${Math.round(n * 100)}%`);

const th = { textAlign: "left" as const, padding: "6px 10px", fontSize: 11, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" as const };
const td = { padding: "6px 10px", fontSize: 12.5, color: "var(--text)", borderBottom: "1px solid var(--border)", verticalAlign: "top" as const };

function Row({ s }: { s: Scored }) {
  const p = s.parsed;
  return (
    <tr>
      <td style={td}>
        <Link href={`/laptop/${s.id}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
          {s.brand} {s.model.slice(0, 44)}
        </Link>
      </td>
      <td style={td}>{money(s.price)}</td>
      <td style={td}>{s.peerMedian ? money(s.peerMedian) : "-"}</td>
      <td style={td}>{pct(s.below)}</td>
      <td style={td}>{pct(s.discount_pct === null ? null : s.discount_pct / 100)}</td>
      <td style={td}>{p.cpu ? `${p.cpu.label} (${p.cpu.year})` : "unknown"}</td>
      <td style={td}>{p.ramGb ?? "?"}GB / {p.storageGb ?? "?"}GB / gpu {p.gpu.tier}</td>
      <td style={td}>{s.reason ? REASON_TEXT[s.reason] : "qualifies"}</td>
    </tr>
  );
}

export default async function PicksDiagnostics() {
  const dateKey = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  const { total, scored, model, pools, picks } = await loadPicks(dateKey);

  const counts = new Map<string, number>();
  for (const s of scored) counts.set(s.reason ?? "qualifies", (counts.get(s.reason ?? "qualifies") ?? 0) + 1);

  const bigDiscountsLeftOut = scored
    .filter((s) => s.reason !== null)
    .sort((a, b) => (b.discount_pct ?? 0) - (a.discount_pct ?? 0))
    .slice(0, 20);
  const topQualifying = scored.filter((s) => s.reason === null).sort((a, b) => b.score - a.score).slice(0, 15);

  const head = (
    <tr>
      {["Laptop", "Price", "Expected", "Under expected", "Store discount", "Processor", "RAM / storage / gpu tier", "Result"].map((h) => (
        <th key={h} style={th}>{h}</th>
      ))}
    </tr>
  );

  return (
    <main style={{ position: "relative", zIndex: 1, maxWidth: 1250, margin: "0 auto", padding: "28px 20px 80px", color: "var(--text)" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Today&apos;s Picks diagnostics</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
        {dateKey} &middot; {total} laptops loaded &middot; <Link href="/todays-picks" style={{ color: "var(--accent)" }}>back to Today&apos;s Picks</Link>
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: "18px 0 8px" }}>Price model</h2>
      {model.ready ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
          Learned from {model.n} laptops. Typical spread {pct(model.sigma)}, so a laptop must be at least {pct(model.needBelow)} under its
          expected price to count as a deal. Each doubling of RAM adds about {pct(model.perDoubleRam)}, each doubling of storage{" "}
          {pct(model.perDoubleStorage)}, each +10 processor score {pct(model.per10Perf)}. Graphics tiers 1 to 4 add{" "}
          {model.gpu.map((g) => pct(g)).join(", ")}. Apple {pct(model.apple)}, business lines {pct(model.business)}.
        </p>
      ) : (
        <p style={{ fontSize: 13, color: "#d9534f" }}>Not enough laptops with readable specs to build a price model.</p>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: "18px 0 8px" }}>Why laptops were included or left out</h2>
      <table style={{ borderCollapse: "collapse", marginBottom: 8 }}>
        <tbody>
          {Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([reason, n]) => (
              <tr key={reason}>
                <td style={td}>{reason === "qualifies" ? "Qualifies for picks" : REASON_TEXT[reason as ExcludeReason]}</td>
                <td style={{ ...td, textAlign: "right" }}>{n}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: "22px 0 8px" }}>Biggest store &ldquo;discounts&rdquo; that did NOT make it, and why</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>{head}</thead>
          <tbody>{bigDiscountsLeftOut.map((s) => <Row key={s.id} s={s} />)}</tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: "22px 0 8px" }}>Best qualifying laptops overall</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>{head}</thead>
          <tbody>{topQualifying.map((s) => <Row key={s.id} s={s} />)}</tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: "22px 0 8px" }}>Today&apos;s candidates per slot (the date picks one of the top 5)</h2>
      {SLOTS.map((slot) => (
        <div key={slot.key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
            {slot.label}
            {picks.find((p) => p.slot.key === slot.key) ? ` \u2192 picked #${picks.find((p) => p.slot.key === slot.key)!.laptop.id}` : " \u2192 nothing qualified"}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <tbody>{pools[slot.key].map((s) => <Row key={s.id} s={s} />)}</tbody>
            </table>
          </div>
        </div>
      ))}
    </main>
  );
}
