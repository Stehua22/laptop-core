import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const FREE_DAILY_LIMIT = 5;

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { messages, userId } = (await req.json()) as {
      messages: ChatMessage[];
      userId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Login required to use the assistant' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_premium, chat_count, chat_count_date')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup failed:', profileError);
      return NextResponse.json({ error: 'profile_lookup_failed', detail: profileError?.message }, { status: 500 });
    }

    if (!profile.is_premium) {
      const today = new Date().toISOString().split('T')[0];
      const isNewDay = profile.chat_count_date !== today;
      const currentCount = isNewDay ? 0 : profile.chat_count ?? 0;

      if (currentCount >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          { error: 'daily_limit_reached', message: "You've hit today's 5-chat limit. Upgrade to Premium for unlimited chats." },
          { status: 429 }
        );
      }

      await supabase
        .from('profiles')
        .update({ chat_count: currentCount + 1, chat_count_date: today })
        .eq('id', userId);
    }

    const { data: laptops, error: laptopsError } = await supabase
      .from('laptops')
      .select('id, brand, model, retail_price, screen_size, weight_kg, good_for')
      .order('retail_price', { ascending: true })
      .limit(150);

    if (laptopsError) {
      console.error('Laptop catalog fetch failed:', laptopsError);
    }

    const catalogSummary = (laptops ?? [])
      .map(
        (l) =>
          `#${l.id} ${l.brand} ${l.model} - $${l.retail_price} CAD, ${l.screen_size}", ${l.weight_kg}kg, good for: ${
            Array.isArray(l.good_for) ? l.good_for.join('/') : l.good_for
          }`
      )
      .join('\n');

    const systemPrompt = `You are the LaptopCore assistant, helping users pick a laptop from the current catalog.
Be concise and friendly. Ask a clarifying question only if budget or use case is missing.
When recommending, cite 2-3 specific laptops from the catalog below by brand/model and price, and briefly say why each fits.
Never invent laptops that aren't in the catalog. Prices are in CAD.

Catalog:
${catalogSummary || '(catalog unavailable right now)'}`;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is missing at runtime');
      return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return NextResponse.json({ error: 'anthropic_call_failed', status: response.status, detail: errText }, { status: 500 });
    }

    const data = await response.json();
    const reply =
      data.content?.find((block: { type: string }) => block.type === 'text')?.text ??
      "Sorry, I couldn't come up with a reply.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('Assistant route error:', err);
    return NextResponse.json({ error: 'server_error', detail: err?.message }, { status: 500 });
  }
}
