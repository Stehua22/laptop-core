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

const HEADLINES: Record<'free' | PlanKey, string[]> = {
  free: ['5 Lapi AI chats/day', 'Compare up to 3 laptops', '4 similar-laptop matches', 'Standard deal scanner'],
  premium: ['Unlimited Lapi AI chats', 'Compare up to 6 laptops', '3D Model Viewer', 'Priority deal scanner'],
  ultra: ['Everything in Premium', 'Split View comparisons', '12 similar-laptop matches', 'Priority + expanded deal sources'],
};

const PLAN_PRICE: Record<PlanKey, string> = {
  premium: '$3.99',
  ultra: '$7.99',
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
    <div style={{ minHeight: '100vh', padding: '56px 24px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 980 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 10, color: 'var(--accent-2)' }}>⭐</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text)' }}>
            LaptopCore Premium &amp; Ultra
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto' }}>
            Unlock unlimited chats, richer comparisons, and priority deal scanning.
          </p>
        </div>

        {/* Tier cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40, alignItems: 'stretch' }}>
          <TierCard
            label="Free"
            price="$0"
            accentVar="var(--text-muted)"
            highlights={HEADLINES.free}
            footer={currentPlan === 'free' ? <CurrentPlanNote /> : <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>Your starting plan</p>}
          />
          <TierCard
            label="Premium"
            price={`${PLAN_PRICE.premium} CAD/mo`}
            accentVar="var(--accent)"
            featured
            highlights={HEADLINES.premium}
            footer={
              checking ? null : !user ? (
                <SignInPrompt />
              ) : (
                <PlanButton
                  label="Premium"
                  accentVar="var(--accent)"
                  active={currentPlan === 'premium'}
                  disabled={currentPlan === 'ultra'}
                  loading={loadingPlan === 'premium'}
                  onClick={() => handleUpgrade('premium')}
                />
              )
            }
          />
          <TierCard
            label="Ultra"
            price={`${PLAN_PRICE.ultra} CAD/mo`}
            accentVar="var(--accent-2)"
            highlights={HEADLINES.ultra}
            footer={
              checking ? null : !user ? (
                <SignInPrompt />
              ) : (
                <PlanButton
                  label="Ultra"
                  accentVar="var(--accent-2)"
                  active={currentPlan === 'ultra'}
                  disabled={false}
                  loading={loadingPlan === 'ultra'}
                  onClick={() => handleUpgrade('ultra')}
                />
              )
            }
          />
        </div>

        {error && <p style={{ color: 'var(--accent-red)', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>{error}</p>}

        {/* Full comparison table */}
        <div style={{ marginBottom: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text)' }}>Full feature comparison</h2>
        </div>
        <div
          style={{
            textAlign: 'left',
            border: '1px solid var(--border)',
            borderRadius: 'var(--card-radius, 14px)',
            overflow: 'hidden',
            marginBottom: 28,
            background: 'var(--card-bg, var(--surface))',
            boxShadow: 'var(--card-shadow, none)',
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

        {user && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
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

function TierCard({
  label,
  price,
  accentVar,
  highlights,
  footer,
  featured = false,
}: {
  label: string;
  price: string;
  accentVar: string;
  highlights: string[];
  footer: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--card-bg, var(--surface))',
        border: `1px solid ${featured ? accentVar : 'var(--card-border, var(--border))'}`,
        borderRadius: 'var(--card-radius, 16px)',
        boxShadow: featured ? 'var(--card-hover-shadow)' : 'var(--card-shadow, none)',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {featured && (
        <div
          style={{
            position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#fff', background: accentVar, borderRadius: 6, padding: '3px 10px',
          }}
        >
          Most popular
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: accentVar, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 16 }}>{price}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        {highlights.map((h) => (
          <li key={h} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-muted)', alignItems: 'flex-start', lineHeight: 1.4 }}>
            <span style={{ color: accentVar, fontWeight: 700, flexShrink: 0 }}>✓</span>{h}
          </li>
        ))}
      </ul>
      <div>{footer}</div>
    </div>
  );
}

function SignInPrompt() {
  return (
    <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
      <Link href="/signup" style={{ color: 'var(--accent)' }}>Sign up</Link>
      {' '}or{' '}
      <Link href="/login" style={{ color: 'var(--accent)' }}>log in</Link>
      {' '}to subscribe.
    </p>
  );
}

function CurrentPlanNote() {
  return <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-3)', textAlign: 'center' }}>Your current plan 🎉</p>;
}

function PlanButton({
  label,
  accentVar,
  active,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  accentVar: string;
  active: boolean;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  if (active) return <CurrentPlanNote />;
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        padding: '10px 0',
        borderRadius: 'var(--btn-radius, 9px)',
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
  );
}