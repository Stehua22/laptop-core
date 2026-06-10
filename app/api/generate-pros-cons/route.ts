import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    const { brand, model, specs, price, store } = body;

    if (!brand || !model) {
      return NextResponse.json({ error: "Missing brand or model" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No API key configured" }, { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a laptop reviewer. Give exactly 4 pros and 3 cons for this laptop. Be specific and concise.

Laptop: ${brand} ${model}
Price: $${price} CAD
Store: ${store}
Specs: ${specs}

Reply with ONLY valid JSON in this exact format:
{"pros":["pro1","pro2","pro3","pro4"],"cons":["con1","con2","con3"]}`,
          },
        ],
      }),
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error("Anthropic error:", rawText);
      return NextResponse.json({ error: "Anthropic API error: " + rawText }, { status: 500 });
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse Anthropic response:", rawText);
      return NextResponse.json({ error: "Bad Anthropic response" }, { status: 500 });
    }

    const text = (data?.content?.[0]?.text ?? "").trim();
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error("No JSON in Claude response:", text);
      return NextResponse.json({ error: "No JSON in response" }, { status: 500 });
    }

    const parsed = JSON.parse(match[0]);

    if (!Array.isArray(parsed.pros) || !Array.isArray(parsed.cons)) {
      return NextResponse.json({ error: "Invalid response format" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}