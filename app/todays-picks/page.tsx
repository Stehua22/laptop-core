import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { loadPicks } from "@/lib/picksData";
import { formatStorage } from "@/lib/laptopSpecs";
import type { Scored } from "@/lib/picksEngine";

// The page is rebuilt every 30 minutes, so the picks switch over shortly after midnight (Toronto time)
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Today's Picks | Best Canadian Laptop Deals Today | LaptopCore",
  description:
    "Fresh every day: laptops priced well below what their specs normally cost in Canada. Modern hardware only, with the numbers shown.",
};

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const roundTo10 = (n: number) => Math.round(n / 10) * 10;

function PickCard({ label, blurb, laptop }: { label: string; blurb: string; laptop: Scored }) {
  const { parsed } = laptop;
  const typical = laptop.peerMedian ? roundTo10(laptop.peerMedian) : null;
  const below = laptop.below ? Math.round(laptop.below * 100) : 0;
  const under = typical && typical > laptop.price ? typical - Math.round(laptop.price) : 0;
  // The store's own "regular price" is only shown when it is believable
  const d = laptop.discount_pct ?? 0;
  const showWas = d >= 5 && d <= 45 && laptop.retail_price > laptop.price;

  const specLine = [
    parsed.cpu?.label,
    parsed.ramGb ? `${parsed.ramGb}GB RAM` : null,
    parsed.storageGb ? formatStorage(parsed.storageGb) : null,
    parsed.gpu.tier > 0 ? parsed.gpu.label : null,
  ]
    .filter(Boolean)
    .join(" \u00b7 ");

  const reasons: string[] = [];
  if (typical) reasons.push(`${below}% below the usual ${fmt(typical)} for a laptop with these specs`);
  if (laptop.lowestEver) reasons.push("Lowest price we have tracked for it");
  if (parsed.cpu) reasons.push(`Current-generation processor (${parsed.cpu.year})`);

  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--card-radius, 16px)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{blurb}</div>
      </div>

      <Link
        href={`/laptop/${laptop.id}`}
        style={{
          background: "var(--surface-2)",
          borderRadius: 12,
          height: 170,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          textDecoration: "none",
        }}
      >
        {laptop.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={laptop.image_url}
            alt={`${laptop.brand} ${laptop.model}`}
            loading="lazy"
            decoding="async"
            style={{ maxWidth: "88%", maxHeight: "88%", objectFit: "contain" }}
          />
        ) : (
          <span style={{ fontSize: 44, opacity: 0.15 }}>{"\u25AD"}</span>
        )}
      </Link>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {laptop.brand}
        </div>
        <Link
          href={`/laptop/${laptop.id}`}
          style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", textDecoration: "none", lineHeight: 1.3, display: "block" }}
        >
          {laptop.model}
        </Link>
        {specLine && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>{specLine}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>{fmt(laptop.price)}</span>
        {showWas && (
          <span style={{ fontSize: 13, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(laptop.retail_price)}</span>
        )}
        {below > 0 && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#1f9d55",
              background: "rgba(31,157,85,0.12)",
              borderRadius: 999,
              padding: "3px 9px",
            }}
          >
            {below}% under usual
          </span>
        )}
      </div>
      {under > 0 && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>{fmt(under)} less than these specs normally cost</div>}

      {reasons.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {reasons.map((r) => (
            <li key={r} style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 6, lineHeight: 1.4 }}>
              <span style={{ color: "#1f9d55", fontWeight: 800 }}>{"\u2713"}</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Link
          href={`/laptop/${laptop.id}`}
          style={{
            flex: 1,
            textAlign: "center",
            background: "var(--surface-2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "var(--btn-radius, 10px)",
            padding: "10px 12px",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Price history
        </Link>
        <a
          href={laptop.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          style={{
            flex: 1,
            textAlign: "center",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--btn-radius, 10px)",
            padding: "10px 12px",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          View at {laptop.store || "store"}
        </a>
      </div>
    </article>
  );
}

export default async function TodaysPicksPage() {
  const now = new Date();
  const dateKey = now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  const prettyDate = now.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Toronto",
  });

  let picks: Awaited<ReturnType<typeof loadPicks>>["picks"] = [];
  let failed = false;
  try {
    picks = (await loadPicks(dateKey)).picks;
  } catch {
    failed = true;
  }

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="todays-picks" />
      <main style={{ flex: 1, maxWidth: 1180, margin: "0 auto", padding: "32px 20px 80px", minWidth: 0 }}>
        <header style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            {prettyDate}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", marginBottom: 8 }}>
            Today&apos;s Picks
          </h1>
          <p style={{ fontSize: 14.5, color: "var(--text-muted)", maxWidth: 680, lineHeight: 1.6 }}>
            Fresh every day. A pick only qualifies if it has a modern processor and is priced clearly below what a laptop with
            the same specs normally costs. We don&apos;t trust a store&apos;s &ldquo;regular price&rdquo;, so a fake markdown on an old
            laptop can&apos;t sneak in.
          </p>
        </header>

        {failed || picks.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--card-radius, 16px)",
              padding: "40px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No laptop is a clear bargain right now, and we&apos;d rather show nothing than a bad deal. Check back tomorrow, or{" "}
            <Link href="/tracker" style={{ color: "var(--accent)", fontWeight: 700 }}>
              browse every laptop
            </Link>
            .
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 18 }}>
            {picks.map(({ slot, laptop }) => (
              <PickCard key={slot.key} label={slot.label} blurb={slot.blurb} laptop={laptop} />
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 28, lineHeight: 1.6 }}>
          Picks change every day at midnight (Toronto time). &ldquo;Usual price&rdquo; is an estimate from the laptops we track, so
          treat it as a guide. Prices are checked daily and can change at any time, so always confirm the price at the store before
          you buy.
        </p>
      </main>
    </div>
  );
}
