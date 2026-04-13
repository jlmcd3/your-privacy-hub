import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SEED_ROWS = [
  { processing_activity: "Fraud prevention for transactions", outcome: "accepted", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Strong LI candidate where data sharing and logic are clearly disclosed and proportionate." },
  { processing_activity: "Network and information security / cybersecurity", outcome: "accepted", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Expressly recognized by EDPB as a common legitimate interest area." },
  { processing_activity: "Internal administrative transfers within a corporate group", outcome: "accepted", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Specifically recognized in GDPR and EDPB materials assuming ordinary safeguards are met." },
  { processing_activity: "Basic anti-abuse and account security", outcome: "accepted", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Good LI candidate where use is genuinely tied to platform or network security." },
  { processing_activity: "Direct marketing to existing customers", outcome: "conditional", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Potentially viable under LI, but ePrivacy and national direct-marketing rules can still block the practice." },
  { processing_activity: "Internal analytics (low-risk)", outcome: "conditional", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Often acceptable if low-risk, narrowly scoped, and not used for profiling." },
  { processing_activity: "Video surveillance for security purposes", outcome: "conditional", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Security can be a legitimate interest, but camera placement, scope, retention, and notice are decisive." },
  { processing_activity: "Creditworthiness assessment", outcome: "conditional", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Recognized as possible LI in some decisions, but analysis is fact-specific and may overlap with Article 22." },
  { processing_activity: "Behavioral advertising and profiling across services", outcome: "rejected", signal_type: "Enforcement Decision", dpa_source: "EDPB", jurisdiction: "EU", summary: "EDPB digest points to Meta behavioral advertising as failing necessity because less intrusive alternatives existed." },
  { processing_activity: "Cross-site tracking for ad targeting", outcome: "rejected", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Where LI arguments struggle most, especially once ePrivacy rules are layered in." },
  { processing_activity: "Large-scale scraping or repurposing of public personal data", outcome: "rejected", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Even if data is public, LI requires a precise interest, strict necessity, and a favorable balancing test." },
  { processing_activity: "Processing involving children's data", outcome: "conditional", signal_type: "Official Guidance", dpa_source: "EDPB", jurisdiction: "EU", summary: "Article 6(1)(f) itself flags children as requiring special protection in the balancing test." },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  const today = new Date().toISOString().split("T")[0];
  let inserted = 0, updated = 0;

  for (const row of SEED_ROWS) {
    const { data: existing } = await supabase
      .from("li_tracker_entries")
      .select("id")
      .eq("processing_activity", row.processing_activity)
      .eq("dpa_source", row.dpa_source)
      .maybeSingle();

    if (existing) {
      await supabase.from("li_tracker_entries").update({ last_confirmed: today, updated_at: new Date().toISOString() }).eq("id", existing.id);
      updated++;
    } else {
      await supabase.from("li_tracker_entries").insert({ ...row, confidence: "high", source_article_id: null, last_confirmed: today });
      inserted++;
    }
  }

  return new Response(JSON.stringify({ inserted, updated, total: SEED_ROWS.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
