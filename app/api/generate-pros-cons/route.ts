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
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `You are a laptop reviewer. Based on the specs below, generate exactly 4 pros and 3 cons for this laptop. Be specific and honest based on the specs.

Laptop: ${brand} ${model}
Price: $${price} CAD
Store: ${store}
Specs: ${specs}

Respond ONLY with valid JSON in this exact format, no extra text:
{
  "pros": ["pro 1", "pro 2", "pro 3", "pro 4"],
  "cons": ["con 1", "con 2", "con 3"]
}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI generation error:", err);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}