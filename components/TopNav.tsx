'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import ThemeToggle from '@/components/ThemeToggle';

// Same bucket the admin panel's "Site Images" tab uploads to.
const SITE_IMAGES_BUCKET = 'site-images';
// Cache-bust per page load so a browser that cached an old 404 is forced to re-check.
const logoUrl = `${supabaseBrowser.storage.from(SITE_IMAGES_BUCKET).getPublicUrl('logo.png').data.publicUrl}?t=${Date.now()}`;

export default function TopNav() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
      setEmail(data.session?.user.email ?? null);
    });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      setEmail(session?.user.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
  }

  return (
    <div
      style={{
        // sticky (not fixed) — this makes TopNav take up real space in
        // the page flow, so it can never overlap a page's own nav below it.
        // No paddingTop hacks needed on any page, ever.
        position: 'sticky',
        top: 0,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '0 20px',
        background: 'var(--surface, #0f1220)',
        borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
        zIndex: 900,
      }}
    >
      {/* Logo — set in Admin Panel → Site Images → "Logo (top nav)" */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
        {logoOk && (
          <img
            src={logoUrl}
            alt=""
            width={40}
            height={40}
            style={{ objectFit: 'contain' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none'; // hide instantly, no broken-icon flash
              setLogoOk(false);
            }}
          />
        )}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ThemeToggle />

        {loggedIn === null ? null : loggedIn ? (
          <>
            <Link
              href="/premium"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#d97706',
                textDecoration: 'none',
              }}
            >
              ⭐ Premium
            </Link>
            <span style={{ fontSize: 13, color: 'inherit', opacity: 0.7 }}>
              {email}
            </span>
            <button
              onClick={handleLogout}
              style={{
                fontSize: 13,
                border: '1px solid currentColor',
                background: 'transparent',
                color: 'inherit',
                opacity: 0.8,
                borderRadius: 6,
                padding: '5px 10px',
                cursor: 'pointer',
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'inherit',
                textDecoration: 'none',
                padding: '6px 10px',
              }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: 'var(--accent-color, #2563eb)',
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: 7,
              }}
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
