// Free, fast, deterministic Stage A preview for the LI Assessment tool.
// No AI calls. Pulls precedents from li_tracker_entries, classifies the use case
// via keyword match, and returns a heuristic strength signal with rationale.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USE_CASE_KEYWORDS: Record<string, string[]> = {
  direct_marketing: ["marketing", "promotional", "newsletter", "campaign", "outreach", "email"],
  fraud_prevention: ["fraud", "abuse", "risk scor", "anti-money", "aml", "kyc"],
  employee_monitoring: ["employee", "worker", "workplace", "staff", "monitor"],
  behavioral_advertising: ["behavioural", "behavioral", "advertis", "targeting", "tracking", "profiling for ads"],
  research_analytics: ["research", "analytics", "statistics", "insights", "measurement"],
  it_security: ["security", "intrusion", "logging", "audit", "network", "cyber"],
  contractual_administration: ["account", "billing", "service delivery", "support", "customer"],
  product_improvement: ["improve", "develop", "feature", "personalis", "personaliz", "recommend"],
};

const USE_CASE_LABELS: Record<string, string> = {
  direct_marketing: "Direct marketing",
  fraud_prevention: "Fraud prevention",
  employee_monitoring: "Employee monitoring",
  behavioral_advertising: "Behavioural advertising",
  research_analytics: "Research & analytics",
  it_security: "IT security",
  contractual_administration: "Contractual administration",
  product_improvement: "Product improvement",
  other: "General processing",
};

function classifyUseCase(description: string): string {
  const text = description.toLowerCase();
  let best = "other";
  let bestScore = 0;
  for (const [code, keywords] of Object.entries(USE_CASE_KEYWORDS)) {
    const score = keywords.reduce((n, kw) => n + (text.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = code;
    }
  }
  return best;
}

function heuristicStrength(input: {
  useCase: string;
  dataCategories: string[];
  relationship: string;
  precedents: any[];
}): { rating: "Strong" | "Moderate" | "Weak" | "High Risk"; rationale: string } {
  const { useCase, dataCategories, relationship, precedents } = input;
  const accepted = precedents.filter((p) => p.outcome === "accepted").length;
  const rejected = precedents.filter((p) => p.outcome === "rejected").length;
  const hasSpecialCategory =
    dataCategories.includes("Special category data") ||
    dataCategories.includes("Health or medical data") ||
    dataCategories.includes("Biometric data");

  // Hard "high risk" calls
  if (hasSpecialCategory) {
    return {
      rating: "High Risk",
      rationale:
        "Special category data generally cannot be processed under legitimate interest alone — Article 9 GDPR requires an additional condition.",
    };
  }
  if (useCase === "behavioral_advertising") {
    return {
      rating: "Weak",
      rationale:
        "Regulators have consistently held that behavioural advertising requires consent under ePrivacy and is rarely defensible under legitimate interest.",
    };
  }
  if (useCase === "employee_monitoring" && relationship.toLowerCase().includes("employee")) {
    return {
      rating: "Weak",
      rationale:
        "Power imbalance in the employment relationship makes the balancing test difficult to satisfy without strong safeguards.",
    };
  }

  // Precedent-driven
  if (accepted >= 2 && rejected === 0) {
    return {
      rating: "Strong",
      rationale: `${accepted} closely analogous decisions were accepted by regulators and none were rejected.`,
    };
  }
  if (rejected > accepted) {
    return {
      rating: "Weak",
      rationale: `${rejected} analogous decisions were rejected by regulators against ${accepted} accepted — the precedent landscape is unfavourable.`,
    };
  }
  if (accepted >= 1 || precedents.length >= 1) {
    return {
      rating: "Moderate",
      rationale: "Mixed or limited precedent — outcome depends heavily on the necessity and balancing analysis.",
    };
  }
  return {
    rating: "Moderate",
    rationale:
      "No directly analogous decisions in the tracked database. Strength will depend on the necessity and balancing assessment in the full report.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const description: string = (body.processing_description || "").trim();
    const dataCategories: string[] = Array.isArray(body.data_categories) ? body.data_categories : [];
    const jurisdictions: string[] = Array.isArray(body.jurisdictions) ? body.jurisdictions : [];
    const relationship: string = body.relationship_type || "";

    if (!description) {
      return new Response(
        JSON.stringify({ error: "processing_description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const useCase = classifyUseCase(description);
    const useCaseLabel = USE_CASE_LABELS[useCase];

    // Pull up to 40 recent precedents and filter by use-case keywords
    const { data: allPrecedents } = await supabase
      .from("li_tracker_entries")
      .select("processing_activity, outcome, jurisdiction, dpa_source, summary, case_reference, last_confirmed")
      .order("last_confirmed", { ascending: false })
      .limit(80);

    const keywords = USE_CASE_KEYWORDS[useCase] || [];
    const matched = (allPrecedents || []).filter((p: any) => {
      const a = (p.processing_activity || "").toLowerCase();
      return keywords.some((k) => a.includes(k));
    });

    // Prefer matching jurisdictions if the user picked any
    const preferred = jurisdictions.length > 0
      ? matched.filter((p: any) => jurisdictions.some((j) => (p.jurisdiction || "").toLowerCase().includes(j.toLowerCase().split(" ")[0])))
      : [];

    const top = (preferred.length >= 3 ? preferred : matched).slice(0, 3);

    const strength = heuristicStrength({
      useCase,
      dataCategories,
      relationship,
      precedents: matched,
    });

    return new Response(
      JSON.stringify({
        use_case_code: useCase,
        use_case_label: useCaseLabel,
        precedents: top,
        precedents_matched: matched.length,
        strength,
        disclaimer:
          "This is a free preliminary signal based on tracked precedents and rules. It is not a legal opinion. Continue to the full assessment for an analysis of your specific facts under the three-part test.",
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
