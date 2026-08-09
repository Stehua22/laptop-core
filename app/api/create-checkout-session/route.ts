import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
});

export async function POST(req: NextRequest) {
  try {
    const { userId, email, plan } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    const normalizedPlan = plan === 'ultra' ? 'ultra' : 'premium';
    const priceId =
      normalizedPlan === 'ultra'
        ? process.env.STRIPE_PRICE_ID_ULTRA!
        : process.env.STRIPE_PRICE_ID_PREMIUM!;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan: normalizedPlan,
      },
      success_url: `${req.nextUrl.origin}/tracker?premium=success`,
      cancel_url: `${req.nextUrl.origin}/tracker?premium=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout session error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}