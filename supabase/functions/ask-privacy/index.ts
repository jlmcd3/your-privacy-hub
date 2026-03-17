import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const SYSTEM_PROMPT = `You are a privacy regulatory intelligence assistant for EndUserPrivacy.com.
You have deep knowledge of global privacy laws (GDPR, CCPA, LGPD, PIPL, PIPA, PDPA, etc.),
regulators (EDPB, ICO, CNIL, FTC, etc.), and enforcement actions.
Answer questions concisely and accurately. Always note when laws are being updated or rules are pending.
Never give legal advice — always recommend users verify against primary sources or consult legal counsel.
Format responses with clear structure using short paragraphs. Keep answers under 300 words unless detail is specifically needed.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { messages } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await response.json();
    const answer = data.content?.[0]?.text ?? "Sorry, I couldn't process that question.";

    return new Response(JSON.stringify({ answer }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ answer: "Something went wrong. Please try again." }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
