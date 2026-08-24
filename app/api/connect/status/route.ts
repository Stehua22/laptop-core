import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STRIPE_VERSION = '2026-07-29.dahlia';

// Actively checks a seller's v2 Account status directly with Stripe. We
// don't rely on webhooks for this — Stripe's v2 event names/timing have
// been inconsistent for this integration, so the payouts page just asks
// Stripe directly every time someone lands on it, which is the actual
// source of truth.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_connect_id) {
      return NextResponse.json({ ready: false, hasAccount: false });
    }

    const res = await fetch(
      `https://api.stripe.com/v2/core/accounts/${profile.stripe_connect_id}?include[]=configuration.recipient`,
      {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Stripe-Version': STRIPE_VERSION,
        },
      }
    );
    const account = await res.json();
    if (!res.ok) {
      throw new Error(account.error?.message || `Stripe v2 API error (${res.status})`);
    }

    const transfersStatus =
      account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
    const ready = transfersStatus === 'active';

    await supabase
      .from('profiles')
      .update({ stripe_connect_ready: ready })
      .eq('id', userId);

    return NextResponse.json({ ready, hasAccount: true });
  } catch (err: any) {
    console.error('Connect status check error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}