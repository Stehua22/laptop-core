"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

type Article = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  author: string;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
};

const CATEGORIES = ["Guide", "Review", "News", "Comparison", "Tips", "Opinion"];

const STORAGE_KEY = "lc-articles";

function loadArticles(): Article[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveArticles(articles: Article[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const CATEGORY_COLORS: Record<string, string> = {
  Guide: "#5e8fe8",
  Review: "#4caf7d",
  News: "#f2854c",
  Comparison: "#a374e0",
  Tips: "#e0a530",
  Opinion: "#ec6f9b",
};

function renderArticleContent(content: string) {
  const regex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={key++} style={{ whiteSpace: "pre-wrap" }}>
          {content.slice(lastIndex, match.index)}
        </span>
      );
    }
    nodes.push(
      <img
        key={key++}
        src={match[2]}
        alt={match[1] || "article image"}
        style={{ maxWidth: "100%", borderRadius: 12, margin: "14px 0", display: "block" }}
      />
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    nodes.push(
      <span key={key++} style={{ whiteSpace: "pre-wrap" }}>
        {content.slice(lastIndex)}
      </span>
    );
  }
  return nodes;
}

export default function ArticlesPage() {
  const ADMIN_PASSWORD = "admin2026.123";

  const [articles, setArticles] = useState<Article[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [unlocked, setUnlocked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [form, setForm] = useState({ title: "", summary: "", content: "", category: "Guide", author: "", coverImage: "" });

  useEffect(() => {
    setArticles(loadArticles());
  }, []);

  const filtered = articles
    .filter((a) => !categoryFilter || a.category === categoryFilter)
    .filter((a) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const now = new Date().toISOString();
    let updated: Article[];
    if (editingId) {
      updated = articles.map((a) => (a.id === editingId ? { ...a, ...form, updatedAt: now } : a));
    } else {
      const newArticle: Article = { id: crypto.randomUUID(), ...form, createdAt: now, updatedAt: now };
      updated = [newArticle, ...articles];
    }
    setArticles(updated);
    saveArticles(updated);
    resetForm();
  };

  const requireAuth = (action: () => void) => {
    if (unlocked) { action(); return; }
    setPendingAction(() => action);
    setAuthInput(""); setAuthError("");
    setShowAuth(true);
  };

  const submitAuth = () => {
    if (authInput === ADMIN_PASSWORD) {
      setUnlocked(true); setShowAuth(false);
      if (pendingAction) { pendingAction(); setPendingAction(null); }
    } else {
      setAuthError("Incorrect password.");
    }
  };

  const handleEdit = (article: Article) => {
    setForm({
      title: article.title,
      summary: article.summary,
      content: article.content,
      category: article.category,
      author: article.author,
      coverImage: article.coverImage || "",
    });
    setEditingId(article.id);
    setShowEditor(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this article?")) return;
    const updated = articles.filter((a) => a.id !== id);
    setArticles(updated);
    saveArticles(updated);
    if (expandedId === id) setExpandedId(null);
  };

  const resetForm = () => {
    setForm({ title: "", summary: "", content: "", category: "Guide", author: "", coverImage: "" });
    setEditingId(null);
    setShowEditor(false);
  };

  const insertInlineImage = () => {
    const url = window.prompt("Image URL:");
    if (!url) return;
    const alt = window.prompt("Alt text (optional):") || "image";
    setForm((f) => ({ ...f, content: f.content + (f.content.endsWith("\n") || !f.content ? "" : "\n") + `![${alt}](${url})\n` }));
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 13,
    border: "1px solid var(--border)",
    borderRadius: "var(--btn-radius, 10px)",
    background: "var(--surface-2)",
    color: "var(--text)",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="articles" />
      <div style={{ flex: 1, maxWidth: 1000, margin: "0 auto", padding: "32px 20px" }}>

        <div className="animate-fade-up" style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600, opacity: 0.8 }}>
            // knowledge base
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--text)", margin: 0 }}>
                Articles<span style={{ color: "var(--accent)", opacity: 0.9 }}>.</span>
              </h1>
              <p style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 13 }}>
                Guides, reviews, and insights · {articles.length} article{articles.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => requireAuth(() => { resetForm(); setShowEditor(true); })}
              style={{
                background: "var(--accent)", color: "#fff", border: "none",
                borderRadius: "var(--btn-radius, 10px)", padding: "11px 22px",
                fontWeight: 700, cursor: "pointer", fontSize: 14,
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 4px 16px var(--glow)",
              }}
            >
              {unlocked ? "+ New Article" : "🔒 New Article"}
            </button>
          </div>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "0.05s", display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, maxWidth: 260, flex: 1 }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setCategoryFilter("")}
              style={{
                padding: "8px 14px", borderRadius: "var(--btn-radius, 10px)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${!categoryFilter ? "var(--accent)" : "var(--border)"}`,
                background: !categoryFilter ? "rgba(139,179,245,0.1)" : "var(--surface-2)",
                color: !categoryFilter ? "var(--accent)" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >All</button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: "8px 14px", borderRadius: "var(--btn-radius, 10px)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${categoryFilter === cat ? (CATEGORY_COLORS[cat] || "var(--accent)") : "var(--border)"}`,
                  background: categoryFilter === cat ? `${CATEGORY_COLORS[cat] || "var(--accent)"}18` : "var(--surface-2)",
                  color: categoryFilter === cat ? (CATEGORY_COLORS[cat] || "var(--accent)") : "var(--text-muted)",
                  transition: "all 0.15s",
                }}
              >{cat}</button>
            ))}
          </div>
        </div>

        {showEditor && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
          >
            <div className="modal-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--modal-radius, 18px)", width: "100%", maxWidth: 560, margin: "1rem", boxShadow: "var(--shadow-lg)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
              <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3))" }} />
              <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
                    {editingId ? "Edit" : "New"}
                  </p>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                    {editingId ? "Edit Article" : "Write Article"}
                  </h2>
                </div>
                <button onClick={resetForm} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>

              <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
                <input
                  placeholder="Article title..."
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  style={{ ...inputStyle, fontSize: 16, fontWeight: 700 }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    placeholder="Author name (optional)"
                    value={form.author}
                    onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    style={{ ...inputStyle, maxWidth: 140, cursor: "pointer" }}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <input
                  placeholder="Cover image URL (optional)"
                  value={form.coverImage}
                  onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
                  style={inputStyle}
                />
                {form.coverImage && (
                  <img
                    src={form.coverImage}
                    alt="Cover preview"
                    style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <input
                  placeholder="Short summary..."
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  style={inputStyle}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Content</span>
                  <button
                    type="button"
                    onClick={insertInlineImage}
                    style={{
                      fontSize: 11, padding: "5px 12px", borderRadius: "var(--btn-radius, 8px)",
                      border: "1px solid var(--border)", background: "var(--surface-2)",
                      color: "var(--text-muted)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
                    }}
                  >Insert Image</button>
                </div>
                <textarea
                  placeholder="Write your article content here... Use the Insert Image button to add pictures inline."
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={12}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7, marginTop: -6 }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <button
                    onClick={resetForm}
                    style={{ fontSize: 13, padding: "9px 20px", borderRadius: "var(--btn-radius, 10px)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}
                  >Cancel</button>
                  <button
                    onClick={handleSave}
                    disabled={!form.title.trim() || !form.content.trim()}
                    style={{
                      fontSize: 13, padding: "9px 20px", borderRadius: "var(--btn-radius, 10px)",
                      border: "none", background: "var(--accent)", color: "#fff",
                      cursor: form.title.trim() && form.content.trim() ? "pointer" : "not-allowed",
                      fontWeight: 700, fontFamily: "inherit",
                      opacity: form.title.trim() && form.content.trim() ? 1 : 0.5,
                    }}
                  >{editingId ? "Update" : "Publish"}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAuth && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}
          >
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--modal-radius, 18px)", width: "100%", maxWidth: 360, margin: "1rem", boxShadow: "var(--shadow-lg)", padding: "24px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 14px" }}>Admin access required</h2>
              <input
                type="password"
                autoFocus
                placeholder="Password"
                value={authInput}
                onChange={(e) => { setAuthInput(e.target.value); setAuthError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") submitAuth(); }}
                style={inputStyle}
              />
              {authError && <p style={{ color: "#f76a6a", fontSize: 12, marginTop: 8 }}>{authError}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  onClick={() => setShowAuth(false)}
                  style={{ fontSize: 13, padding: "9px 20px", borderRadius: "var(--btn-radius, 10px)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}
                >Cancel</button>
                <button
                  onClick={submitAuth}
                  style={{ fontSize: 13, padding: "9px 20px", borderRadius: "var(--btn-radius, 10px)", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}
                >Unlock</button>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="animate-fade-up" style={{ textAlign: "center", padding: "5rem 1rem" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📝</div>
            <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              {articles.length === 0 ? "No articles yet" : "No matching articles"}
            </p>
            <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
              {articles.length === 0 ? "Click \"+ New Article\" to write your first one." : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((article) => {
              const isExpanded = expandedId === article.id;
              const catColor = CATEGORY_COLORS[article.category] || "var(--accent)";
              return (
                <div
                  key={article.id}
                  className="animate-fade-up"
                  style={{
                    background: "var(--card-bg, var(--surface))",
                    border: `1px solid ${isExpanded ? catColor + "40" : "var(--card-border, var(--border))"}`,
                    borderRadius: "var(--card-radius, 18px)",
                    overflow: "hidden",
                    backdropFilter: `blur(var(--card-blur, 0px))`,
                    boxShadow: isExpanded ? `0 8px 32px ${catColor}15` : "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
                    transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${catColor}, ${catColor}60)`, opacity: isExpanded ? 1 : 0.5, transition: "opacity 0.2s" }} />

                  {isExpanded && article.coverImage && (
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}

                  <div
                    style={{ padding: "18px 22px", cursor: "pointer" }}
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      {!isExpanded && article.coverImage && (
                        <img
                          src={article.coverImage}
                          alt={article.title}
                          style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                            background: `${catColor}18`, color: catColor,
                            padding: "3px 10px", borderRadius: 6,
                          }}>
                            {article.category}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                            {formatDate(article.createdAt)}
                          </span>
                          {article.author && (
                            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                              · {article.author}
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                          {article.title}
                        </h3>
                        {article.summary && !isExpanded && (
                          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                            {article.summary}
                          </p>
                        )}
                      </div>
                      <span style={{
                        fontSize: 16, color: "var(--text-dim)",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                        transition: "transform 0.2s",
                        flexShrink: 0, marginTop: 4,
                      }}>
                        ▾
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0 22px 20px", animation: "fadeUp 0.3s ease both" }}>
                      {article.summary && (
                        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 14, fontStyle: "italic", lineHeight: 1.5, borderLeft: `3px solid ${catColor}40`, paddingLeft: 14 }}>
                          {article.summary}
                        </p>
                      )}
                      <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.8, wordBreak: "break-word" }}>
                        {renderArticleContent(article.content)}
                      </div>

                      {article.updatedAt !== article.createdAt && (
                        <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 16 }}>
                          Updated {formatDate(article.updatedAt)}
                        </p>
                      )}

                      <div style={{ display: "flex", gap: 8, marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); requireAuth(() => handleEdit(article)); }}
                          style={{
                            fontSize: 12, padding: "7px 16px", borderRadius: "var(--btn-radius, 10px)",
                            border: "1px solid var(--border)", background: "var(--surface-2)",
                            color: "var(--text-muted)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
                            transition: "all 0.15s",
                          }}
                        >Edit</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); requireAuth(() => handleDelete(article.id)); }}
                          style={{
                            fontSize: 12, padding: "7px 16px", borderRadius: "var(--btn-radius, 10px)",
                            border: "1px solid rgba(247,106,106,0.2)", background: "rgba(247,106,106,0.06)",
                            color: "#f76a6a", cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
                            transition: "all 0.15s",
                          }}
                        >Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
