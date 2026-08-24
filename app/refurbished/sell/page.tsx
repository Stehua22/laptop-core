"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { createListing, uploadListingImage } from "@/lib/supabase";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { User } from "@supabase/supabase-js";

const CONDITION_OPTIONS = ["New - Open Box", "Used - Like New", "Used - Good", "Used - Fair", "For Parts"];

export default function SellPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [specs, setSpecs] = useState("");
  const [condition, setCondition] = useState(CONDITION_OPTIONS[2]);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "shipping" | "both">("pickup");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setCheckingAuth(false);
    });
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 6 - images.length)) {
        const url = await uploadListingImage(user.id, file);
        uploaded.push(url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      setError(err.message ?? "Failed to upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!brand.trim() || !model.trim() || !price) {
      setError("Brand, model, and price are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const listing = await createListing({
        seller_id: user.id,
        brand: brand.trim(),
        model: model.trim(),
        specs: specs.trim() || null,
        condition,
        description: description.trim() || null,
        price: parseFloat(price),
        images,
        delivery_method: deliveryMethod,
        location: location.trim() || null,
      });
      router.push(`/refurbished/${listing.id}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to create listing.");
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", fontSize: 13.5, border: "1px solid var(--border)",
    borderRadius: "var(--btn-radius, 10px)", background: "var(--surface-2)", color: "var(--text)",
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block",
  };

  if (checkingAuth) {
    return (
      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <Sidebar activeKey="refurbished" />
        <div style={{ flex: 1, padding: "40px 20px", color: "var(--text-muted)" }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <Sidebar activeKey="refurbished" />
        <div style={{ flex: 1, maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>Sign in to list a laptop</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
            You need an account so buyers can contact you and you can manage your listings.
          </p>
          <Link href="/login" style={{
            display: "inline-block", background: "var(--accent)", color: "#fff", textDecoration: "none",
            borderRadius: "var(--btn-radius, 10px)", padding: "12px 28px", fontWeight: 700, fontSize: 14,
          }}>
            Log in or sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="refurbished" />
      <div style={{ flex: 1, maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", marginBottom: 8 }}>
          List your laptop
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 32 }}>
          Fill in the details below — your listing goes live immediately.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Brand *</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Lenovo" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Model *</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. ThinkPad X1 Carbon" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Specs</label>
            <input value={specs} onChange={(e) => setSpecs(e.target.value)} placeholder="e.g. i7-1260P, 16GB RAM, 512GB SSD" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Any wear, included accessories, reason for selling, etc."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Price (CAD) *</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="800" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Delivery</label>
              <select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value as any)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="pickup">Local pickup only</option>
                <option value="shipping">Shipping only</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          {deliveryMethod !== "shipping" && (
            <div>
              <label style={labelStyle}>Pickup location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Willowdale, Toronto" style={inputStyle} />
            </div>
          )}

          <div>
            <label style={labelStyle}>Photos (up to 6)</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {images.map((url) => (
                <div key={url} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer" }}
                  >×</button>
                </div>
              ))}
              {images.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: 80, height: 80, borderRadius: 8, border: "1px dashed var(--border)",
                    background: "var(--surface-2)", color: "var(--text-muted)", cursor: uploading ? "default" : "pointer",
                    fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {uploading ? "…" : "+"}
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: "none" }} />
          </div>

          {error && <div style={{ color: "#f76a6a", fontSize: 13 }}>{error}</div>}

          <button
            type="submit"
            disabled={submitting || uploading}
            style={{
              background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--btn-radius, 10px)",
              padding: "14px", fontWeight: 700, fontSize: 14.5, cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1, marginTop: 8,
            }}
          >
            {submitting ? "Publishing…" : "Publish Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}