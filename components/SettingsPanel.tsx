"use client";

const ACCENTS: { key: string; label: string; swatch: string }[] = [
  { key: "default", label: "Default", swatch: "#5e8fe8" },
  { key: "sunset", label: "Sunset", swatch: "#f2854c" },
  { key: "forest", label: "Forest", swatch: "#4caf7d" },
  { key: "grape", label: "Grape", swatch: "#a374e0" },
  { key: "mono", label: "Mono", swatch: "#9aa3b2" },
  { key: "rose", label: "Rose", swatch: "#ec6f9b" },
  { key: "amber", label: "Amber", swatch: "#e0a530" },
  { key: "teal", label: "Teal", swatch: "#35b8b0" },
  { key: "indigo", label: "Indigo", swatch: "#6c7ae0" },
  { key: "crimson", label: "Crimson", swatch: "#e0524f" },
];

const FONT_SCALES: { key: number; label: string }[] = [
  { key: 0.9, label: "Small" },
  { key: 1, label: "Default" },
  { key: 1.1, label: "Large" },
  { key: 1.25, label: "X-Large" },
];

const UI_THEMES: { key: string; label: string; icon: string; desc: string }[] = [
  { key: "default", label: "Default", icon: "◉", desc: "Balanced" },
  { key: "glass", label: "Glass", icon: "◇", desc: "Frosted blur" },
  { key: "neon", label: "Neon", icon: "⚡", desc: "Glowing edges" },
  { key: "minimal", label: "Minimal", icon: "○", desc: "Clean & flat" },
  { key: "brutalist", label: "Brutalist", icon: "■", desc: "Bold & raw" },
];

const CARD_LAYOUTS: { key: "row" | "grid" | "compact"; label: string; icon: string }[] = [
  { key: "row", label: "Row", icon: "☰" },
  { key: "grid", label: "Grid", icon: "⊞" },
  { key: "compact", label: "Compact", icon: "≡" },
];

const BG_EFFECTS: { key: string; label: string; icon: string }[] = [
  { key: "grid", label: "Grid", icon: "▦" },
  { key: "gradient", label: "Gradient", icon: "◐" },
  { key: "particles", label: "Particles", icon: "✦" },
  { key: "none", label: "None", icon: "∅" },
];

type Props = {
  onClose: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
  accent: string;
  onAccentChange: (accent: string) => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  uiTheme: string;
  onUiThemeChange: (theme: string) => void;
  cardLayout: "row" | "grid" | "compact";
  onCardLayoutChange: (layout: "row" | "grid" | "compact") => void;
  bgEffect: string;
  onBgEffectChange: (effect: string) => void;
};

export default function SettingsPanel({
  onClose, isDark, onThemeToggle, accent, onAccentChange, fontScale, onFontScaleChange,
  uiTheme, onUiThemeChange, cardLayout, onCardLayoutChange, bgEffect, onBgEffectChange,
}: Props) {

  /* Shared style helpers */
  const pillBtn = (isActive: boolean) => ({
    flex: 1 as const,
    display: "flex" as const,
    flexDirection: "column" as const,
    alignItems: "center" as const,
    gap: 4,
    padding: "10px 6px",
    borderRadius: "var(--btn-radius, 10px)",
    fontSize: 11,
    fontWeight: 600 as const,
    cursor: "pointer" as const,
    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
    background: isActive ? "rgba(139,179,245,0.1)" : "var(--surface-2)",
    color: isActive ? "var(--accent)" : "var(--text-muted)",
    transition: "all 0.15s",
    minWidth: 0,
  });

  const sectionTitle = {
    fontSize: 11,
    fontWeight: 700 as const,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    marginBottom: 10,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--modal-radius, 18px)", width: "100%", maxWidth: 460, margin: "1rem", boxShadow: "var(--shadow-lg)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3))" }} />

        <div style={{ padding: "22px 24px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Preferences</p>
            <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Settings</h2>
          </div>
          <button onClick={onClose} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: "22px 24px 26px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto", flex: 1 }}>

          {/* Appearance mode */}
          <div>
            <p style={sectionTitle}>Appearance</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { if (isDark) onThemeToggle(); }}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 12px", borderRadius: "var(--btn-radius, 10px)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${!isDark ? "var(--accent)" : "var(--border)"}`,
                  background: !isDark ? "rgba(139,179,245,0.1)" : "var(--surface-2)",
                  color: !isDark ? "var(--accent)" : "var(--text-muted)",
                  transition: "all 0.15s",
                }}
              >☀️ Light</button>
              <button
                onClick={() => { if (!isDark) onThemeToggle(); }}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 12px", borderRadius: "var(--btn-radius, 10px)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${isDark ? "var(--accent)" : "var(--border)"}`,
                  background: isDark ? "rgba(139,179,245,0.1)" : "var(--surface-2)",
                  color: isDark ? "var(--accent)" : "var(--text-muted)",
                  transition: "all 0.15s",
                }}
              >🌙 Dark</button>
            </div>
          </div>

          {/* Accent theme */}
          <div>
            <p style={sectionTitle}>Theme Color</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8 }}>
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => onAccentChange(a.key)}
                  title={a.label}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "10px 6px", borderRadius: "var(--btn-radius, 10px)", cursor: "pointer",
                    border: `1px solid ${accent === a.key ? a.swatch : "var(--border)"}`,
                    background: accent === a.key ? `${a.swatch}18` : "var(--surface-2)",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: a.swatch, boxShadow: accent === a.key ? `0 0 0 3px ${a.swatch}30` : "none", transition: "box-shadow 0.15s" }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: accent === a.key ? "var(--text)" : "var(--text-muted)" }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* UI Theme */}
          <div>
            <p style={sectionTitle}>UI Theme</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
              {UI_THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => onUiThemeChange(t.key)}
                  title={t.desc}
                  style={{
                    ...pillBtn(uiTheme === t.key),
                    padding: "12px 6px",
                    gap: 5,
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{t.label}</span>
                  <span style={{ fontSize: 9, opacity: 0.6 }}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card Layout */}
          <div>
            <p style={sectionTitle}>Card Layout</p>
            <div style={{ display: "flex", gap: 8 }}>
              {CARD_LAYOUTS.map((cl) => (
                <button
                  key={cl.key}
                  onClick={() => onCardLayoutChange(cl.key)}
                  style={pillBtn(cardLayout === cl.key)}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{cl.icon}</span>
                  <span>{cl.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Effect */}
          <div>
            <p style={sectionTitle}>Background</p>
            <div style={{ display: "flex", gap: 8 }}>
              {BG_EFFECTS.map((bg) => (
                <button
                  key={bg.key}
                  onClick={() => onBgEffectChange(bg.key)}
                  style={pillBtn(bgEffect === bg.key)}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{bg.icon}</span>
                  <span>{bg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div>
            <p style={sectionTitle}>Font Size</p>
            <div style={{ display: "flex", gap: 8 }}>
              {FONT_SCALES.map((f) => (
                <button
                  key={f.key}
                  onClick={() => onFontScaleChange(f.key)}
                  style={{
                    flex: 1, padding: "9px 8px", borderRadius: "var(--btn-radius, 10px)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${fontScale === f.key ? "var(--accent)" : "var(--border)"}`,
                    background: fontScale === f.key ? "rgba(139,179,245,0.1)" : "var(--surface-2)",
                    color: fontScale === f.key ? "var(--accent)" : "var(--text-muted)",
                    transition: "all 0.15s",
                  }}
                >{f.label}</button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>Changes the overall page zoom level.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
