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
    <div style={{ minHeight: '100vh', padding: '64px 24px 80px', display: 'flex', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes lc-prem-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.15); } }
        @keyframes lc-prem-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,24px) scale(1.1); } }
        @keyframes lc-prem-badge-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes lc-prem-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lc-prem-pop { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .lc-prem-orb-1 { position: absolute; top: -140px; left: -100px; width: 420px; height: 420px; border-radius: 50%; background: radial-gradient(circle, var(--accent) 0%, transparent 70%); opacity: 0.16; filter: blur(50px); animation: lc-prem-orb-a 12s ease-in-out infinite; pointer-events: none; }
        .lc-prem-orb-2 { position: absolute; bottom: -160px; right: -120px; width: 460px; height: 460px; border-radius: 50%; background: radial-gradient(circle, var(--accent-2) 0%, transparent 70%); opacity: 0.14; filter: blur(55px); animation: lc-prem-orb-b 14s ease-in-out infinite; pointer-events: none; }
        .lc-prem-fadeup { animation: lc-prem-fade-up 0.6s ease both; }
        .lc-prem-card { animation: lc-prem-pop 0.55s cubic-bezier(0.16,1,0.3,1) both; transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }
        .lc-prem-card:hover { transform: translateY(-6px); }
        .lc-prem-row { transition: background 0.15s ease; }
        .lc-prem-row:hover { background: var(--surface-2) !important; }
        .lc-prem-btn { position: relative; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease; }
        .lc-prem-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.18); }
        .lc-prem-badge-ring { animation: lc-prem-badge-spin 18s linear infinite; }
      `}} />

      <div className="lc-prem-orb-1" />
      <div className="lc-prem-orb-2" />

      <div style={{ width: '100%', maxWidth: 1080, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div className="lc-prem-fadeup" style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            position: 'relative', width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, background: 'var(--surface)', border: '1px solid var(--border)',
            boxShadow: '0 0 0 10px var(--glow), 0 8px 28px rgba(0,0,0,0.15)',
          }}>
            <div className="lc-prem-badge-ring" style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1.5px dashed var(--accent-2)', opacity: 0.5 }} />
            <span style={{ color: 'var(--accent-2)' }}>⭐</span>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12, opacity: 0.85 }}>
            Unlock the full toolkit
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 2.9rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 14, color: 'var(--text)', lineHeight: 1.08 }}>
            LaptopCore Premium &amp; Ultra
          </h1>
          <p style={{ fontSize: 15.5, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Unlimited chats with Lapi, richer comparisons, and priority deal scanning — pick the tier that fits how you shop.
          </p>
        </div>

        {/* Tier cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22, marginBottom: 56, alignItems: 'stretch' }}>
          <div className="lc-prem-card" style={{ animationDelay: '0s' }}>
            <TierCard
              label="Free"
              price="$0"
              sub="forever"
              accentVar="var(--text-muted)"
              highlights={HEADLINES.free}
              footer={currentPlan === 'free' ? <CurrentPlanNote /> : <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>Your starting plan</p>}
            />
          </div>
          <div className="lc-prem-card" style={{ animationDelay: '0.08s' }}>
            <TierCard
              label="Premium"
              price={PLAN_PRICE.premium}
              sub="CAD / month"
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
          </div>
          <div className="lc-prem-card" style={{ animationDelay: '0.16s' }}>
            <TierCard
              label="Ultra"
              price={PLAN_PRICE.ultra}
              sub="CAD / month"
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
        </div>

        {error && <p style={{ color: 'var(--accent-red)', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>{error}</p>}

        {/* Full comparison table */}
        <div className="lc-prem-fadeup" style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Full feature comparison</h2>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>every plan, side by side</span>
        </div>
        <div
          className="lc-prem-fadeup"
          style={{
            textAlign: 'left',
            border: '1px solid var(--border)',
            borderRadius: 'var(--card-radius, 16px)',
            overflow: 'hidden',
            marginBottom: 32,
            background: 'var(--card-bg, var(--surface))',
            boxShadow: 'var(--card-shadow, 0 8px 24px rgba(0,0,0,0.08))',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 0.9fr 0.9fr 0.9fr',
              background: 'var(--surface-2)',
              fontSize: 11.5,
              fontWeight: 700,
              padding: '14px 18px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              borderBottom: '1px solid var(--border)',
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
              className="lc-prem-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 0.9fr 0.9fr 0.9fr',
                fontSize: 12.5,
                padding: '13px 18px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
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
          <p className="lc-prem-fadeup" style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
            Refer friends and earn a free month for every one who subscribes.{' '}
            <Link href="/account/referrals" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Get your referral link →
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
  sub,
  accentVar,
  highlights,
  footer,
  featured = false,
}: {
  label: string;
  price: string;
  sub?: string;
  accentVar: string;
  highlights: string[];
  footer: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        background: featured
          ? `linear-gradient(180deg, var(--card-bg, var(--surface)) 0%, var(--card-bg, var(--surface)) 100%)`
          : 'var(--card-bg, var(--surface))',
        border: `1.5px solid ${featured ? accentVar : 'var(--card-border, var(--border))'}`,
        borderRadius: 'var(--card-radius, 18px)',
        boxShadow: featured ? `0 16px 40px -12px ${accentVar}55, var(--card-shadow, none)` : 'var(--card-shadow, 0 4px 16px rgba(0,0,0,0.06))',
        padding: '32px 26px',
        display: 'flex',
        flexDirection: 'column',
        transform: featured ? 'scale(1.035)' : 'scale(1)',
      }}
    >
      {featured && (
        <div
          style={{
            position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#fff', background: `linear-gradient(135deg, ${accentVar}, var(--accent-3))`, borderRadius: 20, padding: '5px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          ✦ Most popular
        </div>
      )}
      <div style={{ fontSize: 13.5, fontWeight: 700, color: accentVar, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 24 }}>
        <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>{price}</span>
        {sub && <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{sub}</span>}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {highlights.map((h) => (
          <li key={h} style={{ display: 'flex', gap: 9, fontSize: 13, color: 'var(--text-muted)', alignItems: 'flex-start', lineHeight: 1.5 }}>
            <span style={{
              flexShrink: 0, width: 16, height: 16, borderRadius: '50%',
              background: `${accentVar}22`, color: accentVar, fontWeight: 800, fontSize: 9.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
            }}>✓</span>
            {h}
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
      <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign up</Link>
      {' '}or{' '}
      <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>log in</Link>
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
      className="lc-prem-btn"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        padding: '12px 0',
        borderRadius: 'var(--btn-radius, 10px)',
        border: 'none',
        background: `linear-gradient(135deg, ${accentVar}, var(--accent-3))`,
        color: '#fff',
        fontWeight: 700,
        fontSize: 13.5,
        cursor: disabled || loading ? 'default' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
      }}
    >
      {loading ? 'Redirecting…' : disabled ? 'Included in Ultra' : `Upgrade to ${label}`}
    </button>
  );
}