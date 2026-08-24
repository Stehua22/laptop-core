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
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // --- Marketplace one-time purchase (listing checkout) ---
      if (session.mode === 'payment' && session.metadata?.listingId) {
        const { listingId, buyerId, sellerId, amount, platformFee } = session.metadata;

        // Idempotency: Stripe can retry webhook delivery, so bail if we've
        // already recorded this session.
        const { data: existingOrder } = await supabase
          .from('marketplace_orders')
          .select('id')
          .eq('stripe_checkout_session_id', session.id)
          .maybeSingle();

        if (!existingOrder) {
          await supabase.from('marketplace_orders').insert({
            listing_id: Number(listingId),
            buyer_id: buyerId,
            seller_id: sellerId,
            amount: Number(amount),
            platform_fee: Number(platformFee),
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
            status: 'paid',
          });

          await supabase
            .from('listings')
            .update({ status: 'sold' })
            .eq('id', Number(listingId));
        }
        break;
      }

      // --- Premium/Ultra subscription (existing flow, unchanged) ---
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan === 'ultra' ? 'ultra' : 'premium';

      if (userId) {
        await supabase
          .from('profiles')
          .update({
            is_premium: true,
            plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', userId);

        // --- Referral reward ---
        const { data: referredProfile } = await supabase
          .from('profiles')
          .select('referred_by')
          .eq('id', userId)
          .single();

        if (referredProfile?.referred_by) {
          const { data: existingReferral } = await supabase
            .from('referrals')
            .select('id')
            .eq('referred_id', userId)
            .maybeSingle();

          if (!existingReferral) {
            await supabase.from('referrals').insert({
              referrer_id: referredProfile.referred_by,
              referred_id: userId,
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
            });

            const { data: referrerProfile } = await supabase
              .from('profiles')
              .select('stripe_subscription_id')
              .eq('id', referredProfile.referred_by)
              .single();

            if (referrerProfile?.stripe_subscription_id && process.env.STRIPE_REFERRAL_COUPON_ID) {
              try {
                await stripe.subscriptions.update(referrerProfile.stripe_subscription_id, {
                  discounts: [{ coupon: process.env.STRIPE_REFERRAL_COUPON_ID }],
                });
                await supabase
                  .from('referrals')
                  .update({ status: 'rewarded' })
                  .eq('referred_id', userId);
              } catch (err) {
                console.error('Failed to apply referral coupon:', err);
              }
            }
          }
        }
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive = subscription.status === 'active';

      await supabase
        .from('profiles')
        .update({ is_premium: isActive })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    // Fires whenever a seller's Connect account changes — including as
    // they progress through onboarding. We flag them "ready" once Stripe
    // confirms they can actually receive payouts.
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      const isReady = !!account.details_submitted && !!account.charges_enabled;

      await supabase
        .from('profiles')
        .update({ stripe_connect_ready: isReady })
        .eq('stripe_connect_id', account.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}