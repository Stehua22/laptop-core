'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { User } from '@supabase/supabase-js';

const FEATURES: { label: string; free: string; premium: string }[] = [
  { label: 'Lapi AI chats',       free: '5/day',       premium: 'Unlimited' },
  { label: 'Laptop comparisons',  free: 'Up to 3',      premium: 'Up to 6' },
  { label: 'Comparison insights', free: 'Basic specs',  premium: 'Value score + price-per-spec breakdown' },
  { label: 'Deal scanner',        free: 'Standard',     premium: 'Priority / expanded' },
  { label: 'Support',             free: 'Standard',     premium: 'Priority' },
];

export default function PremiumPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [chatCount, setChatCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const session = sessionData.session;
      setUser(session?.user ?? null);
      setChecking(false);

      if (session) {
        const { data: profile } = await supabaseBrowser
          .from('profiles')
          .select('is_premium, chat_count, chat_count_date')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setIsPremium(profile.is_premium);
          const today = new Date().toISOString().slice(0, 10);
          setChatCount(profile.chat_count_date === today ? profile.chat_count : 0);
        }
      }
    }
    load();

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
          maxWidth: 560,
          background: 'var(--bg-primary, #fff)',
          color: 'var(--text-primary, #111)',
          border: '1px solid var(--border-color, #e5e5e5)',
          borderRadius: 14,
          padding: 28,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>LaptopCore Premium</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          $3.99 CAD / month — unlimited chats, advanced comparisons, and more.
        </p>

        {/* Free vs Premium table */}
        <div
          style={{
            textAlign: 'left',
            border: '1px solid var(--border-color, #e5e5e5)',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr',
              background: 'var(--bg-secondary, #f7f7f7)',
              fontSize: 12,
              fontWeight: 700,
              padding: '10px 14px',
            }}
          >
            <div>Feature</div>
            <div style={{ textAlign: 'center' }}>Free</div>
            <div style={{ textAlign: 'center', color: 'var(--accent-color, #2563eb)' }}>Premium</div>
          </div>
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr',
                fontSize: 12,
                padding: '10px 14px',
                borderTop: '1px solid var(--border-color, #e5e5e5)',
                background: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent',
              }}
            >
              <div style={{ fontWeight: 600 }}>{f.label}</div>
              <div style={{ textAlign: 'center', color: '#888' }}>{f.free}</div>
              <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-color, #2563eb)' }}>{f.premium}</div>
            </div>
          ))}
        </div>

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
        ) : isPremium ? (
          <p style={{ fontSize: 14, fontWeight: 600, color: '#16a34a' }}>
            You're already Premium — enjoy every perk above! 🎉
          </p>
        ) : (
          <>
            {chatCount !== null && (
              <p style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>
                You've used {chatCount}/5 free chats today.
              </p>
            )}
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