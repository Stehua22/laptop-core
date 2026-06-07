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
import AdminPanel from "./AdminPanel";

type ToastMsg = { id: number; message: string; type: "success" | "error" };

const ADMIN_PASSWORD = "admin2026.123";

const DEFAULT_RECOMMENDATION_IDS: Record<string, number[]> = {
  student:  [59, 65, 58, 62],
  home:     [42, 52, 60, 64],
  business: [61, 57, 63, 60],
};

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
  const [recCategory, setRecCategory] = useState("student");
  const [recommendationIds, setRecommendationIds] = useState<Record<string, number[]>>(DEFAULT_RECOMMENDATION_IDS);
  const [selectedLaptop, setSelectedLaptop] = useState<Laptop | null>(null);
  const [historyLaptop, setHistoryLaptop] = useState<Laptop | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [cadToUsd, setCadToUsd] = useState(0.73);
  const toggleCurrency = () => setCurrency((c) => (c === "CAD" ? "USD" : "CAD"));

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
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

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
      const matchesSearch = l.brand.toLowerCase().includes(term) || l.model.toLowerCase().includes(term) || l.specs?.toLowerCase().includes(term);
      const matchesBrand = !brandFilter || l.brand === brandFilter;
      return matchesSearch && matchesBrand;
    });
    switch (sortBy) {
      case "priceAsc":  list = [...list].sort((a, b) => (a.current_price ?? 0) - (b.current_price ?? 0)); break;
      case "priceDesc": list = [...list].sort((a, b) => (b.current_price ?? 0) - (a.current_price ?? 0)); break;
      case "newest":    list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
    }
    return list;
  }, [laptops, search, brandFilter, sortBy]);

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

  const handleLaptopUpdatedFromAdmin = (updated: Laptop) => {
    setLaptops((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleAddClick = () => requireAuth(() => setShowAddModal(true));
  const handleAdminClick = () => requireAuth(() => setShowAdminPanel(true));
  const handleDeleteClick = (id: number) => requireAuth(() => handleDeleteLaptop(id));

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "32px 20px" }}>
        {dbError && (
          <div style={{ background: "rgba(247,106,106,0.1)", border: "1px solid rgba(247,106,106,0.3)", borderRadius: 12, padding: "14px 20px", marginBottom: 24, color: "#f76a6a", fontSize: 13 }}>
            ⚠ {dbError}
          </div>
        )}
        <Header onAdd={handleAddClick} isDark={isDark} onThemeToggle={() => setIsDark((d) => !d)} currency={currency} onCurrencyToggle={toggleCurrency} onAdminClick={handleAdminClick} />
        <StatsBar stats={stats} currency={currency} cadToUsd={cadToUsd} />
        
        <Controls search={search} onSearch={setSearch} brands={brands} brandFilter={brandFilter} onBrandFilter={setBrandFilter} sortBy={sortBy} onSort={setSortBy} />
        <LaptopGrid laptops={filtered} onSelect={setSelectedLaptop} onHistory={setHistoryLaptop} isAdmin={unlocked} onMoveToDeals={(l) => requireAuth(() => handleMoveToDeals(l))} onDelete={(id) => requireAuth(() => handleDeleteLaptop(id))} currency={currency} cadToUsd={cadToUsd} />
      </div>

      {selectedLaptop && <LaptopModal laptop={selectedLaptop} onClose={() => setSelectedLaptop(null)} onUpdatePrice={handleUpdatePrice} onDelete={handleDeleteClick} onHistory={(l) => { setSelectedLaptop(null); setHistoryLaptop(l); }} currency={currency} cadToUsd={cadToUsd} />}
      {historyLaptop && <PriceHistoryModal laptop={historyLaptop} onClose={() => setHistoryLaptop(null)} currency={currency} cadToUsd={cadToUsd} />}
      {showAddModal && <AddLaptopModal onClose={() => setShowAddModal(false)} onSubmit={handleAddLaptop} loading={loading} />}
      {showAdminPanel && <AdminPanel laptops={laptops} currency={currency} cadToUsd={cadToUsd} onClose={() => setShowAdminPanel(false)} onLaptopUpdated={handleLaptopUpdatedFromAdmin} />}

      {showAuthModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}>
          <div className="modal-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 400, margin: "1rem", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3))", borderRadius: 99, marginBottom: 20, marginLeft: -28, marginRight: -28, marginTop: -28 }} />
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>🔒 Admin access</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Enter the password to unlock admin actions.</p>
            <input type="password" placeholder="Enter password…" value={authInput} onChange={(e) => setAuthInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAuth()} autoFocus
              style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", color: "inherit", fontFamily: "inherit", outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
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
