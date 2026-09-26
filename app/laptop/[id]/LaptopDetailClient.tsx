"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import { fetchListingById, getOrCreateConversation } from "@/lib/supabase";
import type { Listing } from "@/lib/supabase";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { User } from "@supabase/supabase-js";

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function ListingDetailClient() {
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [sellerEmail, setSellerEmail] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    const id = Number(params.id);
    if (!id) return;

    fetchListingById(id).then((data) => {
      setListing(data);
      setLoading(false);
    });

    supabaseBrowser.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [params.id]);

  // Only fetch the seller's contact email once a logged-in user actually
  // clicks "Contact Seller" — avoids exposing it to every page visitor/bot.
  async function handleContactClick() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!listing) return;
    if (!sellerEmail) {
      const { data } = await supabaseBrowser
        .from("profiles")
        .select("email")
        .eq("id", listing.seller_id)
        .single();
      setSellerEmail(data?.email ?? null);
    }
    setShowContact(true);
  }

  // Starts (or resumes) a real in-app conversation with the seller and takes the buyer
  // straight to it — the main way people connect on a peer-to-peer marketplace.
  async function handleMessageSeller() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!listing) return;
    setMessaging(true);
    try {
      const convo = await getOrCreateConversation(listing.id, user.id, listing.seller_id);
      router.push(`/messages?c=${convo.id}`);
    } catch {
      setMessaging(false);
    }
  }

  if (loading) {
    return (
      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <Sidebar activeKey="refurbished" />
        <div style={{ flex: 1, padding: "40px 20px", color: "var(--text-muted)" }}>Loading…</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <Sidebar activeKey="refurbished" />
        <div style={{ flex: 1, maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>Listing not found</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>It may have sold or been removed.</p>
          <Link href="/refurbished" style={{ color: "var(--accent)", fontWeight: 600, fontSize: 14 }}>← Back to marketplace</Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === listing.seller_id;

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="refurbished" />
      <div style={{ flex: 1, maxWidth: 1000, margin: "0 auto", padding: "32px 20px 80px" }}>
        <Link href="/refurbished" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", display: "inline-block", marginBottom: 24 }}>
          ← Back to marketplace
        </Link>

        {listing.status === "sold" && (
          <div style={{ background: "rgba(247,106,106,0.1)", border: "1px solid rgba(247,106,106,0.3)", borderRadius: 10, padding: "10px 16px", marginBottom: 20, color: "#f76a6a", fontSize: 13, fontWeight: 600 }}>
            This listing has been marked as sold.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 40 }}>
          {/* Photos */}
          <div>
            <div style={{ background: "var(--surface-2)", borderRadius: "var(--card-radius, 16px)", height: 380, position: "relative", overflow: "hidden", marginBottom: 10 }}>
              {listing.images?.length ? (
                <Image
                  src={listing.images[activeImg]}
                  alt={`${listing.brand} ${listing.model}`}
                  fill
                  sizes="(max-width: 1000px) 100vw, 620px"
                  style={{ objectFit: "contain" }}
                  priority
                />
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, opacity: 0.15 }}>▭</div>
              )}
            </div>
            {listing.images?.length > 1 && (
              <div style={{ display: "flex", gap: 8 }}>
                {listing.images.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setActiveImg(i)}
                    style={{
                      width: 64, height: 64, borderRadius: 8, overflow: "hidden", padding: 0, cursor: "pointer",
                      position: "relative",
                      border: `2px solid ${i === activeImg ? "var(--accent)" : "var(--border)"}`, background: "var(--surface-2)",
                    }}
                  >
                    <Image src={url} alt="" fill sizes="64px" style={{ objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}

            {listing.description && (
              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Description</h2>
                <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{listing.description}</p>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {listing.condition}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 6 }}>
              {listing.brand} {listing.model}
            </h1>
            {listing.specs && <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 20 }}>{listing.specs}</p>}

            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 20 }}>
              {fmt(listing.price)}
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-radius, 14px)", padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: "var(--text-muted)" }}>Delivery</span>
                <span style={{ color: "var(--text)", fontWeight: 600 }}>
                  {listing.delivery_method === "both" ? "Pickup or shipping" : listing.delivery_method === "pickup" ? "Local pickup" : "Shipping"}
                </span>
              </div>
              {listing.location && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>Location</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{listing.location}</span>
                </div>
              )}
            </div>

            {isOwner ? (
              <Link href="/refurbished/my-listings" style={{
                display: "block", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)",
                color: "var(--text)", textDecoration: "none", borderRadius: "var(--btn-radius, 10px)", padding: "14px", fontWeight: 700, fontSize: 14,
              }}>
                Manage this listing
              </Link>
            ) : listing.status === "active" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={handleMessageSeller}
                  disabled={messaging}
                  style={{
                    width: "100%", background: "var(--accent)", color: "#fff", border: "none",
                    borderRadius: "var(--btn-radius, 10px)", padding: "14px", fontWeight: 700, fontSize: 14.5,
                    cursor: messaging ? "default" : "pointer", opacity: messaging ? 0.7 : 1,
                    boxShadow: "0 4px 16px var(--glow)",
                  }}
                >
                  {messaging ? "Opening…" : "Message Seller"}
                </button>
                <button
                  onClick={handleContactClick}
                  style={{
                    width: "100%", background: "transparent", color: "var(--text)",
                    border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 10px)",
                    padding: "14px", fontWeight: 700, fontSize: 14.5, cursor: "pointer",
                  }}
                >
                  Email Seller Directly
                </button>
              </div>
            ) : null}

            {showContact && (
              <div style={{ marginTop: 14, padding: 14, background: "var(--surface-2)", borderRadius: 10, fontSize: 13 }}>
                {sellerEmail ? (
                  <>
                    <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Reach out directly:</div>
                    <a href={`mailto:${sellerEmail}?subject=${encodeURIComponent(`Interested in your ${listing.brand} ${listing.model}`)}`} style={{ color: "var(--accent)", fontWeight: 700 }}>
                      {sellerEmail}
                    </a>
                  </>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>Seller contact info unavailable.</span>
                )}
              </div>
            )}

            <p style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 14, lineHeight: 1.6 }}>
              Arrange payment and {listing.delivery_method === "shipping" ? "shipping" : "pickup"} directly with the seller — LaptopCore doesn't process payments for these listings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}