import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const SYSTEM_PROMPT = `You are a privacy regulatory intelligence assistant for EndUserPrivacy.com, used by DPOs, General Counsel, Chief Privacy Officers, and privacy lawyers at multinational organizations.

Your knowledge covers: global privacy laws (GDPR, UK GDPR, CCPA/CPRA, LGPD, PIPL, PIPA, PDPA, DPDP Act, Privacy Act, POPIA, and 100+ others), all major data protection authorities (EDPB, ICO, CNIL, DPC, Garante, AEPD, FTC, state AGs, PDPC, PPC, PIPC, ANPD, OAIC, CAC, and others), enforcement history, AI governance regulation (EU AI Act, EDPB AI guidance), biometric privacy (BIPA, GDPR special categories), privacy litigation (BIPA class actions, VPPA, CIPA wiretapping), and cross-border data transfer mechanisms (SCCs, BCRs, adequacy decisions).

Response rules:
1. Always name the specific regulator, law, and jurisdiction — never generic statements
2. Cite article/section numbers for specific legal obligations when known (e.g. "GDPR Art. 83(4)")
3. Note when laws are in transition, pending, or have uncertain enforcement status
4. For deadlines: give the specific date and enforcement start if known
5. Never give legal advice — always note "verify against primary sources and consult qualified counsel"
6. Format with short, scannable paragraphs. Use bullet points only for lists of specific items.
7. Keep answers under 350 words unless the question genuinely requires depth
8. If asked about litigation, note that you have knowledge of major cases and trends but not real-time court filings`;

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
