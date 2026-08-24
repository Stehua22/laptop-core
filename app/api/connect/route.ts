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

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();
    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', userId)
      .single();

    let connectId = profile?.stripe_connect_id as string | undefined;

    // Create the Connect Express account once, then reuse it on every
    // subsequent "finish setting up payouts" click.
    if (!connectId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'CA',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
      });
      connectId = account.id;
      await supabase.from('profiles').update({ stripe_connect_id: connectId }).eq('id', userId);
    }

    // Stripe-hosted onboarding flow — collects identity, bank details, etc.
    const accountLink = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: `${req.nextUrl.origin}/refurbished/payouts?refresh=true`,
      return_url: `${req.nextUrl.origin}/refurbished/payouts?onboarding=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    console.error('Connect onboarding error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}