'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function PremiumPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [chatCount, setChatCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const session = sessionData.session;
      setLoggedIn(!!session);
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
  }, []);

  async function handleUpgrade() {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const session = sessionData.session;
    if (!session) return;

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.user.id, email: session.user.email }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
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
          maxWidth: 420,
          background: 'var(--bg-primary, #fff)',
          color: 'var(--text-primary, #111)',
          border: '1px solid var(--border-color, #e5e5e5)',
          borderRadius: 14,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>LaptopCore Premium</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          Unlimited Lapi chats, no daily cap.
        </p>
        <div
          style={{
            textAlign: 'left',
            background: 'var(--bg-secondary, #f7f7f7)',
            borderRadius: 10,
            padding: '16px 18px',
            marginBottom: 24,
            fontSize: 14,
            lineHeight: 1.8,
          }}
        >
          <div>✅ Unlimited Lapi AI chats (free plan: 5/day)</div>
          <div>✅ Priority support</div>
          <div>✅ Early access to new features</div>
        </div>
        {loggedIn === false && (
          <>
            <p style={{ fontSize: 13, marginBottom: 14 }}>
              Sign up first to upgrade to Premium.
            </p>
            <Link
              href="/signup"
              style={{
                display: 'inline-block',
                background: 'var(--accent-color, #2563eb)',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Sign up
            </Link>
          </>
        )}
        {loggedIn === true && isPremium && (
          <p style={{ fontSize: 14, fontWeight: 600, color: '#16a34a' }}>
            You're already Premium — enjoy unlimited chats! 🎉
          </p>
        )}
        {loggedIn === true && !isPremium && (
          <>
            {chatCount !== null && (
              <p style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>
                You've used {chatCount}/5 free chats today.
              </p>
            )}
            <button
              onClick={handleUpgrade}
              style={{
                background: 'var(--accent-color, #2563eb)',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Upgrade to Premium
            </button>
          </>
        )}
      </div>
    </div>
  );
}
