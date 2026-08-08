'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is required, there's no session yet.
    if (data.session) {
      router.push('/tracker');
    } else {
      setCheckEmail(true);
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
          maxWidth: 360,
          background: 'var(--bg-primary, #fff)',
          color: 'var(--text-primary, #111)',
          border: '1px solid var(--border-color, #e5e5e5)',
          borderRadius: 14,
          padding: 28,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Create your account</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
          Free plan includes 5 Lapi chats a day.
        </p>

        {checkEmail ? (
          <p style={{ fontSize: 14 }}>
            Check your email to confirm your account, then{' '}
            <Link href="/login" style={{ color: 'var(--accent-color, #2563eb)' }}>
              log in
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-color, #e5e5e5)',
                marginBottom: 14,
                fontSize: 14,
                background: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary, #111)',
              }}
            />

            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-color, #e5e5e5)',
                marginBottom: 18,
                fontSize: 14,
                background: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary, #111)',
              }}
            />

            {error && (
              <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}

            <button
              type="submit"
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
                cursor: 'pointer',
              }}
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>
        )}

        <p style={{ fontSize: 13, marginTop: 16, textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent-color, #2563eb)' }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}