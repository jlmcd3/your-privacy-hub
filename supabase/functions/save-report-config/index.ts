import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: cors });

  try {
    const { email, jurisdiction, topics, industry } = await req.json();
    if (!jurisdiction || !topics) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await sb.from("report_configs").insert({
      email: email || null,
      jurisdiction,
      topics,
      industry: industry || null,
      converted: false,
    });

    if (email) {
      const RESEND = Deno.env.get("RESEND_API_KEY");
      if (RESEND) {
        const topicList = Array.isArray(topics) ? topics.join(", ") : topics;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "EndUserPrivacy Intelligence <intelligence@enduserprivacy.com>",
            to: email,
            subject: "Your Privacy Intelligence preview is ready",
            text: [
              "Your EndUserPrivacy Intelligence Report preview is ready.",
              "",
              `Jurisdiction: ${jurisdiction}`,
              `Topics: ${topicList}`,
              `Industry: ${industry || "General"}`,
              "",
              "Built from this week's developments across 67 regulatory sources.",
              "",
              "Unlock the full analysis — compliance implications, enforcement",
              "patterns, and action items — for $20/month.",
              "",
              "Get My Report → https://enduserprivacy.com/get-intelligence",
              "",
              "Cancel anytime. Questions? hello@enduserprivacy.com",
            ].join("\n"),
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "internal" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
