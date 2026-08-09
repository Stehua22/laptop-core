'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { fetchLaptops, type Laptop } from '@/lib/supabase';

const SPEC_ROWS: { key: keyof Laptop; label: string }[] = [
  { key: 'current_price', label: 'Price' },
  { key: 'brand', label: 'Brand' },
  { key: 'specs', label: 'Specs' },
  { key: 'screen_size', label: 'Screen size' },
  { key: 'weight_kg', label: 'Weight' },
  { key: 'good_for', label: 'Good for' },
];

function formatValue(key: keyof Laptop, value: any) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'current_price') return `$${Number(value).toLocaleString()} CAD`;
  if (key === 'screen_size') return `${value}"`;
  if (key === 'weight_kg') return `${value} kg`;
  return String(value);
}

export default function SplitComparePage() {
  const [isUltra, setIsUltra] = useState<boolean | null>(null);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const session = sessionData.session;

      if (session) {
        const { data: profile } = await supabaseBrowser
          .from('profiles')
          .select('plan')
          .eq('id', session.user.id)
          .single();
        setIsUltra(profile?.plan === 'ultra');
      } else {
        setIsUltra(false);
      }

      try {
        const data = await fetchLaptops();
        setLaptops(data);
      } catch (err) {
        console.error('Failed to load laptops:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const left = laptops.find((l) => l.id === Number(leftId));
  const right = laptops.find((l) => l.id === Number(rightId));

  if (loading || isUltra === null) {
    return <div style={{ padding: '5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
  }

  if (!isUltra) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '5rem 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Split View is an Ultra feature</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Upgrade to Ultra to view two laptops side by side with full spec comparison.
        </p>
        <Link
          href="/premium"
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 8,
            background: '#9333ea',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Upgrade to Ultra
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Split View</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Compare two laptops side by side.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <select value={leftId} onChange={(e) => setLeftId(e.target.value)} style={selectStyle}>
          <option value="">Select laptop A…</option>
          {laptops.map((l) => (
            <option key={l.id} value={l.id}>{l.brand} {l.model}</option>
          ))}
        </select>
        <select value={rightId} onChange={(e) => setRightId(e.target.value)} style={selectStyle}>
          <option value="">Select laptop B…</option>
          {laptops.map((l) => (
            <option key={l.id} value={l.id}>{l.brand} {l.model}</option>
          ))}
        </select>
      </div>

      {left && right ? (
        <div
          style={{
            border: '1px solid var(--border-color, #e5e5e5)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-color, #e5e5e5)' }}>
            {[left, right].map((laptop, i) => (
              <div
                key={laptop.id}
                style={{
                  padding: 18,
                  textAlign: 'center',
                  borderLeft: i === 1 ? '1px solid var(--border-color, #e5e5e5)' : 'none',
                }}
              >
                {laptop.image_url && (
                  <img
                    src={laptop.image_url}
                    alt={`${laptop.brand} ${laptop.model}`}
                    style={{ width: '100%', maxWidth: 200, height: 140, objectFit: 'contain', margin: '0 auto 10px' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div style={{ fontWeight: 700, fontSize: 15 }}>{laptop.brand} {laptop.model}</div>
              </div>
            ))}
          </div>

          {SPEC_ROWS.map((row, i) => {
            const leftIsBetter =
              row.key === 'current_price' &&
              typeof left.current_price === 'number' &&
              typeof right.current_price === 'number' &&
              left.current_price < right.current_price;
            const rightIsBetter =
              row.key === 'current_price' &&
              typeof left.current_price === 'number' &&
              typeof right.current_price === 'number' &&
              right.current_price < left.current_price;

            return (
              <div
                key={row.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  background: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent',
                }}
              >
                {[left, right].map((laptop, j) => {
                  const isBetter = j === 0 ? leftIsBetter : rightIsBetter;
                  return (
                    <div
                      key={j}
                      style={{
                        padding: '10px 18px',
                        fontSize: 13,
                        borderLeft: j === 1 ? '1px solid var(--border-color, #e5e5e5)' : 'none',
                        fontWeight: isBetter ? 700 : 400,
                        color: isBetter ? '#16a34a' : 'var(--text-primary, #111)',
                      }}
                    >
                      <span style={{ color: '#888', marginRight: 6 }}>{row.label}:</span>
                      {formatValue(row.key, laptop[row.key])}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
          Pick two laptops above to compare.
        </p>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 13,
  border: '1px solid var(--border-color, #e5e5e5)',
  borderRadius: 8,
  background: 'var(--bg-secondary, #f7f7f7)',
  color: 'var(--text-primary, #111)',
  fontFamily: 'inherit',
  outline: 'none',
};