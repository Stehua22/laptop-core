'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

// Drop your logo file into /public (e.g. /public/logo.png) and it'll show up here.
// If you don't have one yet, delete the <Image> block below and the "logo" div.
// import logo from '@/public/logo.png'; // optional: static import instead of the string path

export default function TopNav() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);

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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '0 20px',
        background: 'transparent',
        borderBottom: 'none',
        zIndex: 9999,
        pointerEvents: 'none', // container itself stays click-through
      }}
    >
      {/* Logo slot */}
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'auto',
        }}
      >
        <Image
          src="/logo.png"
          alt="LaptopCore logo"
          width={28}
          height={28}
          priority
        />
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          pointerEvents: 'auto', // buttons/links live here, so they always receive clicks
        }}
      >
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