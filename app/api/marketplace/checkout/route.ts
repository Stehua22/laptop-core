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

const PLATFORM_FEE_PCT = 0.08; // LaptopCore's 8% cut

export async function POST(req: NextRequest) {
  try {
    const { listingId, buyerId, buyerEmail } = await req.json();
    if (!listingId || !buyerId || !buyerEmail) {
      return NextResponse.json({ error: 'Missing listingId, buyerId, or buyerEmail' }, { status: 400 });
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    if (listing.status !== 'active') {
      return NextResponse.json({ error: 'This listing is no longer available' }, { status: 400 });
    }
    if (listing.seller_id === buyerId) {
      return NextResponse.json({ error: "You can't buy your own listing" }, { status: 400 });
    }

    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('stripe_connect_id, stripe_connect_ready')
      .eq('id', listing.seller_id)
      .single();

    if (!sellerProfile?.stripe_connect_id || !sellerProfile.stripe_connect_ready) {
      return NextResponse.json({ error: 'This seller has not finished setting up payouts yet' }, { status: 400 });
    }

    const amountCents = Math.round(listing.price * 100);
    const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PCT);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: buyerEmail,
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: `${listing.brand} ${listing.model}`,
              description: listing.specs ?? undefined,
              images: listing.images?.length ? [listing.images[0]] : undefined,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: sellerProfile.stripe_connect_id,
        },
      },
      metadata: {
        listingId: String(listingId),
        buyerId,
        sellerId: listing.seller_id,
        amount: String(listing.price),
        platformFee: String(platformFeeCents / 100),
      },
      success_url: `${req.nextUrl.origin}/refurbished/${listingId}?purchase=success`,
      cancel_url: `${req.nextUrl.origin}/refurbished/${listingId}?purchase=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Marketplace checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}