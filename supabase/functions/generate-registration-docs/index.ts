// Generate registration documents (DPO appointment letter, RoPA template,
// AI Act registration draft, Article 27 representative letter) for each
// jurisdiction in a registration order, using Lovable AI Gateway.
//
// Writes one row per (order, jurisdiction, document_type) into
// registration_documents with content_text. PDFs can be generated lazily by
// the existing generate-report-pdf function on download.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";

const DOCUMENT_TYPES = [
  { type: "dpo_appointment", title: "Data Protection Officer Appointment Letter", when: (r: any) => r.dpo_required },
  { type: "ropa", title: "Record of Processing Activities (RoPA) Template", when: () => true },
  { type: "ai_registration", title: "AI System Registration Draft", when: (r: any) => r.ai_registration_required },
  { type: "representative_letter", title: "Article 27 Representative Designation", when: (r: any) => r.representative_required },
  { type: "filing_instructions", title: "Filing Instructions & Checklist", when: () => true },
];

async function aiGenerate(prompt: string): Promise<string> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a privacy compliance expert drafting jurisdiction-specific filings. Always write in English regardless of the jurisdiction. Output clean plain text only — NO markdown symbols of any kind. Do not use #, ##, ###, **, *, _, backticks, or > for formatting. Structure documents with section headings on their own line in Title Case followed by a blank line, then prose or bullet items. For bullets, use the bullet character • followed by a space at the start of the line (not * or -). Use real authority names, real laws, and realistic but generic placeholder values like [Organization Name]. Do not invent statute numbers you are not sure of. No preamble, no chat, no translated text.",
        },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await supabase
      .from("registration_orders")
      .select("*")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) throw orderErr || new Error("Order not found");

    const codes: string[] = order.jurisdictions || [];
    const { data: reqs, error: reqsErr } = await supabase
      .from("jurisdiction_requirements")
      .select("*")
      .in("jurisdiction_code", codes.length ? codes : ["__none__"]);
    if (reqsErr) throw reqsErr;

    const orgSnapshot = order.organization_snapshot || {};
    const generated: Array<{ jurisdiction_code: string; document_type: string }> = [];

    for (const r of reqs || []) {
      const applicableDocs = DOCUMENT_TYPES.filter((docDef) => docDef.when(r));
      const results = await Promise.all(
        applicableDocs.map(async (docDef) => {
          const prompt = `Draft a "${docDef.title}" for the following organization, tailored to ${r.jurisdiction_name} (${r.law_name}, supervised by ${r.authority_name}).

Organization details:
${JSON.stringify(orgSnapshot, null, 2)}

Jurisdiction requirements:
- Authority: ${r.authority_name} (${r.authority_url || "N/A"})
- Law: ${r.law_name}
- Registration required: ${r.registration_required ? "Yes — " + (r.registration_threshold || "see threshold") : "No"}
- DPO required: ${r.dpo_required ? "Yes — " + (r.dpo_threshold || "") : "No"}
- AI registration: ${r.ai_registration_required ? "Yes — " + (r.ai_threshold || "") : "No"}
- Filing fee: ${r.filing_fee_cents ? (r.filing_fee_cents / 100) + " " + r.filing_currency : "Free"}
- Renewal: ${r.renewal_period_months ? r.renewal_period_months + " months" : "None"}
- Languages: ${(r.language_requirements || []).join(", ") || "English"}
- Notes: ${r.notes || "None"}

Output Markdown with clear headings, bullet points, and signature blocks where relevant. Use [Bracketed Placeholders] for fields the user must complete.`;
          const content = await aiGenerate(prompt);
          return { docDef, content };
        })
      );

      for (const { docDef, content } of results) {
        await supabase.from("registration_documents").insert({
          order_id,
          jurisdiction_code: r.jurisdiction_code,
          document_type: docDef.type,
          language: "en",
          content_text: content,
          generation_model: MODEL,
          status: "ready",
        });
        generated.push({ jurisdiction_code: r.jurisdiction_code, document_type: docDef.type });
      }
    }

    await supabase
      .from("registration_orders")
      .update({
        documents_generated_at: new Date().toISOString(),
        fulfillment_status: order.tier === "diy" ? "documents_ready" : "ready_to_file",
      })
      .eq("id", order_id);

    // Schedule first renewal date based on shortest jurisdiction renewal period
    try {
      await supabase.functions.invoke("schedule-registration-renewals", { body: { order_id } });
    } catch (e) {
      console.warn("schedule-registration-renewals failed:", (e as Error).message);
    }

    // Send delivery email (best-effort)
    try {
      await supabase.functions.invoke("send-registration-delivery-email", { body: { order_id } });
    } catch (e) {
      console.warn("send-registration-delivery-email failed:", (e as Error).message);
    }

    return new Response(JSON.stringify({ generated_count: generated.length, generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-registration-docs error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
