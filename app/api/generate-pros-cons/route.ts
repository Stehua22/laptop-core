import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { brand, model, specs, price, store } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a laptop reviewer. Give exactly 4 pros and 3 cons for this laptop based on its specs. Be specific.

Laptop: ${brand} ${model}
Price: $${price} CAD
Store: ${store}
Specs: ${specs}

Reply with ONLY this JSON, nothing else before or after:
{"pros":["pro1","pro2","pro3","pro4"],"cons":["con1","con2","con3"]}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ error: "API error" }, { status: 500 });
    }

    const data = await response.json();
    const text = (data.content?.[0]?.text ?? "").trim();

    // Extract JSON from response
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("No JSON found in response:", text);
      return NextResponse.json({ error: "Invalid response" }, { status: 500 });
    }

    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI generation error:", err);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
