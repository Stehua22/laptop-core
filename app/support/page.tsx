"use client";
import { useState } from "react";
import Link from "next/link";

type FaqItem = { q: string; a: string };
type FaqGroup = { label: string; items: FaqItem[] };

const FAQ_GROUPS: FaqGroup[] = [
  {
    label: "Pricing",
    items: [
      { q: "What's the difference between Premium and Ultra?", a: "Premium unlocks unlimited Lapi AI chats, comparing up to 6 laptops, the 3D Model Viewer, and priority deal scanning. Ultra includes everything in Premium plus Split View side-by-side comparisons and 12 similar-laptop matches instead of 4." },
      { q: "Can I cancel anytime?", a: "Yes. Cancelling stops future billing immediately and you'll keep your current tier's features until the end of the billing period you already paid for." },
      { q: "Do referrals really give a free month?", a: "Yes — for every friend who subscribes to Premium or Ultra using your referral link, you get one free month applied to your own subscription." },
    ],
  },
  {
    label: "Prices & data",
    items: [
      { q: "How often are prices updated?", a: "Prices are pulled from retailer listings and refreshed periodically. Because retailers can change prices at any time, always confirm the price on the store's page before purchasing." },
      { q: "Why does a price look wrong or outdated?", a: "Occasionally a listing changes faster than our scan cycle, or a laptop model gets matched incorrectly. If you spot a price that looks off, it helps to double check directly on the store link before assuming it's accurate." },
      { q: "Where do the deals on the Deals page come from?", a: "Deals are laptops with a tracked retail price higher than their current price, plus live scans from supported retailers shown in the Live Scanned Deals section." },
    ],
  },
  {
    label: "Account",
    items: [
      { q: "I forgot my password — what do I do?", a: "Use the \"log in\" link and choose the password reset option there. If you signed up with a magic link originally, you can request a new one the same way." },
      { q: "How do I delete my account?", a: "Reach out through the contact options below and we'll take care of it." },
    ],
  },
];

export default function SupportPage() {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set([FAQ_GROUPS[0].label]));
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div style={{ minHeight: "100vh", padding: "56px 24px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 760 }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 10 }}>// support</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8, color: "var(--text)" }}>
            Support &amp; FAQ
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Answers to common questions, plus how to reach us if you're stuck.
          </p>
        </div>

        {/* Contact cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 40 }}>
          <ContactCard
            title="Email us"
            body="For account issues, billing questions, or anything else."
            action={<a href="mailto:support@laptopcore.app" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>support@laptopcore.app →</a>}
          />
          <ContactCard
            title="Report a wrong price"
            body="Spotted a price that looks off or a bad brand/model match?"
            action={<a href="mailto:support@laptopcore.app?subject=Price%20report" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>Report it →</a>}
          />
          <ContactCard
            title="Referrals"
            body="Check your referral link and rewards status."
            action={<Link href="/account/referrals" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>Refer & Earn →</Link>}
          />
        </div>

        {/* FAQ */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "var(--text)" }}>Frequently asked questions</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ_GROUPS.map(group => {
              const groupOpen = openGroups.has(group.label);
              return (
                <div
                  key={group.label}
                  style={{
                    background: "var(--card-bg, var(--surface))",
                    border: "1px solid var(--card-border, var(--border))",
                    borderRadius: "var(--card-radius, 14px)",
                    boxShadow: "var(--card-shadow, none)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => toggleGroup(group.label)}
                    type="button"
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: 700, color: "var(--text)", textAlign: "left", fontFamily: "inherit",
                    }}
                  >
                    {group.label}
                    <span style={{ transform: groupOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease", color: "var(--text-muted)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                    </span>
                  </button>

                  {groupOpen && (
                    <div style={{ borderTop: "1px solid var(--border)" }}>
                      {group.items.map((item, i) => {
                        const key = `${group.label}::${item.q}`;
                        const itemOpen = openItems.has(key);
                        return (
                          <div key={key} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                            <button
                              onClick={() => toggleItem(key)}
                              type="button"
                              style={{
                                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                                gap: 12, padding: "12px 18px", background: "transparent", border: "none", cursor: "pointer",
                                fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textAlign: "left", fontFamily: "inherit",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; }}
                            >
                              {item.q}
                              <span style={{ flexShrink: 0, fontSize: 16, color: "var(--accent)", lineHeight: 1 }}>{itemOpen ? "−" : "+"}</span>
                            </button>
                            {itemOpen && (
                              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, padding: "0 18px 14px", margin: 0 }}>
                                {item.a}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactCard({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--card-bg, var(--surface))",
        border: "1px solid var(--card-border, var(--border))",
        borderRadius: "var(--card-radius, 14px)",
        boxShadow: "var(--card-shadow, none)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, flex: 1 }}>{body}</div>
      {action}
    </div>
  );
}
