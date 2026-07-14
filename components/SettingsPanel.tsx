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

type Props = {
  onClose: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
  accent: string;
  onAccentChange: (accent: string) => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
};

export default function SettingsPanel({
  onClose, isDark, onThemeToggle, accent, onAccentChange, fontScale, onFontScaleChange,
}: Props) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 420, margin: "1rem", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3))" }} />

        <div style={{ padding: "22px 24px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Preferences</p>
            <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Settings</h2>
          </div>
          <button onClick={onClose} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: "22px 24px 26px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Appearance mode */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Appearance</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { if (isDark) onThemeToggle(); }}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
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
                  padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
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
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Theme Color</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8 }}>
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => onAccentChange(a.key)}
                  title={a.label}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "10px 6px", borderRadius: 10, cursor: "pointer",
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

          {/* Font size */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Font Size</p>
            <div style={{ display: "flex", gap: 8 }}>
              {FONT_SCALES.map((f) => (
                <button
                  key={f.key}
                  onClick={() => onFontScaleChange(f.key)}
                  style={{
                    flex: 1, padding: "9px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
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
