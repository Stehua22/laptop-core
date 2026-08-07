import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Pull a lean catalog snapshot to ground recommendations.
    // Adjust column names below if they differ from your laptops table.
    const { data: laptops, error } = await supabase
      .from('laptops')
      .select('id, brand, model, price, screen_size, weight_kg, good_for')
      .order('price', { ascending: true })
      .limit(150);

    if (error) {
      console.error('Supabase fetch error:', error);
    }

    const catalogSummary = (laptops ?? [])
      .map(
        (l) =>
          `#${l.id} ${l.brand} ${l.model} - $${l.price} CAD, ${l.screen_size}", ${l.weight_kg}kg, good for: ${
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
      console.error('Anthropic API error:', errText);
      return NextResponse.json({ error: 'Assistant request failed' }, { status: 500 });
    }

    const data = await response.json();
    const reply =
      data.content?.find((block: { type: string }) => block.type === 'text')?.text ??
      "Sorry, I couldn't come up with a reply.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Assistant route error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
