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
  }

  return NextResponse.json({ received: true });
}
