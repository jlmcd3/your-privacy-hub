// Free, fast, deterministic Stage A preview for the LI Assessment tool.
// No AI calls. Pulls precedents from li_tracker_entries, classifies the use case
// via keyword match, and returns a heuristic strength signal with rationale.
//
// DOC 73 §4 (R4, CEO-ratified 2026-08-25/26): the classifier is now the
// SHARED, single-source-of-truth `classifyLiaUseCase` also used by the paid
// report's precedent-class posture finding (lia-deliverables/
// precedent-class.ts) — one classifier, both surfaces, no drift between the
// free-preview signal and what the deterministic engine computes.
//
// LIA master review (2026-09-15, F03/F04):
//   - the classifier honours negation and the response carries the detected
//     terms, the negated terms and any tie (`classification`), so the page
//     shows the customer WHAT was detected and lets them correct it;
//   - `use_case_override` (a known class code the customer confirmed) is
//     applied to precedent selection and strength; the detected class is
//     still reported; the effective class is `use_case_code`;
//   - precedent selection and strength are the shared pure functions in
//     _shared/lia/lia-preview-selection.ts: jurisdictions normalised to a
//     token table, the pool actually shown is the pool rated, and the
//     method and its limits are returned (`precedent_selection`).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  classifyLiaUseCaseDetailed,
  isLiaUseCaseClass,
  USE_CASE_CODES,
  USE_CASE_LABELS,
} from "../_shared/lia/lia-use-case-classifier.ts";
import { heuristicLiaStrength, selectLiaPrecedents, type TrackerPrecedent } from "../_shared/lia/lia-preview-selection.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const description: string = (body.processing_description || "").trim();
    const dataCategories: string[] = Array.isArray(body.data_categories) ? body.data_categories : [];
    const jurisdictions: string[] = Array.isArray(body.jurisdictions) ? body.jurisdictions.filter((j: unknown) => typeof j === "string") : [];
    const relationship: string = body.relationship_type || "";
    const override: string | null = isLiaUseCaseClass(body.use_case_override) ? body.use_case_override : null;

    if (!description) {
      return new Response(
        JSON.stringify({ error: "processing_description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const detected = classifyLiaUseCaseDetailed(description);
    const useCase = override ?? detected.code;
    const useCaseLabel = USE_CASE_LABELS[useCase] ?? USE_CASE_LABELS.other;

    // Pull up to 80 recent precedents; selection is the shared pure function.
    const { data: allPrecedents } = await supabase
      .from("li_tracker_entries")
      .select("processing_activity, outcome, jurisdiction, dpa_source, summary, case_reference, last_confirmed")
      .order("last_confirmed", { ascending: false })
      .limit(80);

    const selection = selectLiaPrecedents({
      useCase,
      jurisdictions,
      pool: (allPrecedents ?? []) as TrackerPrecedent[],
      limit: 3,
    });

    const strength = heuristicLiaStrength({ useCase, dataCategories, relationship, selection });

    return new Response(
      JSON.stringify({
        use_case_code: useCase,
        use_case_label: useCaseLabel,
        // F03 — the evidence behind the class, for the customer to confirm or correct.
        classification: {
          detected_code: detected.code,
          detected_label: detected.label,
          matched_terms: detected.matched[detected.code] ?? [],
          negated_terms: Object.values(detected.negated).flat(),
          tie: detected.tie,
          candidates: detected.candidates.map((c) => ({ code: c, label: USE_CASE_LABELS[c] ?? c })),
          override_code: override,
          override_label: override ? USE_CASE_LABELS[override] ?? override : null,
        },
        // F03 — every class the customer may confirm instead, for the correction control.
        use_case_options: USE_CASE_CODES.map((c) => ({ code: c, label: USE_CASE_LABELS[c] ?? c })),
        precedents: selection.top.map((p) => ({
          processing_activity: p.processing_activity,
          outcome: p.outcome,
          jurisdiction: p.jurisdiction,
          dpa_source: p.dpa_source,
          summary: p.summary,
          case_reference: p.case_reference ?? null,
          // F04 — a decision from outside the selected jurisdictions is shown as context, and says so.
          relevance_note: selection.method.jurisdiction_fallback
            ? "From a jurisdiction you did not select; shown as cautionary context, not as your regulator's position."
            : null,
        })),
        precedents_matched: selection.matched.length,
        precedents_in_selected_jurisdictions: selection.preferred.length,
        // F04 — how the decisions were chosen and what was not compared.
        precedent_selection: selection.method,
        strength,
        disclaimer:
          "This is a free preliminary signal based on tracked precedents and rules. It is not a legal opinion. Decisions are matched on the activity described, not on the population, data or mechanism. Continue to the full assessment for an analysis of your specific facts under the three-part test.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("preview-li-assessment error:", e);
    return new Response(
      JSON.stringify({ error: "Preview failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
