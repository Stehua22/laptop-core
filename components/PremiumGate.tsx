'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type PremiumGateProps = {
  children: ReactNode;
  featureName: string; // e.g. "3D Viewer"
};

export default function PremiumGate({ children, featureName }: PremiumGateProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        setAllowed(false);
        return;
      }

      const { data: profile } = await supabaseBrowser
        .from('profiles')
        .select('plan')
        .eq('id', session.user.id)
        .single();

      setAllowed(profile?.plan === 'premium' || profile?.plan === 'ultra');
    }
    check();
  }, []);

  if (allowed === null) {
    return <div style={{ padding: '5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
  }

  if (!allowed) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '5rem 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{featureName} is a Premium feature</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Upgrade to Premium or Ultra to unlock {featureName.toLowerCase()}.
        </p>
        <Link
          href="/premium"
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 8,
            background: 'var(--accent-color, #2563eb)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}