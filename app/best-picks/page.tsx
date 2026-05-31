"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchLaptops } from "@/lib/supabase";
import type { Laptop } from "@/lib/supabase";

// ── Quiz data ──────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "budget",
    question: "How much do you want to spend?",
    options: [
      { label: "Budget", sub: "Under $800", icon: "$", value: "budget" },
      { label: "Value", sub: "$800 - $1,200", icon: "$$", value: "value" },
      { label: "Premium", sub: "$1,200 - $1,700", icon: "$$$", value: "premium" },
      { label: "Unlimited", sub: "$1,700+", icon: "$$$$", value: "unlimited" },
    ],
  },
  {
    id: "usecase",
    question: "How do you intend to use your laptop?",
    options: [
      { label: "Basic Use", icon: "🖥️", value: "basic" },
      { label: "School", icon: "📚", value: "school" },
      { label: "Gaming", icon: "🎮", value: "gaming" },
      { label: "Programming", icon: "💻", value: "programming" },
      { label: "Engineering", icon: "⚙️", value: "engineering" },
      { label: "Video Editing", icon: "🎬", value: "video" },
      { label: "Trading & Investing", icon: "📈", value: "trading" },
      { label: "Data Science", icon: "🔬", value: "data" },
      { label: "Corporate Buyers", icon: "💼", value: "corporate" },
    ],
  },
  {
    id: "portability",
    question: "How portable do you need it to be?",
    options: [
      { label: "Light & Portable", icon: "🪶", value: "light" },
      { label: "Somewhat Portable", icon: "🎒", value: "medium" },
      { label: "Performance matters more", icon: "⚡", value: "performance" },
    ],
  },
];

// ── Scoring logic ──────────────────────────────────────────────────────────────

const BUDGET_RANGES: Record<string, [number, number]> = {
  budget: [0, 800],
  value: [800, 1200],
  premium: [1200, 1700],
  unlimited: [1700, Infinity],
};

// Tags/keywords that roughly match use cases — adapt to your actual data
const USECASE_KEYWORDS: Record<string, string[]> = {
  basic: ["everyday", "basic", "home"],
  school: ["student", "school", "university", "education"],
  gaming: ["gaming", "game", "rtx", "rx"],
  programming: ["developer", "programming", "coding"],
  engineering: ["engineering", "cad", "workstation"],
  video: ["video", "editing", "creator", "content"],
  trading: ["trading", "finance", "business"],
  data: ["data", "science", "ml", "ai"],
  corporate: ["business", "corporate", "enterprise", "thinkpad"],
};

const PORTABILITY_WEIGHT: Record<string, string[]> = {
  light: ["thin", "light", "portable", "ultrabook", "air"],
  medium: [],
  performance: ["pro", "gaming", "workstation", "studio"],
};

function scoreLaptop(
  laptop: Laptop,
  budget: string,
  usecase: string,
  portability: string
): number {
  let score = 0;
  const price = laptop.current_price ?? laptop.retail_price ?? 0;
  const [min, max] = BUDGET_RANGES[budget] ?? [0, Infinity];
  const searchText = `${laptop.model} ${laptop.brand} ${(laptop as any).specs ?? ""}`.toLowerCase();

  // Budget match (hard filter — skip if outside range)
  if (price < min || price > max) return -1;
  score += 10;

  // Use case keywords
  const usecaseWords = USECASE_KEYWORDS[usecase] ?? [];
  for (const kw of usecaseWords) {
    if (searchText.includes(kw)) score += 5;
  }

  // Portability keywords
  const portWords = PORTABILITY_WEIGHT[portability] ?? [];
  for (const kw of portWords) {
    if (searchText.includes(kw)) score += 3;
  }

  // Prefer discounted laptops
  if (laptop.retail_price && laptop.current_price && laptop.current_price < laptop.retail_price) {
    score += 2;
  }

  return score;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BestPicksPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [results, setResults] = useState<Laptop[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Dark mode — read from html[data-theme]
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.getAttribute("data-theme") !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Fetch laptops once
  useEffect(() => {
    fetchLaptops().then(setLaptops).catch(console.error);
  }, []);

  const bg = isDark ? "#080b12" : "#f4f6ff";
  const surface = isDark ? "#0f1220" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.09)";
  const borderHover = isDark ? "rgba(139,179,245,0.5)" : "rgba(94,143,232,0.6)";
  const text = isDark ? "#eef2ff" : "#18202e";
  const textMuted = isDark ? "#6e7a96" : "#52608a";
  const accent = isDark ? "#8bb3f5" : "#5e8fe8";
  const accent3 = isDark ? "#6af7b8" : "#1fb874";
  const accent2 = isDark ? "#f7c26a" : "#d9930e";

  const currentStep = STEPS[step];
  const progress = ((step) / STEPS.length) * 100;

  function handleSelect(value: string) {
    setSelected(value);
  }

  function handleNext() {
    if (!selected) return;
    const newAnswers = { ...answers, [currentStep.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Score and show results
      setLoading(true);
      const { budget, usecase, portability } = {
        budget: newAnswers.budget ?? "value",
        usecase: newAnswers.usecase ?? "basic",
        portability: newAnswers.portability ?? "medium",
      };
      const scored = laptops
        .map((l) => ({ laptop: l, score: scoreLaptop(l, budget, usecase, portability) }))
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((x) => x.laptop);

      // If nothing matched budget, just show top 6 by price proximity
      if (scored.length === 0) {
        const [min, max] = BUDGET_RANGES[budget];
        const mid = (min + (max === Infinity ? min + 1000 : max)) / 2;
        const fallback = [...laptops]
          .sort((a, b) => {
            const pa = a.current_price ?? 0;
            const pb = b.current_price ?? 0;
            return Math.abs(pa - mid) - Math.abs(pb - mid);
          })
          .slice(0, 6);
        setResults(fallback);
      } else {
        setResults(scored);
      }
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === 0) { router.back(); return; }
    setStep(step - 1);
    setSelected(answers[STEPS[step - 1].id] ?? null);
    const prev = { ...answers };
    delete prev[currentStep.id];
    setAnswers(prev);
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setSelected(null);
    setResults(null);
  }

  const fmtPrice = (price: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(price);

  // ── Results screen ────────────────────────────────────────────────────────────
  if (results !== null) {
    return (
      <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "Inter, sans-serif", transition: "background 0.3s" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 32px" }}>
          <button onClick={() => router.push("/")}
            style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: textMuted, fontSize: 13, padding: "8px 16px", cursor: "pointer", marginBottom: 48 }}>
            ← Home
          </button>
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 11, color: accent, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600, marginBottom: 12 }}>Your results</p>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 10, color: text }}>
              {results.length > 0 ? "Here are your best matches 🎯" : "No exact matches found"}
            </h1>
            <p style={{ color: textMuted, fontSize: 14 }}>
              Based on your budget, use case, and portability preference.
            </p>
          </div>

          {results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ color: textMuted, marginBottom: 24 }}>Try adjusting your budget or use case.</p>
              <button onClick={restart}
                style={{ background: accent, color: isDark ? "#080b12" : "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Start Over
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 40 }}>
                {results.map((l) => {
                  const hasDiscount = l.retail_price && l.current_price && l.current_price < l.retail_price;
                  const discount = hasDiscount
                    ? Math.round((1 - (l.current_price! / l.retail_price!)) * 100)
                    : null;
                  return (
                    <div key={l.id}
                      style={{ background: surface, border: `1px solid ${border}`, borderRadius: 18, overflow: "hidden", transition: "all 0.25s", cursor: "pointer" }}
                      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = borderHover; el.style.transform = "translateY(-4px)"; el.style.boxShadow = isDark ? "0 16px 40px rgba(0,0,0,0.35)" : "0 16px 40px rgba(0,0,0,0.1)"; }}
                      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = border; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}
                      onClick={() => router.push("/tracker")}
                    >
                      {/* Top accent line */}
                      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent3})` }} />

                      <div style={{ padding: "24px" }}>
                        {/* Brand badge */}
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: isDark ? "rgba(139,179,245,0.1)" : "rgba(94,143,232,0.1)", border: `1px solid ${isDark ? "rgba(139,179,245,0.2)" : "rgba(94,143,232,0.2)"}`, borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: accent, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
                          {l.brand}
                        </div>

                        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, letterSpacing: "-0.02em", color: text, lineHeight: 1.3 }}>{l.model}</h3>
                        <p style={{ fontSize: 11, color: textMuted, marginBottom: 20 }}>{l.brand} · {(l as any).year ?? ""}</p>

                        {/* Price */}
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 24, fontWeight: 800, color: accent3, letterSpacing: "-0.03em" }}>
                            {fmtPrice(l.current_price ?? l.original_price ?? 0)}
                          </span>
                          {hasDiscount && (
                            <>
                              <span style={{ fontSize: 13, color: textMuted, textDecoration: "line-through" }}>{fmtPrice(l.original_price!)}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: accent2, background: isDark ? "rgba(247,194,106,0.12)" : "rgba(217,147,14,0.1)", border: `1px solid ${isDark ? "rgba(247,194,106,0.3)" : "rgba(217,147,14,0.25)"}`, borderRadius: 6, padding: "2px 8px" }}>-{discount}%</span>
                            </>
                          )}
                        </div>

                        {/* Specs */}
                        {(l as any).specs && (
                          <p style={{ fontSize: 12, color: textMuted, marginTop: 14, lineHeight: 1.6, borderLeft: `2px solid ${isDark ? "rgba(139,179,245,0.2)" : "rgba(94,143,232,0.3)"}`, paddingLeft: 10 }}>
                            {(l as any).specs}
                          </p>
                        )}
                      </div>

                      <div style={{ padding: "0 24px 20px", display: "flex", gap: 8 }}>
                        <button onClick={(e) => { e.stopPropagation(); router.push("/tracker"); }}
                          style={{ flex: 1, background: isDark ? "rgba(139,179,245,0.08)" : "rgba(94,143,232,0.08)", border: `1px solid ${isDark ? "rgba(139,179,245,0.2)" : "rgba(94,143,232,0.2)"}`, borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 600, color: accent, cursor: "pointer", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(139,179,245,0.16)" : "rgba(94,143,232,0.16)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? "rgba(139,179,245,0.08)" : "rgba(94,143,232,0.08)"; }}
                        >View Details</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: "center" }}>
                <button onClick={restart}
                  style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 10, color: textMuted, fontSize: 13, padding: "10px 24px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textMuted; }}
                >
                  ↺ Start Over
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────────
  const isBudgetStep = currentStep.id === "budget";
  const isUsecaseStep = currentStep.id === "usecase";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "Inter, sans-serif", transition: "background 0.3s" }}>
      {/* Progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", zIndex: 100 }}>
        <div style={{ height: "100%", width: `${progress + (100 / STEPS.length)}%`, background: `linear-gradient(90deg, ${accent}, ${accent3})`, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "80px 32px 60px", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Step counter */}
        <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600, marginBottom: 16, textAlign: "center" }}>
          Step {step + 1} of {STEPS.length}
        </p>

        {/* Question */}
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 40, textAlign: "center", color: text }}>
          {currentStep.question}
        </h1>

        {/* Options */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isBudgetStep
            ? "repeat(4, 1fr)"
            : isUsecaseStep
              ? "repeat(3, 1fr)"
              : "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 40,
        }}>
          {currentStep.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                style={{
                  background: isSelected
                    ? isDark ? "rgba(139,179,245,0.12)" : "rgba(94,143,232,0.1)"
                    : surface,
                  border: `1.5px solid ${isSelected ? accent : border}`,
                  borderRadius: 16,
                  padding: isBudgetStep ? "28px 16px" : isUsecaseStep ? "32px 16px" : "36px 20px",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.18s",
                  boxShadow: isSelected ? `0 0 0 1px ${accent}40, 0 8px 24px ${accent}20` : "none",
                  color: text,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = borderHover;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = border;
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                <div style={{ fontSize: isBudgetStep ? 22 : 28, marginBottom: 12, fontWeight: isBudgetStep ? 800 : 400, color: isSelected ? accent : textMuted }}>
                  {opt.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: (opt as any).sub ? 4 : 0, color: isSelected ? accent : text }}>
                  {opt.label}
                </div>
                {(opt as any).sub && (
                  <div style={{ fontSize: 12, color: isSelected ? accent : textMuted, opacity: 0.8 }}>{(opt as any).sub}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={handleBack}
            style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 12, color: textMuted, fontSize: 14, fontWeight: 600, padding: "14px 32px", cursor: "pointer", minWidth: 120, transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textMuted; }}
          >
            {step === 0 ? "← Home" : "Back"}
          </button>
          <button onClick={handleNext} disabled={!selected}
            style={{ background: selected ? accent : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", border: "none", borderRadius: 12, color: selected ? (isDark ? "#080b12" : "#fff") : textMuted, fontSize: 14, fontWeight: 700, padding: "14px 48px", cursor: selected ? "pointer" : "not-allowed", minWidth: 160, transition: "all 0.2s", boxShadow: selected ? `0 4px 20px ${accent}40` : "none" }}
          >
            {step === STEPS.length - 1 ? (loading ? "Finding..." : "See My Picks →") : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
