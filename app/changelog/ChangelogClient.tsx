"use client";

type EntryType = "feature" | "fix" | "improvement";

type Entry = {
  date: string;
  items: { type: EntryType; text: string }[];
};

// Add a new entry (or append to today's) each time something ships.
// Newest first.
const CHANGELOG: Entry[] = [
  {
    date: "2026-08-23",
    items: [
      { type: "improvement", text: "Sidebar now collapses into a slide-in mobile drawer below 860px instead of squeezing the page" },
      { type: "improvement", text: "Top nav wraps properly on narrow screens, logo sized up, added a real favicon" },
      { type: "fix", text: "Laptop detail page hero no longer breaks on phone-width screens" },
      { type: "feature", text: "Added sitemap.xml, robots.txt, and unique SEO titles/descriptions for every laptop page" },
      { type: "feature", text: "Route loading bar and a back-to-top button, site-wide" },
      { type: "feature", text: "Press \"/\" to jump into search on the tracker page" },
      { type: "feature", text: "Copy-link button on laptop pages for sharing a specific listing" },
      { type: "fix", text: "Deal Scanner was hardcoded to light-mode colors — now respects dark mode and the rest of the theme system" },
      { type: "fix", text: "Compare bar and compare modal were being hidden by the page layout — now render reliably" },
      { type: "improvement", text: "Compare modal: differences-only toggle, sticky laptop header row, animated value-score bars" },
      { type: "feature", text: "Best Picks results now show each laptop's photo" },
      { type: "improvement", text: "Visual refresh across the homepage, tracker, premium, articles, best picks, and laptop detail pages" },
    ],
  },
];

const TYPE_STYLE: Record<EntryType, { label: string; color: string }> = {
  feature: { label: "New", color: "var(--accent)" },
  fix: { label: "Fix", color: "#f76a6a" },
  improvement: { label: "Improved", color: "var(--accent-3)" },
};

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ChangelogClient() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes lc-cl-orb { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(26px,-20px) scale(1.1); } }
        @keyframes lc-cl-sheen { 0% { background-position: -120% 0; } 100% { background-position: 220% 0; } }
        @keyframes lc-cl-fade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .lc-cl-orb { position: absolute; top: -140px; left: -100px; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, var(--accent) 0%, transparent 70%); opacity: 0.13; filter: blur(50px); pointer-events: none; animation: lc-cl-orb 11s ease-in-out infinite; z-index: 0; }
        .lc-cl-title { background: linear-gradient(100deg, var(--text) 30%, var(--accent) 45%, var(--text) 60%); background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: lc-cl-sheen 7s linear infinite; }
        .lc-cl-fadein { animation: lc-cl-fade 0.5s ease both; }
        .lc-cl-item:hover { border-color: var(--border-hover, var(--accent)) !important; transform: translateX(3px); }
      `}} />
      <div className="lc-cl-orb" />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 20px 80px", position: "relative", zIndex: 1 }}>
        <div className="lc-cl-fadein" style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: "var(--accent)", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--accent-3)" }} />
            Changelog
          </div>
          <h1 className="lc-cl-title" style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
            What&apos;s new
          </h1>
          <p style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 13.5 }}>
            Fixes, features, and polish — updated as things ship.
          </p>
        </div>

        {CHANGELOG.map((entry, i) => (
          <div key={entry.date} className="lc-cl-fadein" style={{ animationDelay: `${0.05 + i * 0.05}s`, marginBottom: 40, display: "flex", gap: 24 }}>
            <div style={{ flexShrink: 0, width: 130, paddingTop: 4 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)" }}>{formatDate(entry.date)}</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, borderLeft: "1px solid var(--border)", paddingLeft: 20 }}>
              {entry.items.map((item, j) => {
                const style = TYPE_STYLE[item.type];
                return (
                  <div
                    key={j}
                    className="lc-cl-item"
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
                      padding: "10px 14px", transition: "transform 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    <span style={{
                      flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase",
                      color: style.color, background: `${style.color}18`, border: `1px solid ${style.color}40`,
                      borderRadius: 5, padding: "2px 7px", marginTop: 1,
                    }}>
                      {style.label}
                    </span>
                    <span style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.5 }}>{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}