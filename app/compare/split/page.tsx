'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Laptop = {
  id: string;
  name: string;
  brand: string;
  price: number;
  image_url?: string;
  screen_size?: number;
  weight_kg?: number;
  cpu?: string;
  gpu?: string;
  ram_gb?: number;
  storage_gb?: number;
  good_for?: string[];
};

const SPEC_ROWS: { key: keyof Laptop; label: string }[] = [
  { key: 'price', label: 'Price' },
  { key: 'brand', label: 'Brand' },
  { key: 'cpu', label: 'CPU' },
  { key: 'gpu', label: 'GPU' },
  { key: 'ram_gb', label: 'RAM' },
  { key: 'storage_gb', label: 'Storage' },
  { key: 'screen_size', label: 'Screen size' },
  { key: 'weight_kg', label: 'Weight' },
];

function formatValue(key: keyof Laptop, value: any) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'price') return `$${Number(value).toLocaleString()} CAD`;
  if (key === 'ram_gb') return `${value} GB`;
  if (key === 'storage_gb') return `${value} GB`;
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

      const { data } = await supabaseBrowser
        .from('laptops')
        .select('id, name, brand, price, image_url, screen_size, weight_kg, cpu, gpu, ram_gb, storage_gb, good_for')
        .order('name');
      setLaptops(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const left = laptops.find((l) => l.id === leftId);
  const right = laptops.find((l) => l.id === rightId);

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
        <select
          value={leftId}
          onChange={(e) => setLeftId(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select laptop A…</option>
          {laptops.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select
          value={rightId}
          onChange={(e) => setRightId(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select laptop B…</option>
          {laptops.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
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
          {/* Header row: images + names */}
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
                    alt={laptop.name}
                    style={{ width: '100%', maxWidth: 200, height: 140, objectFit: 'contain', margin: '0 auto 10px' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div style={{ fontWeight: 700, fontSize: 15 }}>{laptop.name}</div>
              </div>
            ))}
          </div>

          {/* Spec rows */}
          {SPEC_ROWS.map((row, i) => (
            <div
              key={row.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent',
              }}
            >
              {[left, right].map((laptop, j) => {
                const leftVal = formatValue(row.key, left[row.key]);
                const rightVal = formatValue(row.key, right[row.key]);
                const isBetter =
                  row.key === 'price' && typeof left.price === 'number' && typeof right.price === 'number'
                    ? (j === 0 ? left.price < right.price : right.price < left.price)
                    : false;
                const val = j === 0 ? leftVal : rightVal;
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
                    {val}
                  </div>
                );
              })}
            </div>
          ))}
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