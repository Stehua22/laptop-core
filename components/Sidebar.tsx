import { useState, ReactNode } from "react";
import styles from "./Sidebar.module.css";

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
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
];

type SidebarProps = {
  activeKey?: string;
  onSettingsClick?: () => void;
  onResetSettings?: () => void;
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
export default function Sidebar({ activeKey = "home", onSettingsClick, onResetSettings }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("lc-sidebar-collapsed") === "true";
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lc-sidebar-collapsed", String(next));
      }
      return next;
    });
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
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

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={`${styles.navItem} ${activeKey === item.key ? styles.active : ""}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </a>
        ))}
      </nav>

      <button className={styles.collapseRow} onClick={toggleCollapsed} type="button">
        <span className={styles.chev}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </span>
        <span className={styles.label}>Collapse</span>
      </button>

      <div className={styles.bottom}>
        <button
          className={styles.resetBtn}
          title="Reset settings to defaults"
          type="button"
          onClick={onResetSettings}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 1 3.2-6.8" />
            <polyline points="3 2 3 7 8 7" />
          </svg>
        </button>
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
