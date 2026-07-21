"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import type { Laptop } from "@/lib/supabase";
import { addLaptop, addPriceEntry, deleteLaptop, supabase } from "@/lib/supabase";
import Header from "./Header";
import StatsBar from "./StatsBar";
import Controls from "./Controls";
import LaptopGrid from "./LaptopGrid";
import LaptopModal from "./LaptopModal";
import PriceHistoryModal from "./PriceHistoryModal";
import AddLaptopModal from "./AddLaptopModal";
import Recommendations from "./Recommendations";
import Toast from "./Toast";
import Sidebar from "./Sidebar";
import SettingsPanel from "./SettingsPanel";

type ToastMsg = { id: number; message: string; type: "success" | "error" };

const ADMIN_PASSWORD = "admin2026.123";

const DEFAULT_RECOMMENDATION_IDS: Record<string, number[]> = {
  student:  [59, 65, 58, 62],
  home:     [42, 52, 60, 64],
  business: [61, 57, 63, 60],
};

const PER_PAGE_OPTIONS = [12, 24, 48, 96] as const;

export let CAD_TO_USD = 0.73;

export function formatPrice(price: number, currency: "CAD" | "USD", rate = CAD_TO_USD): string {
  const value = currency === "USD" ? price * rate : price;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export default function TrackerClient({ initialLaptops, dbError }: { initialLaptops: Laptop[]; dbError: string | null }) {
  const [laptops, setLaptops] = useState<Laptop[]>(initialLaptops);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [goodForFilter, setGoodForFilter] = useState("");
  const [screenFilter, setScreenFilter] = useState("");
  const [weightFilter, setWeightFilter] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [recCategory, setRecCategory] = useState("student");
  const [recommendationIds, setRecommendationIds] = useState<Record<string, number[]>>(DEFAULT_RECOMMENDATION_IDS);
  const [selectedLaptop, setSelectedLaptop] = useState<Laptop | null>(null);
  const [historyLaptop, setHistoryLaptop] = useState<Laptop | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [accent, setAccent] = useState("default");
  const [fontScale, setFontScale] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [uiTheme, setUiTheme] = useState("default");
  const [cardLayout, setCardLayout] = useState<"row" | "grid" | "compact">("row");
  const [bgEffect, setBgEffect] = useState("grid");
  const [animSpeed, setAnimSpeed] = useState("normal");
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [cadToUsd, setCadToUsd] = useState(0.73);
  const toggleCurrency = () => setCurrency((c) => (c === "CAD" ? "USD" : "CAD"));

  // Pagination
  const [perPage, setPerPage] = useState<number | "all">(24);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/CAD");
        const data = await res.json();
        const rate = data?.rates?.USD;
        if (rate && typeof rate === "number") { setCadToUsd(rate); CAD_TO_USD = rate; }
      } catch {}
    }
    fetchRate();
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("lc-dark");
    if (savedTheme !== null) setIsDark(savedTheme === "true");
    const savedAccent = window.localStorage.getItem("lc-accent");
    if (savedAccent) setAccent(savedAccent);
    const savedFontScale = window.localStorage.getItem("lc-font-scale");
    if (savedFontScale) setFontScale(parseFloat(savedFontScale));
    const savedUiTheme = window.localStorage.getItem("lc-ui-theme");
    if (savedUiTheme) setUiTheme(savedUiTheme);
    const savedCardLayout = window.localStorage.getItem("lc-card-layout") as "row" | "grid" | "compact" | null;
    if (savedCardLayout) setCardLayout(savedCardLayout);
    const savedBgEffect = window.localStorage.getItem("lc-bg-effect");
    if (savedBgEffect) setBgEffect(savedBgEffect);
    const savedAnimSpeed = window.localStorage.getItem("lc-anim-speed");
    if (savedAnimSpeed) setAnimSpeed(savedAnimSpeed);
    const savedPerPage = window.localStorage.getItem("lc-per-page");
    if (savedPerPage) setPerPage(savedPerPage === "all" ? "all" : parseInt(savedPerPage, 10));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    window.localStorage.setItem("lc-dark", String(isDark));
  }, [isDark]);

  useEffect(() => {
    if (accent === "default") document.documentElement.removeAttribute("data-accent");
    else document.documentElement.setAttribute("data-accent", accent);
    window.localStorage.setItem("lc-accent", accent);
  }, [accent]);

  useEffect(() => {
    document.documentElement.style.setProperty("--app-zoom", String(fontScale));
    window.localStorage.setItem("lc-font-scale", String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    if (uiTheme === "default") document.documentElement.removeAttribute("data-ui-theme");
    else document.documentElement.setAttribute("data-ui-theme", uiTheme);
    window.localStorage.setItem("lc-ui-theme", uiTheme);
  }, [uiTheme]);

  useEffect(() => {
    window.localStorage.setItem("lc-card-layout", cardLayout);
  }, [cardLayout]);

  useEffect(() => {
    if (bgEffect === "grid") document.documentElement.removeAttribute("data-bg-effect");
    else document.documentElement.setAttribute("data-bg-effect", bgEffect);
    window.localStorage.setItem("lc-bg-effect", bgEffect);
  }, [bgEffect]);

  useEffect(() => {
    if (animSpeed === "normal") document.documentElement.removeAttribute("data-anim-speed");
    else document.documentElement.setAttribute("data-anim-speed", animSpeed);
    window.localStorage.setItem("lc-anim-speed", animSpeed);
  }, [animSpeed]);

  useEffect(() => {
    window.localStorage.setItem("lc-per-page", String(perPage));
  }, [perPage]);

  // Reset to page 1 whenever filters, search, sort, or per-page setting change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, brandFilter, sortBy, goodForFilter, screenFilter, weightFilter, priceMin, priceMax, perPage]);

  useEffect(() => {
    async function loadRecs() {
      try {
        const { data } = await supabase.from("recommendations").select("*");
        if (data && data.length > 0) {
          const ids: Record<string, number[]> = {};
          data.forEach((row: { category: string; laptop_ids: number[] }) => { ids[row.category] = row.laptop_ids; });
          setRecommendationIds(ids);
        }
      } catch {}
    }
    loadRecs();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const historyId = params.get("history");
    if (historyId && laptops.length > 0) {
      const found = laptops.find(l => l.id === Number(historyId));
      if (found) setHistoryLaptop(found);
    }
  }, [laptops]);

  const [unlocked, setUnlocked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requireAuth = (action: () => void) => {
    if (unlocked) { action(); return; }
    setPendingAction(() => action);
    setAuthInput(""); setAuthError("");
    setShowAuthModal(true);
  };

  const submitAuth = () => {
    if (authInput === ADMIN_PASSWORD) {
      setUnlocked(true); setShowAuthModal(false);
      if (pendingAction) { pendingAction(); setPendingAction(null); }
    } else {
      setAuthError("Incorrect password. Try again.");
    }
  };

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const brands = useMemo(() => Array.from(new Set(laptops.map((l) => l.brand))).sort(), [laptops]);

  const filtered = useMemo(() => {
    let list = laptops.filter((l) => {
      const term = search.toLowerCase();
      const matchesSearch =
        l.brand.toLowerCase().includes(term) ||
        l.model.toLowerCase().includes(term) ||
        l.specs?.toLowerCase().includes(term);
      const matchesBrand = !brandFilter || l.brand === brandFilter;

      const matchesGoodFor =
        !goodForFilter ||
        (l.good_for ?? "").split(",").map(s => s.trim().toLowerCase()).includes(goodForFilter);

      const sz = l.screen_size ?? null;
      const matchesScreen =
        !screenFilter || (
          screenFilter === "small"  ? sz !== null && sz <= 13 :
          screenFilter === "medium" ? sz !== null && sz > 13 && sz < 15 :
          screenFilter === "large"  ? sz !== null && sz >= 15 && sz < 17 :
          screenFilter === "xlarge" ? sz !== null && sz >= 17 : true
        );

      const wt = l.weight_kg ?? null;
      const matchesWeight =
        !weightFilter || (
          weightFilter === "ultralight" ? wt !== null && wt < 1.2 :
          weightFilter === "light"      ? wt !== null && wt >= 1.2 && wt < 1.6 :
          weightFilter === "medium"     ? wt !== null && wt >= 1.6 && wt < 2.2 :
          weightFilter === "heavy"      ? wt !== null && wt >= 2.2 : true
        );

      const price = l.current_price ?? 0;
      const matchesPrice =
        (!priceMin || price >= parseFloat(priceMin)) &&
        (!priceMax || price <= parseFloat(priceMax));

      return matchesSearch && matchesBrand && matchesGoodFor && matchesScreen && matchesWeight && matchesPrice;
    });

    switch (sortBy) {
      case "priceAsc":  list = [...list].sort((a, b) => (a.current_price ?? 0) - (b.current_price ?? 0)); break;
      case "priceDesc": list = [...list].sort((a, b) => (b.current_price ?? 0) - (a.current_price ?? 0)); break;
      case "newest":    list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
    }
    return list;
  }, [laptops, search, brandFilter, sortBy, goodForFilter, screenFilter, weightFilter, priceMin, priceMax]);

  const totalPages = perPage === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / perPage));

  const paginated = useMemo(() => {
    if (perPage === "all") return filtered;
    const start = (currentPage - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, perPage, currentPage]);

  const recommendations = useMemo(() => {
    const ids = recommendationIds[recCategory] ?? [];
    return ids.map((id) => laptops.find((l) => l.id === id)).filter(Boolean) as Laptop[];
  }, [laptops, recCategory, recommendationIds]);

  const stats = useMemo(() => {
    if (!laptops.length) return { count: 0, avg: 0, min: 0, max: 0 };
    const prices = laptops.map((l) => l.current_price ?? 0);
    return { count: laptops.length, avg: prices.reduce((a, b) => a + b, 0) / prices.length, min: Math.min(...prices), max: Math.max(...prices) };
  }, [laptops]);

  const handleToggleRecommendation = async (category: string, laptopId: number) => {
    const current = recommendationIds[category] ?? [];
    const newIds = current.includes(laptopId) ? current.filter((id) => id !== laptopId) : [...current, laptopId];
    setRecommendationIds((prev) => ({ ...prev, [category]: newIds }));
    try {
      await supabase.from("recommendations").upsert({ category, laptop_ids: newIds }, { onConflict: "category" });
      showToast("✅ Best picks saved!");
    } catch { showToast("❌ Failed to save picks", "error"); }
  };

  const handleAddLaptop = async (data: { brand: string; model: string; specs: string; store: string; url: string; retail_price: number; release_year: number | null; image_url: string }) => {
    setLoading(true);
    try {
      await addLaptop({ ...data, date_added: new Date().toISOString().split("T")[0] }, data.retail_price);
      const { fetchLaptops } = await import("@/lib/supabase");
      setLaptops(await fetchLaptops());
      setShowAddModal(false);
      showToast("✅ Laptop added successfully!");
    } catch { showToast("❌ Failed to add laptop", "error"); }
    finally { setLoading(false); }
  };

  const handleUpdatePrice = async (laptopId: number) => {
    const input = prompt("Enter new price ($):");
    if (!input) return;
    const price = parseFloat(input);
    if (isNaN(price) || price < 0) { showToast("❌ Invalid price", "error"); return; }
    try {
      await addPriceEntry(laptopId, price);
      setLaptops((prev) => prev.map((l) => {
        if (l.id !== laptopId) return l;
        const newEntry = { id: Date.now(), laptop_id: laptopId, price, recorded_at: new Date().toISOString().split("T")[0] };
        return { ...l, price_history: [...(l.price_history ?? []), newEntry], current_price: price };
      }));
      showToast("✅ Price updated!");
    } catch { showToast("❌ Failed to update price", "error"); }
  };

  const handleDeleteLaptop = async (id: number) => {
    if (!confirm("Remove this laptop from tracking?")) return;
    try {
      await deleteLaptop(id);
      setLaptops((prev) => prev.filter((l) => l.id !== id));
      setSelectedLaptop(null);
      showToast("🗑️ Laptop removed");
    } catch { showToast("❌ Failed to delete laptop", "error"); }
  };

  const handleMoveToDeals = async (laptop: Laptop) => {
    if (!confirm(`Move "${laptop.model}" to Crazy Deals?`)) return;
    try {
      await supabase.from("laptops").update({ is_deal: true }).eq("id", laptop.id);
      showToast("🔥 Moved to Crazy Deals!");
    } catch { showToast("❌ Failed to move to deals", "error"); }
  };

  const handleAddClick    = () => requireAuth(() => setShowAddModal(true));
  const handleDeleteClick = (id: number) => requireAuth(() => handleDeleteLaptop(id));

  const handleResetSettings = () => {
    setIsDark(true);
    setAccent("default");
    setFontScale(1);
    setUiTheme("default");
    setCardLayout("row");
    setBgEffect("grid");
    setAnimSpeed("normal");
    setPerPage(24);
    // Clear localStorage so defaults take effect on next load
    window.localStorage.removeItem("lc-dark");
    window.localStorage.removeItem("lc-accent");
    window.localStorage.removeItem("lc-font-scale");
    window.localStorage.removeItem("lc-ui-theme");
    window.localStorage.removeItem("lc-card-layout");
    window.localStorage.removeItem("lc-bg-effect");
    window.localStorage.removeItem("lc-anim-speed");
    window.localStorage.removeItem("lc-per-page");
    showToast("↺ Settings reset to defaults");
  };

  const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
    fontSize: 12, padding: "7px 14px", borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: disabled ? "var(--text-dim)" : "var(--text)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontWeight: 600,
  });

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="home" onSettingsClick={() => setShowSettings(true)} onResetSettings={handleResetSettings} brands={brands} />
      <div style={{ flex: 1, maxWidth: 1300, margin: "0 auto", padding: "32px 20px" }}>
        {dbError && (
          <div style={{ background: "rgba(247,106,106,0.1)", border: "1px solid rgba(247,106,106,0.3)", borderRadius: 12, padding: "14px 20px", marginBottom: 24, color: "#f76a6a", fontSize: 13 }}>
            ⚠ {dbError}
          </div>
        )}
        <Header
          onAdd={handleAddClick} isDark={isDark} onThemeToggle={() => setIsDark(!isDark)}
          onDeals={() => router.push("/deals")}
          currency={currency} onCurrencyToggle={toggleCurrency} cadToUsd={cadToUsd}
        />

        <Controls
          search={search} onSearch={setSearch}
          brands={brands} brandFilter={brandFilter} onBrandFilter={setBrandFilter}
          sortBy={sortBy} onSort={setSortBy}
          goodForFilter={goodForFilter} onGoodForFilter={setGoodForFilter}
          screenFilter={screenFilter} onScreenFilter={setScreenFilter}
          weightFilter={weightFilter} onWeightFilter={setWeightFilter}
          priceMin={priceMin} priceMax={priceMax}
          onPriceMin={setPriceMin} onPriceMax={setPriceMax}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Show</span>
          <select
            value={perPage}
            onChange={(e) => setPerPage(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
            style={{ padding: "6px 10px", fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", cursor: "pointer", fontFamily: "inherit" }}
          >
            {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="all">All</option>
          </select>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>per page</span>
        </div>

        <LaptopGrid
          laptops={paginated} onSelect={setSelectedLaptop} onHistory={setHistoryLaptop}
          isAdmin={unlocked} onMoveToDeals={(l) => requireAuth(() => handleMoveToDeals(l))}
          onDelete={(id) => requireAuth(() => handleDeleteLaptop(id))}
          currency={currency} cadToUsd={cadToUsd}
          cardLayout={cardLayout}
        />

        {perPage !== "all" && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 28 }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={pageBtnStyle(currentPage === 1)}
            >‹ Prev</button>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={pageBtnStyle(currentPage === totalPages)}
            >Next ›</button>
          </div>
        )}
      </div>

      {selectedLaptop && <LaptopModal laptop={selectedLaptop} onClose={() => setSelectedLaptop(null)} onUpdatePrice={handleUpdatePrice} onDelete={handleDeleteClick} onHistory={(l) => { setSelectedLaptop(null); setHistoryLaptop(l); }} currency={currency} cadToUsd={cadToUsd} />}
      {historyLaptop && <PriceHistoryModal laptop={historyLaptop} onClose={() => setHistoryLaptop(null)} currency={currency} cadToUsd={cadToUsd} />}
      {showAddModal && <AddLaptopModal onClose={() => setShowAddModal(false)} onSubmit={handleAddLaptop} loading={loading} />}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          isDark={isDark}
          onThemeToggle={() => setIsDark((d) => !d)}
          accent={accent}
          onAccentChange={setAccent}
          fontScale={fontScale}
          onFontScaleChange={setFontScale}
          uiTheme={uiTheme}
          onUiThemeChange={setUiTheme}
          cardLayout={cardLayout}
          onCardLayoutChange={setCardLayout}
          bgEffect={bgEffect}
          onBgEffectChange={setBgEffect}
          animSpeed={animSpeed}
          onAnimSpeedChange={setAnimSpeed}
        />
      )}

      {showAuthModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}>
          <div className="modal-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 400, margin: "1rem", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3))", borderRadius: 99, marginBottom: 20, marginLeft: -28, marginRight: -28, marginTop: -28 }} />
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>🔒 Admin access</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Enter the password to unlock admin actions.</p>
            <input
              type="password" placeholder="Enter password…" value={authInput}
              onChange={(e) => setAuthInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAuth()} autoFocus
              style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", color: "inherit", fontFamily: "inherit", outline: "none", marginBottom: 6, boxSizing: "border-box" }}
            />
            {authError && <p style={{ fontSize: 12, color: "#f76a6a", marginBottom: 8 }}>{authError}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowAuthModal(false)} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
              <button onClick={submitAuth} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "fixed", top: 20, right: 20, display: "flex", flexDirection: "column", gap: 10, zIndex: 9999 }}>
        {toasts.map((t) => <Toast key={t.id} message={t.message} type={t.type} />)}
      </div>
    </div>
  );
}
