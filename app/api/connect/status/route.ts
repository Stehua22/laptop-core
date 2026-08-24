import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Actively checks a seller's Connect account status directly with Stripe,
// instead of waiting for a webhook event. This is what the payouts page
// calls right after someone returns from onboarding, so status shows up
// immediately and correctly regardless of which webhook event format
// Stripe happens to send for this account.
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

    const account = await stripe.accounts.retrieve(profile.stripe_connect_id);
    const ready = !!account.details_submitted && !!account.charges_enabled;

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