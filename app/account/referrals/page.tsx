'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { getOrCreateReferralCode, fetchReferrals, type ReferralRow } from '@/lib/referrals';

export default function ReferralsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const session = sessionData.session;
      if (!session) { setLoading(false); return; }

      setUserId(session.user.id);
      const refCode = await getOrCreateReferralCode(session.user.id);
      setCode(refCode);
      const rows = await fetchReferrals(session.user.id);
      setReferrals(rows);
      setLoading(false);
    }
    load();
  }, []);

  const link = typeof window !== 'undefined' && code ? `${window.location.origin}/r/${code}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmedCount = referrals.filter((r) => r.status === 'confirmed' || r.status === 'rewarded').length;

  if (loading) {
    return <div style={{ padding: '5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
  }

  if (!userId) {
    return (
      <div style={{ padding: '5rem 1rem', textAlign: 'center' }}>
        <p style={{ fontSize: 14 }}>Log in to see your referral link.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Refer friends, earn free months</h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
        Every friend who subscribes to Premium or Ultra using your link gets you a free month.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          border: '1px solid var(--border, #e5e5e5)',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 12,
        }}
      >
        <span style={{ flex: 1, fontSize: 13, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {link}
        </span>
        <button
          onClick={copyLink}
          style={{
            fontSize: 12,
            padding: '7px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent-color, #2563eb)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32, fontSize: 13, color: 'var(--text-muted)' }}>
        <div><strong style={{ color: 'var(--text-primary, #111)', fontSize: 20 }}>{referrals.length}</strong> referred</div>
        <div><strong style={{ color: 'var(--text-primary, #111)', fontSize: 20 }}>{confirmedCount}</strong> confirmed</div>
        <div><strong style={{ color: 'var(--text-primary, #111)', fontSize: 20 }}>{confirmedCount}</strong> free months earned</div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>History</h2>
      {referrals.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No referrals yet — share your link above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {referrals.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                padding: '10px 14px',
                border: '1px solid var(--border, #e5e5e5)',
                borderRadius: 8,
              }}
            >
              <span>Referred user</span>
              <span style={{ color: r.status === 'confirmed' || r.status === 'rewarded' ? '#16a34a' : '#888', fontWeight: 600 }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}