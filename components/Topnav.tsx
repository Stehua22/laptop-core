'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

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
        justifyContent: 'flex-end',
        gap: 10,
        padding: '0 20px',
        background: 'var(--bg-primary, #fff)',
        borderBottom: '1px solid var(--border-color, #e5e5e5)',
        zIndex: 900,
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
          <span style={{ fontSize: 13, color: 'var(--text-primary, #111)', opacity: 0.7 }}>
            {email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              fontSize: 13,
              border: '1px solid var(--border-color, #e5e5e5)',
              background: 'transparent',
              color: 'var(--text-primary, #111)',
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
              color: 'var(--text-primary, #111)',
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
  );
}
