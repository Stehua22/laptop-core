import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Stripe has moved to a new v2 Core Accounts API — the older
// stripe.accounts.create() (v1) is no longer accepted for new Connect
// integrations on this platform. We call the v2 REST endpoints directly
// with fetch rather than through the SDK, since v2 support varies by
// installed stripe-node version.
const STRIPE_VERSION = '2026-07-29.dahlia';

async function stripeV2(path: string, body: unknown) {
  const res = await fetch(`https://api.stripe.com/v2/core/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': STRIPE_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || `Stripe v2 API error (${res.status})`);
  }
  return json;
}

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

    // Create the v2 Account once, then reuse it on every subsequent
    // "finish setting up payouts" click. `recipient` configuration is
    // what lets this account receive transfers from our platform balance
    // — that's what our destination-charge checkout flow relies on.
    if (!connectId) {
      const account = await stripeV2('accounts', {
        contact_email: email,
        display_name: email,
        dashboard: 'express',
        identity: { country: 'ca' },
        defaults: {
          responsibilities: { fees_collector: 'application', losses_collector: 'application' },
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: { stripe_transfers: { requested: true } },
            },
          },
        },
        include: ['configuration.recipient', 'identity', 'requirements'],
      });
      connectId = account.id;
      await supabase.from('profiles').update({ stripe_connect_id: connectId }).eq('id', userId);
    }

    // Stripe-hosted onboarding flow via the v2 Account Links API.
    const accountLink = await stripeV2('account_links', {
      account: connectId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient'],
          refresh_url: `${req.nextUrl.origin}/refurbished/payouts?refresh=true`,
          return_url: `${req.nextUrl.origin}/refurbished/payouts?onboarding=complete`,
        },
      },
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    console.error('Connect onboarding error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}