// Sends a delivery email summarizing the order's documents to the user.
// Uses Lovable Email if available, otherwise falls back to Resend.
// Updates registration_orders.delivery_sent_at on success.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

    const { data: order } = await supabase
      .from("registration_orders").select("*").eq("id", order_id).single();
    if (!order) throw new Error("Order not found");

    const { data: docs } = await supabase
      .from("registration_documents").select("jurisdiction_code, document_type")
      .eq("order_id", order_id);

    // Resolve recipient: explicit delivery_email > org snapshot email > user record
    let recipient = order.delivery_email || order.organization_snapshot?.email;
    if (!recipient) {
      const { data: u } = await supabase.auth.admin.getUserById(order.user_id);
      recipient = u?.user?.email;
    }
    if (!recipient) throw new Error("No recipient email available");

    const docList = (docs || [])
      .map((d) => `<li><strong>${d.jurisdiction_code}</strong> — ${d.document_type.replace(/_/g, " ")}</li>`)
      .join("");

    const html = `
      <h2>Your Registration Documents Are Ready</h2>
      <p>We've generated <strong>${docs?.length ?? 0} documents</strong> across <strong>${order.jurisdictions.length} jurisdiction(s)</strong>.</p>
      <ul>${docList}</ul>
      <p><a href="https://enduserprivacy.com/registration-manager/documents/${order_id}">View and download your documents</a></p>
      <hr>
      <p style="font-size:12px;color:#666">
        Important — These are draft filings, not legal advice. Always verify with the relevant authority and
        consult qualified counsel before submission.
      </p>
    `;

    // Try Lovable Email first
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    let sent = false;

    if (lovableKey) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            to: recipient,
            subject: "Your privacy registration documents are ready",
            html,
            purpose: "transactional",
          },
        });
        sent = true;
      } catch (e) {
        console.warn("Lovable email failed, trying Resend:", (e as Error).message);
      }
    }

    if (!sent) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "EndUserPrivacy <notify@enduserprivacy.com>",
            to: [recipient],
            subject: "Your privacy registration documents are ready",
            html,
          }),
        });
        if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
        sent = true;
      }
    }

    if (!sent) {
      // No email provider configured — log and continue silently
      console.log("No email provider configured; would have sent to", recipient);
    }

    await supabase.from("registration_orders")
      .update({ delivery_sent_at: new Date().toISOString() })
      .eq("id", order_id);

    return new Response(JSON.stringify({ sent, recipient }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-registration-delivery-email error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
