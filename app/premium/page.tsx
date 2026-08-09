'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { User } from '@supabase/supabase-js';

export default function PremiumPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleUpgrade() {
    if (!user || !user.email) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const { url, error: apiError } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setError(apiError || 'Something went wrong. Try again.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--bg-primary, #fff)',
          color: 'var(--text-primary, #111)',
          border: '1px solid var(--border-color, #e5e5e5)',
          borderRadius: 14,
          padding: 28,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>LaptopCore Premium</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
          $3.99 CAD / month — unlock premium features.
        </p>

        {checking ? (
          <p style={{ fontSize: 14 }}>Loading…</p>
        ) : !user ? (
          <p style={{ fontSize: 14 }}>
            You need an account first.{' '}
            <Link href="/signup" style={{ color: 'var(--accent-color, #2563eb)' }}>
              Sign up
            </Link>{' '}
            or{' '}
            <Link href="/login" style={{ color: 'var(--accent-color, #2563eb)' }}>
              log in
            </Link>
            .
          </p>
        ) : (
          <>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 0',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent-color, #2563eb)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Redirecting…' : 'Upgrade to Premium'}
            </button>
            {error && (
              <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}