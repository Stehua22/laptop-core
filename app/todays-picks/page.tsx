import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import type { Laptop } from "@/lib/supabase";
import { SLOTS, choosePicks, type SlotKey } from "@/lib/todaysPicks";

// The page is rebuilt every 30 minutes, so the picks switch over shortly after midnight (Toronto time)
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Today's Picks | Best Canadian Laptop Deals Today | LaptopCore",
  description:
    "Fresh every day: the best laptop deals in Canada, picked from thousands of laptops we track. Gaming, work, budget and more.",
};

type PickLaptop = Laptop & { discount_pct?: number | null };

const COLUMNS =
  "id, brand, model, specs, store, url, image_url, retail_price, current_price, discount_pct, screen_size, weight_kg, good_for";

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// The 12 best-discounted laptops that fit a slot; the date then decides which of them is today's pick
async function candidates(slot: SlotKey, requireDiscount: boolean): Promise<PickLaptop[]> {
  let q = supabase.from("laptops").select(COLUMNS).gt("current_price", 0);
  if (requireDiscount) q = q.gt("discount_pct", 0);

  switch (slot) {
    case "deal":
      q = q.gte("current_price", 600);
      break;
    case "gaming":
      q = q.ilike("good_for", "%gaming%").gte("current_price", 700);
      break;
    case "budget":
      q = q.gte("current_price", 450).lte("current_price", 900);
      break;
    case "work":
      q = q.ilike("good_for", "%business%").gte("current_price", 600);
      break;
    case "bigscreen":
      q = q.gte("screen_size", 15.6).gte("current_price", 600);
      break;
    case "premium":
      q = q.gte("current_price", 1800);
      break;
  }

  const { data, error } = await q
    .order("discount_pct", { ascending: false })
    .order("id", { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data ?? []) as unknown as PickLaptop[];
}

function PickCard({ label, blurb, laptop }: { label: string; blurb: string; laptop: PickLaptop }) {
  const price = laptop.current_price ?? laptop.retail_price;
  const was = laptop.retail_price;
  const savings = was > price ? Math.round(was - price) : 0;
  const percent = laptop.discount_pct && laptop.discount_pct > 0 ? Math.round(laptop.discount_pct) : 0;
  const specLine = (laptop.specs ?? "").split(" / ").slice(0, 4).join(" \u00b7 ");

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
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>{fmt(price)}</span>
        {savings > 0 && (
          <span style={{ fontSize: 13, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(was)}</span>
        )}
        {percent > 0 && (
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
            {percent}% off
          </span>
        )}
      </div>
      {savings > 0 && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>You save {fmt(savings)}</div>}

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

  let picks: { slot: (typeof SLOTS)[number]; laptop: PickLaptop }[] = [];
  let failed = false;

  try {
    const keys = SLOTS.map((s) => s.key);
    let pools = await Promise.all(keys.map((k) => candidates(k, true)));
    // If nothing is discounted right now, still show the best-priced options instead of an empty page
    if (pools.every((p) => p.length === 0)) pools = await Promise.all(keys.map((k) => candidates(k, false)));
    const byKey = Object.fromEntries(keys.map((k, i) => [k, pools[i]])) as Record<SlotKey, PickLaptop[]>;
    picks = choosePicks(byKey, dateKey);
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
          <p style={{ fontSize: 14.5, color: "var(--text-muted)", maxWidth: 620, lineHeight: 1.6 }}>
            Fresh every day. We look through every laptop we track and pull out the best deals for how you actually use a laptop.
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
            Today&apos;s picks aren&apos;t ready yet. Check back in a few minutes, or{" "}
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
          Picks change every day at midnight (Toronto time). Prices are checked daily and can change at any time, so
          always confirm the price at the store before you buy.
        </p>
      </main>
    </div>
  );
}
