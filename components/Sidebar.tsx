'use client';

import { useState, useEffect, ReactNode } from "react";
import styles from "./Sidebar.module.css";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const BRAND_ICONS: Record<string, string> = {
  Apple: "🍎", Lenovo: "💻", Dell: "🖥️", HP: "🖨️",
  ASUS: "⚡", Acer: "🎯", Microsoft: "🪟", Samsung: "📱",
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Browse",
    items: [
      {
        key: "home",
        label: "Home",
        href: "/tracker",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
          </svg>
        ),
      },
      {
        key: "best-picks",
        label: "Best Picks",
        href: "/best-picks",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.3 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8L12 2z" />
          </svg>
        ),
      },
      {
        key: "deals",
        label: "Deals",
        href: "/deals",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12l-2 8H5l-2-8h18zM5 12L3 6h2l1.6 6M19 12l2-6h-2l-1.6 6M9 6h6l-1 4H10L9 6z" />
          </svg>
        ),
      },
      {
        key: "refurbished",
        label: "Refurbished Market",
        href: "/refurbished",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35A7.95 7.95 0 0012 4a8 8 0 108 8h-2a6 6 0 11-1.76-4.24L13 11h7V4l-2.35 2.35z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        key: "deal-scanner",
        label: "Deal Scanner",
        href: "/deals/scanner",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4-4h-2V8h2v4z"/>
            <path d="M11 2v2a8 8 0 017.43 5H21.9A10 10 0 0011 2zM21.9 15H19.4A8 8 0 0113 21.9V22a10 10 0 008.9-7z" opacity=".5"/>
          </svg>
        ),
      },
      {
        key: "view3d",
        label: "3D View",
        href: "/view3d",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2zm0 2.3L6 7.6v8l6 3.3 6-3.3v-8l-6-3.3zM12 9l4-2.2v4.4L12 13.4l-4-2.2V6.8L12 9z" />
          </svg>
        ),
      },
      {
        key: "design",
        label: "Design Studio",
        href: "/design",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9zm-1 14H9V7h2v10zm4-4h-2V7h2v6z"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        key: "articles",
        label: "Articles",
        href: "/articles",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm1 2v12h14V6H5zm2 2h10v2H7V8zm0 4h6v2H7v-2z" />
          </svg>
        ),
      },
    ],
  },
];

type SidebarProps = {
  activeKey?: string;
  onSettingsClick?: () => void;
  onResetSettings?: () => void;
  brands?: string[];
};

/**
 * Collapsible sidebar for LaptopCore.
 *
 * Usage:
 *   import Sidebar from "@/components/Sidebar";
 *   <Sidebar activeKey="home" />
 *
 * Wrap your page layout like:
 *   <div style={{ display: "flex" }}>
 *     <Sidebar activeKey="home" />
 *     <main style={{ flex: 1 }}>{children}</main>
 *   </div>
 *
 * Collapsed state persists across page loads via localStorage.
 */
export default function Sidebar({ activeKey = "home", onSettingsClick, onResetSettings, brands = [] }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("lc-sidebar-collapsed") === "true";
  });
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lc-sidebar-collapsed", String(next));
      }
      return next;
    });
  };

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
  }

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
      style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <div className={styles.brand}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path
            d="M4 17h16M6 17V8a2 2 0 012-2h8a2 2 0 012 2v9"
            stroke="#2f7de0"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 17l1.5 3h15L21 17"
            stroke="#2f7de0"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.brandText}>
          Laptop<span className={styles.accent}>Core</span>
        </span>
      </div>

      <nav className={styles.nav} style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginTop: 14 }}>
            {!collapsed && <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.55, padding: "0 12px 8px" }}>{group.label}</div>}
            {group.items.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`${styles.navItem} ${activeKey === item.key ? styles.active : ""}`}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </a>
            ))}
          </div>
        ))}

        {/* Brands section */}
        {brands.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {!collapsed && <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.55, padding: "0 12px 8px" }}>Brands</div>}
            <div className={styles.brandsSection}>
              <button
                className={styles.brandsSectionToggle}
                onClick={() => setBrandsOpen((p) => !p)}
                type="button"
                title={collapsed ? "Brands" : undefined}
              >
                <span className={styles.icon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z" />
                  </svg>
                </span>
                <span className={styles.label}>All Brands</span>
                <span className={`${styles.brandChev} ${brandsOpen ? styles.brandChevOpen : ""}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
              {brandsOpen && !collapsed && (
                <div className={styles.brandsList}>
                  {brands.map((b) => (
                    <a
                      key={b}
                      href={`/brand/${encodeURIComponent(b.toLowerCase())}`}
                      className={styles.brandLink}
                    >
                      <span style={{ fontSize: 14 }}>{BRAND_ICONS[b] ?? "💻"}</span>
                      <span>{b}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account section */}
        <div style={{ marginTop: 14, borderTop: "1px solid var(--border-color, #e5e5e5)", paddingTop: 10 }}>
          {!collapsed && <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.55, padding: "0 12px 8px" }}>Account</div>}

          <a
            href="/compare/split"
            className={`${styles.navItem} ${activeKey === "split-view" ? styles.active : ""}`}
            style={{ color: "#9333ea" }}
          >
            <span className={styles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="8" height="16" rx="1" />
                <rect x="13" y="4" width="8" height="16" rx="1" />
              </svg>
            </span>
            <span className={styles.label}>Split View</span>
          </a>

          <a
            href="/account/referrals"
            className={`${styles.navItem} ${activeKey === "referrals" ? styles.active : ""}`}
          >
            <span className={styles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 12v9H4v-9M2 7h20v5H2V7zM12 22V7M12 7c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zM12 7c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3z" />
              </svg>
            </span>
            <span className={styles.label}>Refer & Earn</span>
          </a>

          <a
            href="/premium"
            className={`${styles.navItem} ${activeKey === "premium" ? styles.active : ""}`}
            style={{ color: "#d97706" }}
          >
            <span className={styles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.3 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8L12 2z" />
              </svg>
            </span>
            <span className={styles.label}>Premium</span>
          </a>

          {loggedIn === false && (
            <>
              <a href="/login" className={styles.navItem}>
                <span className={styles.icon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                  </svg>
                </span>
                <span className={styles.label}>Log In</span>
              </a>
              <a href="/signup" className={styles.navItem}>
                <span className={styles.icon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                  </svg>
                </span>
                <span className={styles.label}>Sign Up</span>
              </a>
            </>
          )}

          {loggedIn === true && (
            <button className={styles.navItem} onClick={handleLogout} type="button" style={{ width: "100%", textAlign: "left" }}>
              <span className={styles.icon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </span>
              <span className={styles.label}>Log Out</span>
            </button>
          )}
        </div>
      </nav>

      <button className={styles.collapseRow} onClick={toggleCollapsed} type="button" style={{ flexShrink: 0 }}>
        <span className={styles.chev}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </span>
        <span className={styles.label}>Collapse</span>
      </button>

      <button className={styles.resetRow} onClick={onResetSettings} type="button" title="Reset settings to defaults" style={{ flexShrink: 0 }}>
        <span className={styles.resetIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 1 3.2-6.8" />
            <polyline points="3 2 3 7 8 7" />
          </svg>
        </span>
        <span className={styles.label}>Reset</span>
      </button>

      <div className={styles.bottom} style={{ flexShrink: 0 }}>
        <button
          className={styles.iconBtn}
          title="Settings"
          type="button"
          onClick={onSettingsClick}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.6V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.6 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1z" />
          </svg>
        </button>
      </div>
    </aside>
  );
}