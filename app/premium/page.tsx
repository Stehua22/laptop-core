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
  { label: 'Similar Laptops results', free: '4', premium: '4', ultra: '12' },
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
          maxWidth: 720,
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--card-radius, 18px)',
          padding: 32,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8, color: 'var(--accent-2)' }}>⭐</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>LaptopCore Premium &amp; Ultra</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
          Unlock unlimited chats, advanced comparisons, and more.
        </p>

        {/* Free vs Premium vs Ultra table */}
        <div
          style={{
            textAlign: 'left',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 0.9fr 0.9fr 0.9fr',
              background: 'var(--surface-2)',
              fontSize: 11.5,
              fontWeight: 700,
              padding: '10px 14px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <div>Feature</div>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Free</div>
            <div style={{ textAlign: 'center', color: 'var(--accent)' }}>Premium</div>
            <div style={{ textAlign: 'center', color: 'var(--accent-2)' }}>Ultra</div>
          </div>
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 0.9fr 0.9fr 0.9fr',
                fontSize: 12.5,
                padding: '10px 14px',
                borderTop: '1px solid var(--border)',
                background: i % 2 === 1 ? 'var(--surface-2)' : 'transparent',
              }}
            >
              <div style={{ fontWeight: 600 }}>{f.label}</div>
              <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>{f.free}</div>
              <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{f.premium}</div>
              <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-2)' }}>{f.ultra}</div>
            </div>
          ))}
        </div>

        {checking ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading…</p>
        ) : !user ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            You need an account first.{' '}
            <Link href="/signup" style={{ color: 'var(--accent)' }}>
              Sign up
            </Link>{' '}
            or{' '}
            <Link href="/login" style={{ color: 'var(--accent)' }}>
              log in
            </Link>
            .
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <PlanButton
              label="Premium"
              price={PLAN_PRICE.premium}
              accentVar="var(--accent)"
              active={currentPlan === 'premium'}
              disabled={currentPlan === 'ultra'}
              loading={loadingPlan === 'premium'}
              onClick={() => handleUpgrade('premium')}
            />
            <PlanButton
              label="Ultra"
              price={PLAN_PRICE.ultra}
              accentVar="var(--accent-2)"
              active={currentPlan === 'ultra'}
              disabled={false}
              loading={loadingPlan === 'ultra'}
              onClick={() => handleUpgrade('ultra')}
            />
          </div>
        )}

        {error && <p style={{ color: 'var(--accent-red)', fontSize: 13, marginTop: 12 }}>{error}</p>}

        {user && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
            Refer friends and earn a free month for every one who subscribes.{' '}
            <Link href="/account/referrals" style={{ color: 'var(--accent)' }}>
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
  accentVar,
  active,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  price: string;
  accentVar: string;
  active: boolean;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        flex: '1 1 200px',
        border: `1px solid ${active ? accentVar : 'var(--border)'}`,
        borderRadius: 12,
        padding: '18px 20px',
        textAlign: 'center',
        background: 'var(--surface-2)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: accentVar, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{price}</div>
      {active ? (
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-3)' }}>Your current plan 🎉</p>
      ) : (
        <button
          onClick={onClick}
          disabled={disabled || loading}
          style={{
            width: '100%',
            padding: '10px 0',
            borderRadius: 9,
            border: 'none',
            background: accentVar,
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor: disabled || loading ? 'default' : 'pointer',
            opacity: disabled || loading ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Redirecting…' : disabled ? 'Included in Ultra' : `Upgrade to ${label}`}
        </button>
      )}
    </div>
  );
}