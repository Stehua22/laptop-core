"use client";

import { useState, useMemo, useCallback } from "react";
import type { Laptop } from "@/lib/supabase";
import { addLaptop, addPriceEntry, deleteLaptop } from "@/lib/supabase";
import Header from "./Header";
import StatsBar from "./StatsBar";
import Controls from "./Controls";
import LaptopGrid from "./LaptopGrid";
import LaptopModal from "./LaptopModal";
import PriceHistoryModal from "./PriceHistoryModal";
import AddLaptopModal from "./AddLaptopModal";
import Recommendations from "./Recommendations";
import Toast from "./Toast";

type ToastMsg = { id: number; message: string; type: "success" | "error" };

const RECOMMENDATION_IDS: Record<string, number[]> = {
  student:  [49, 5, 42, 13],
  home:     [8, 20, 50, 25],
  business: [4, 18, 21, 41],
};

export default function TrackerClient({
  initialLaptops,
  dbError,
}: {
  initialLaptops: Laptop[];
  dbError: string | null;
}) {
  const [laptops, setLaptops] = useState<Laptop[]>(initialLaptops);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [recCategory, setRecCategory] = useState("student");

  const [selectedLaptop, setSelectedLaptop] = useState<Laptop | null>(null);
  const [historyLaptop, setHistoryLaptop] = useState<Laptop | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const brands = useMemo(
    () => [...new Set(laptops.map((l) => l.brand))].sort(),
    [laptops]
  );

  const filtered = useMemo(() => {
    let list = laptops.filter((l) => {
      const term = search.toLowerCase();
      const matchesSearch =
        l.brand.toLowerCase().includes(term) ||
        l.model.toLowerCase().includes(term) ||
        l.specs?.toLowerCase().includes(term);
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
    const ids = RECOMMENDATION_IDS[recCategory] ?? [];
    return ids.map((id) => laptops.find((l) => l.id === id)).filter(Boolean) as Laptop[];
  }, [laptops, recCategory]);

  const stats = useMemo(() => {
    if (!laptops.length) return { count: 0, avg: 0, min: 0, max: 0 };
    const prices = laptops.map((l) => l.current_price ?? 0);
    return {
      count: laptops.length,
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [laptops]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAddLaptop = async (data: {
    brand: string; model: string; specs: string;
    store: string; url: string; retail_price: number;
    release_year: number | null;
  }) => {
    setLoading(true);
    try {
      await addLaptop(
        { ...data, date_added: new Date().toISOString().split("T")[0] },
        data.retail_price
      );
      // Re-fetch to get the new record with price history
      const { fetchLaptops } = await import("@/lib/supabase");
      setLaptops(await fetchLaptops());
      setShowAddModal(false);
      showToast("✅ Laptop added successfully!");
    } catch {
      showToast("❌ Failed to add laptop", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (laptopId: number) => {
    const input = prompt("Enter new price ($):");
    if (!input) return;
    const price = parseFloat(input);
    if (isNaN(price) || price < 0) { showToast("❌ Invalid price", "error"); return; }
    try {
      await addPriceEntry(laptopId, price);
      setLaptops((prev) =>
        prev.map((l) => {
          if (l.id !== laptopId) return l;
          const newEntry = { id: Date.now(), laptop_id: laptopId, price, recorded_at: new Date().toISOString().split("T")[0] };
          return { ...l, price_history: [...(l.price_history ?? []), newEntry], current_price: price };
        })
      );
      showToast("✅ Price updated!");
    } catch {
      showToast("❌ Failed to update price", "error");
    }
  };

  const handleDeleteLaptop = async (id: number) => {
    if (!confirm("Remove this laptop from tracking?")) return;
    try {
      await deleteLaptop(id);
      setLaptops((prev) => prev.filter((l) => l.id !== id));
      setSelectedLaptop(null);
      showToast("🗑️ Laptop removed");
    } catch {
      showToast("❌ Failed to delete laptop", "error");
    }
  };

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "32px 20px" }}>
        {dbError && (
          <div style={{
            background: "rgba(247, 106, 106, 0.1)",
            border: "1px solid rgba(247, 106, 106, 0.3)",
            borderRadius: 12,
            padding: "14px 20px",
            marginBottom: 24,
            color: "#f76a6a",
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
          }}>
            ⚠ {dbError}
          </div>
        )}

        <Header onAdd={() => setShowAddModal(true)} />
        <StatsBar stats={stats} />
        <Recommendations
          laptops={recommendations}
          category={recCategory}
          onCategoryChange={setRecCategory}
          onSelect={setSelectedLaptop}
          onHistory={setHistoryLaptop}
        />
        <Controls
          search={search}
          onSearch={setSearch}
          brands={brands}
          brandFilter={brandFilter}
          onBrandFilter={setBrandFilter}
          sortBy={sortBy}
          onSort={setSortBy}
        />
        <LaptopGrid
          laptops={filtered}
          onSelect={setSelectedLaptop}
          onHistory={setHistoryLaptop}
        />
      </div>

      {selectedLaptop && (
        <LaptopModal
          laptop={selectedLaptop}
          onClose={() => setSelectedLaptop(null)}
          onUpdatePrice={handleUpdatePrice}
          onDelete={handleDeleteLaptop}
          onHistory={(l) => { setSelectedLaptop(null); setHistoryLaptop(l); }}
        />
      )}

      {historyLaptop && (
        <PriceHistoryModal
          laptop={historyLaptop}
          onClose={() => setHistoryLaptop(null)}
        />
      )}

      {showAddModal && (
        <AddLaptopModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddLaptop}
          loading={loading}
        />
      )}

      <div style={{ position: "fixed", top: 20, right: 20, display: "flex", flexDirection: "column", gap: 10, zIndex: 9999 }}>
        {toasts.map((t) => <Toast key={t.id} message={t.message} type={t.type} />)}
      </div>
    </div>
  );
}
