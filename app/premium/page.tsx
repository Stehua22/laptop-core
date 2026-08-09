'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { User } from '@supabase/supabase-js';

type PlanKey = 'premium' | 'ultra';

const FEATURES: { label: string; free: string; premium: string; ultra: string }[] = [
  { label: 'Lapi AI chats',       free: '5/day',      premium: 'Unlimited', ultra: 'Unlimited' },
  { label: 'Laptop comparisons',  free: 'Up to 3',     premium: 'Up to 6',   ultra: 'Up to 6' },
  { label: 'Comparison insights', free: 'Basic specs', premium: 'Value score + price-per-spec', ultra: 'Value score + price-per-spec' },
  { label: 'Split View (2-laptop side-by-side)', free: '—', premium: '—', ultra: 'Included' },
  { label: '3D Model Viewer',     free: '—',           premium: 'Included', ultra: 'Included' },
  { label: 'Deal scanner',        free: 'Standard',    premium: 'Priority',  ultra: 'Priority / expanded sources' },
  { label: 'Articles',            free: '5/week',      premium: 'Unlimited', ultra: 'Unlimited' },
  { label: 'Support',             free: 'Standard',    premium: 'Priority',  ultra: 'Priority' },
  { label: 'Referral rewards',    free: '—',           premium: '1 free month per referral', ultra: '1 free month per referral' },
];

const PLAN_PRICE: Record<PlanKey, string> = {
  premium: '$3.99 CAD / month',
  ultra: '$7.99 CAD / month',
};

export default function PremiumPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState('');
  const [currentPlan, setCurrentPlan] = useState<'free' | 'premium' | 'ultra'>('free');

  useEffect(() => {
    async function load() {
      const { data } = await supabaseBrowser.auth.getUser();
      setUser(data.user ?? null);
      setChecking(false);

      if (data.user) {
        const { data: profile } = await supabaseBrowser
          .from('profiles')
          .select('plan')
          .eq('id', data.user.id)
          .single();
        if (profile?.plan) setCurrentPlan(profile.plan);
      }
    }
    load();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleUpgrade(plan: PlanKey) {
    if (!user || !user.email) return;
    setError('');
    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email, plan }),
      });
      const { url, error: apiError } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setError(apiError || 'Something went wrong. Try again.');
        setLoadingPlan(null);
      }
    } catch {
      setError('Something went wrong. Try again.');
      setLoadingPlan(null);
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
          maxWidth: 680,
          background: 'var(--bg-primary, #fff)',
          color: 'var(--text-primary, #111)',
          border: '1px solid var(--border-color, #e5e5e5)',
          borderRadius: 14,
          padding: 28,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>LaptopCore Premium & Ultra</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          Unlock unlimited chats, advanced comparisons, and more.
        </p>

        {/* Free vs Premium vs Ultra table */}
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
              gridTemplateColumns: '1.3fr 0.9fr 0.9fr 0.9fr',
              background: 'var(--bg-secondary, #f7f7f7)',
              fontSize: 12,
              fontWeight: 700,
              padding: '10px 14px',
            }}
          >
            <div>Feature</div>
            <div style={{ textAlign: 'center' }}>Free</div>
            <div style={{ textAlign: 'center', color: 'var(--accent-color, #2563eb)' }}>Premium</div>
            <div style={{ textAlign: 'center', color: '#9333ea' }}>Ultra</div>
          </div>
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 0.9fr 0.9fr 0.9fr',
                fontSize: 12,
                padding: '10px 14px',
                borderTop: '1px solid var(--border-color, #e5e5e5)',
                background: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent',
              }}
            >
              <div style={{ fontWeight: 600 }}>{f.label}</div>
              <div style={{ textAlign: 'center', color: '#888' }}>{f.free}</div>
              <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-color, #2563eb)' }}>{f.premium}</div>
              <div style={{ textAlign: 'center', fontWeight: 700, color: '#9333ea' }}>{f.ultra}</div>
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
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <PlanButton
              label="Premium"
              price={PLAN_PRICE.premium}
              color="#2563eb"
              active={currentPlan === 'premium'}
              disabled={currentPlan === 'ultra'}
              loading={loadingPlan === 'premium'}
              onClick={() => handleUpgrade('premium')}
            />
            <PlanButton
              label="Ultra"
              price={PLAN_PRICE.ultra}
              color="#9333ea"
              active={currentPlan === 'ultra'}
              disabled={false}
              loading={loadingPlan === 'ultra'}
              onClick={() => handleUpgrade('ultra')}
            />
          </div>
        )}

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</p>}

        {user && (
          <p style={{ fontSize: 12, color: '#888', marginTop: 20 }}>
            Refer friends and earn a free month for every one who subscribes.{' '}
            <Link href="/account/referrals" style={{ color: 'var(--accent-color, #2563eb)' }}>
              Get your referral link
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function PlanButton({
  label,
  price,
  color,
  active,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  price: string;
  color: string;
  active: boolean;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        flex: '1 1 200px',
        border: `1px solid ${active ? color : 'var(--border-color, #e5e5e5)'}`,
        borderRadius: 10,
        padding: '16px 18px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{price}</div>
      {active ? (
        <p style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>Your current plan 🎉</p>
      ) : (
        <button
          onClick={onClick}
          disabled={disabled || loading}
          style={{
            width: '100%',
            padding: '9px 0',
            borderRadius: 8,
            border: 'none',
            background: color,
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor: disabled || loading ? 'default' : 'pointer',
            opacity: disabled || loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Redirecting…' : disabled ? 'Included in Ultra' : `Upgrade to ${label}`}
        </button>
      )}
    </div>
  );
}