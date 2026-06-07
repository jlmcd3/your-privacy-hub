// Retrieve → Generate → Validate pipeline for CPPA Risk Assessment.
// Preserves existing cppa_assessments I/O (pending → processing → complete/error).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- intake key map: real storage keys used by CPPARiskAssessment.tsx ----
const INTAKE_KEYS = {
  q1: "q1_revenue",
  q2: "q2_consumers",
  q4: "q4_pi_categories",
  q5: "q5_sell_share",
  q15: "q15_sensitive_pi",
  q18: "q18_admt_use",
} as const;

const HIGH_REVENUE = new Set(["$100M–$500M", "Over $500M"]);
const HIGH_VOLUME = new Set(["1–10 million", "Over 10 million"]);
const SENSITIVE_CATEGORIES = new Set([
  "Health or medical information",
  "Biometric information",
  "Genetic data",
  "Racial or ethnic origin",
  "Religious or philosophical beliefs",
  "Union membership",
  "Sexual orientation or gender identity",
  "Citizenship or immigration status",
  "Financial information",
  "Geolocation data",
  "Children's data (under 16)",
]);

function deriveTopics(intake: any): string[] {
  // Assert required keys exist
  for (const [alias, key] of Object.entries(INTAKE_KEYS)) {
    if (!(key in intake)) {
      throw new Error(`intake schema drift: expected key ${alias} (${key})`);
    }
  }
  const topics = new Set<string>([
    "thresholds", "consumer-rights", "notice-at-collection", "privacy-policy",
    "notice-content", "enforcement", "breach", "private-right-of-action",
  ]);
  const q1 = intake[INTAKE_KEYS.q1];
  const q2 = intake[INTAKE_KEYS.q2];
  const q4: string[] = Array.isArray(intake[INTAKE_KEYS.q4]) ? intake[INTAKE_KEYS.q4] : [];
  const q5 = intake[INTAKE_KEYS.q5];
  const q15 = intake[INTAKE_KEYS.q15];
  const q18 = intake[INTAKE_KEYS.q18];

  if (q4.some((c) => SENSITIVE_CATEGORIES.has(c))) {
    topics.add("sensitive-pi"); topics.add("limit-sensitive-pi");
  }
  if (q15 === "Yes") {
    topics.add("sensitive-pi"); topics.add("risk-assessment");
  }
  const sells = typeof q5 === "string" && /sell|share|both/i.test(q5) && !/^no/i.test(q5);
  if (sells) {
    ["opt-out-sale-sharing","opt-out-preference-signals","gpc","opt-out-link",
     "third-party","contract-requirements"].forEach((t) => topics.add(t));
  }
  if (q18 === "Yes" || q18 === "In evaluation") {
    ["admt","significant-decision","profiling","pre-use-notice","risk-assessment"]
      .forEach((t) => topics.add(t));
  }
  if (sells || HIGH_VOLUME.has(q2) || HIGH_REVENUE.has(q1)) {
    topics.add("cybersecurity-audit");
  }
  return Array.from(topics);
}

async function callClaude(model: string, system: string, user: string, maxTokens: number, label = "claude"): Promise<string> {
  const t0 = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model, max_tokens: maxTokens, system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const elapsed = Date.now() - t0;
  if (!res.ok) {
    const t = await res.text();
    console.error(`[${label}] ${model} HTTP ${res.status} in ${elapsed}ms: ${t.slice(0, 300)}`);
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const d = await res.json();
  console.log(`[${label}] ${model} ok in ${elapsed}ms, output ~${d.usage?.output_tokens ?? "?"} tokens`);
  return d.content?.[0]?.text || "";
}

function tryParseJson(text: string): any | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function generateOrRetry(model: string, system: string, user: string, maxTokens: number, label = "claude") {
  let text = await callClaude(model, system, user, maxTokens, label);
  let parsed = tryParseJson(text);
  if (!parsed) {
    console.warn(`[${label}] first parse failed, retrying once`);
    text = await callClaude(model, system, user, maxTokens, label + "-retry");
    parsed = tryParseJson(text);
  }
  return { parsed, rawText: text };
}


const GENERATION_SYSTEM =
`You are a senior California privacy compliance analyst. You produce a structured CPPA/CCPA risk assessment. You are NOT a lawyer and you give no legal advice; you map the organisation's intake answers to compliance gaps and ground every legal statement in the authorities provided to you.

ABSOLUTE GROUNDING RULES (non-negotiable):
- The RETRIEVED AUTHORITIES block below is the ONLY permitted source of statutory and regulatory citations. Every citation you use must appear VERBATIM in that block's "citation" fields.
- The RETRIEVED DEADLINES block is the ONLY permitted source of dates and compliance deadlines. Never state a date, effective date, or deadline that is not in that block. Do not compute dates.
- If you cannot support a statement with a retrieved authority or deadline, you must either omit it or mark it "Requires attorney review" — never fill the gap from your own knowledge.
- The ENFORCEMENT CONTEXT block is ILLUSTRATIVE and NON-BINDING. You may reference it to show enforcement focus, but never cite it as the legal basis for an obligation, and never present an FTC matter as CPPA precedent.

CALIFORNIA-SPECIFIC ACCURACY RULES (apply only as the retrieved text supports; do not import other regimes):
- CCPA/CPRA is NOT a GDPR-style "lawful basis" regime. Do not describe consent as a "lawful basis."
- Do NOT import any non-California rule. In particular, do not state a 72-hour breach-notification rule — California breach timing is governed by Cal. Civ. Code § 1798.82's "most expedient time possible / without unreasonable delay" standard, and only if that section is in the retrieved set.
- There is NO general consumer right to "appeal" a denied CCPA request. A right to appeal exists ONLY in the ADMT context for significant decisions, and only if a retrieved authority states it. Do not assert a general appeals right.
- CPRA removed the mandatory cure period that existed under the original CCPA. Do not state that a business is entitled to a cure period unless a retrieved authority says so.
- "Significant decision" for ADMT has a specific definition in the retrieved definitions section. Apply that definition. The final ADMT regulations EXCLUDE behavioural advertising / audience segmentation from "significant decisions." Do NOT characterise advertising or audience segmentation as ADMT for significant decisions unless the retrieved definition's text includes it.
- Statutes and regulations are both binding; where the retrieved item has binding=false (guidance), treat it as persuasive only and label it as guidance, not a requirement.

Determine CCPA/CPRA applicability and any audit/assessment scope from the retrieved THRESHOLD text, not from assumption.

Return ONLY valid JSON in the schema given in the user message. No markdown, no preamble.`;

const VALIDATION_SYSTEM =
`You are an independent California privacy law citation validator. You receive a draft CPPA risk assessment and the exact set of legal authorities that were available to its author. Your job is to check, for every legal citation and every dated deadline in the draft, whether the provided authorities actually support it.

RULES:
- You may ONLY validate against the PROVIDED AUTHORITIES. You have no other source of law. Do not use your own legal knowledge to either approve or "correct" a citation.
- A proposed corrected_citation is allowed ONLY if that citation string exists in the provided authorities. If the correct authority is not in the provided set, do not invent it — mark the item Not-in-corpus and recommend attorney review.
- Judge support by reading the authority's TEXT, not just its title. If the cited authority does not actually establish the proposition, mark it Unsupported or Overstated even if the citation "looks" right.
- CONTRADICTION CHECK (critical): a citation can be real and still be MISAPPLIED. For every finding, read the cited authority's text and check whether the finding's CONCLUSION is actually consistent with that text. If the conclusion is contradicted or excluded by the very authority cited, classify it "Contradicted-by-authority" even though the citation exists and is on-topic. The clearest example: a finding that characterises behavioural advertising or audience segmentation as an ADMT "significant decision" while citing the definitions section whose text EXCLUDES advertising from "significant decision" — the citation is real, the conclusion is wrong; flag it. Apply the same logic to any finding whose conclusion the cited text does not support or affirmatively excludes.
- Specifically check for these known error patterns and flag any that appear: a citation used for a proposition it does not support; a date or deadline not present in the provided deadlines; GDPR concepts ("lawful basis", "72 hours") applied to California law; a general right to appeal a CCPA request; an entitlement to a cure period; advertising/audience segmentation characterised as an ADMT "significant decision".

Return ONLY valid JSON, no markdown:
{
  "citation_ledger": [ {
    "statement": "the proposition as written in the draft",
    "citation": "the citation the draft attached",
    "classification": "Supported|Partially supported|Unsupported|Not-in-corpus|Overstated|Contradicted-by-authority",
    "corrected_citation": "a citation FROM THE PROVIDED AUTHORITIES, or null",
    "note": "one sentence explaining the classification"
  } ],
  "requires_attorney_review": ["short description of each item needing human legal review"],
  "summary": "one sentence on overall citation reliability of this draft"
}`;

function buildAuthoritiesBlock(authorities: any[]): string {
  return authorities.map((a, i) =>
    `[A${i + 1}] ${a.citation} — ${a.title}\nBINDING: ${a.binding}\nSUMMARY: ${a.plain_summary ?? ""}\nTEXT: ${a.full_text ?? "(summary only)"}`,
  ).join("\n\n");
}
function buildDeadlinesBlock(deadlines: any[]): string {
  if (!deadlines?.length) return "(none)";
  return deadlines.map((d, i) =>
    `[D${i + 1}] ${d.obligation} | trigger: ${d.trigger_condition} | effective: ${d.effective_date ?? "—"} | deadline: ${d.compliance_deadline ?? "—"} | tier: ${d.revenue_tier ?? "—"} | basis: ${d.primary_authority_citation}`,
  ).join("\n");
}
function buildValidationAuthBlock(authorities: any[]): string {
  // Cap each authority text to keep the validator prompt within token budget
  return authorities.map((a) => {
    const txt = (a.full_text ?? a.plain_summary ?? "").slice(0, 6000);
    return `${a.citation} — ${a.title}\nTEXT: ${txt}`;
  }).join("\n\n");
}
function buildValidationDeadlineBlock(deadlines: any[]): string {
  if (!deadlines?.length) return "(none)";
  return deadlines.map((d) =>
    `${d.obligation}: effective ${d.effective_date ?? "—"}, deadline ${d.compliance_deadline ?? "—"}, tier ${d.revenue_tier ?? "—"}, basis ${d.primary_authority_citation}`,
  ).join("\n");
}

async function getEnforcementContext(sector?: string) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/get-enforcement-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
      body: JSON.stringify({ tool: "CPPA", jurisdictions: ["California","United States","US-CA"], sector, limit: 6 }),
    });
    if (!r.ok) return { text: "", results: [] };
    const ec = await r.json();
    const results = ec?.results ?? [];
    const text = results.map((x: any, i: number) =>
      `[E${i + 1}] ${x.regulator} v ${x.subject} (${x.decision_date ?? "n.d."}): ${x.violation ?? x.key_compliance_failure ?? ""} | Fine: ${x.fine_amount ?? "n/a"}`,
    ).join("\n");
    return { text, results };
  } catch { return { text: "", results: [] }; }
}

function mergeValidation(report: any, validation: any, corpusCitations: Set<string>) {
  const ledger = Array.isArray(validation?.citation_ledger) ? validation.citation_ledger : [];
  const attorneyReview: string[] = Array.isArray(validation?.requires_attorney_review)
    ? [...validation.requires_attorney_review] : [];

  let hasBlocking = false;

  for (const entry of ledger) {
    const cls = entry?.classification ?? "";
    const cite = entry?.citation ?? "";
    const note = entry?.note ?? "";

    // Strip validator-proposed citations not in corpus
    if (entry?.corrected_citation && !corpusCitations.has(entry.corrected_citation)) {
      entry.corrected_citation = null;
      entry.note = `${note} (proposed correction dropped — not in corpus)`.trim();
    }

    if (cls === "Unsupported" || cls === "Not-in-corpus") {
      hasBlocking = true;
      // Blank that citation across domains and top_risks
      blankCitation(report, cite);
      attorneyReview.push(`Unsupported citation removed: "${cite}" — ${note}`);
    } else if (cls === "Overstated" || cls === "Partially supported") {
      attachNote(report, cite, note);
      attorneyReview.push(`Review citation "${cite}": ${note}`);
    } else if (cls === "Contradicted-by-authority") {
      hasBlocking = true;
      flagContradiction(report, cite, note, entry?.statement ?? "");
      attorneyReview.push(`Contradicted by authority: "${entry?.statement ?? cite}" — ${note}`);
    }
  }

  report.citation_ledger = ledger;
  report.validation_summary = validation?.summary ?? null;
  report.requires_attorney_review = Array.from(new Set(attorneyReview));
  if (hasBlocking) {
    report.accuracy_caveat = "Some legal citations or conclusions in this draft could not be verified against the corpus and have been flagged for attorney review.";
  }
  return report;
}

function blankCitation(report: any, citation: string) {
  if (!citation) return;
  for (const d of report?.domains ?? []) {
    if (typeof d.regulatory_basis === "string" && d.regulatory_basis.includes(citation)) {
      d.regulatory_basis = d.regulatory_basis.replace(citation, "[removed — unsupported]");
      d.attorney_review_needed = true;
      d.confidence_level = "Low";
    }
  }
}
function attachNote(report: any, citation: string, note: string) {
  if (!citation) return;
  for (const d of report?.domains ?? []) {
    if (typeof d.regulatory_basis === "string" && d.regulatory_basis.includes(citation)) {
      d.finding = `${d.finding ?? ""}\n\n[Validator note: ${note}]`.trim();
      d.attorney_review_needed = true;
      if (d.confidence_level !== "Low") d.confidence_level = "Medium";
    }
  }
}
function flagContradiction(report: any, citation: string, note: string, statement: string) {
  const warn = `⚠ WARNING — Contradicted by cited authority: ${note}`;
  for (const d of report?.domains ?? []) {
    const matches = (typeof d.regulatory_basis === "string" && d.regulatory_basis.includes(citation))
      || (typeof d.finding === "string" && statement && d.finding.includes(statement.slice(0, 40)));
    if (matches) {
      d.finding = `${warn}\n\n${d.finding ?? ""}`;
      d.confidence_level = "Low";
      d.attorney_review_needed = true;
    }
  }
}

// Background pipeline — wrapped so we can fire-and-forget via EdgeRuntime.waitUntil.
// Opus validation alone can take 60-120s, plus generation. The HTTP edge has a
// 150s idle ceiling, so we return 202 immediately and let the client poll the row.
async function runPipeline(assessment_id: string) {
  try {
    const { data: row } = await supabase
      .from("cppa_assessments").select("*").eq("id", assessment_id).single();
    if (!row) return;

    await supabase.from("cppa_assessments").update({ status: "processing" }).eq("id", assessment_id);

    const intake = row.intake_data ?? {};

    // STAGE 0 — Topic derivation
    let topics: string[];
    try { topics = deriveTopics(intake); }
    catch (e: any) {
      await supabase.from("cppa_assessments")
        .update({ status: "error", report_data: { error: e.message } })
        .eq("id", assessment_id);
      return;
    }


    // STAGE 1 — Retrieve + enforcement context IN PARALLEL (P2: reduce wall-clock)
    const sector = intake.q3_sector ?? intake.industry_sector ?? intake.sector;
    const [retrieval, enforcement] = await Promise.all([
      fetch(`${SUPABASE_URL}/functions/v1/cppa-retrieve-context`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ topics, include_deadlines: true, full_text_limit: 8, limit: 14 }),
      }).then((r) => r.json()),
      getEnforcementContext(sector),
    ]);
    const authorities = retrieval?.authorities ?? [];
    const deadlines = retrieval?.deadlines ?? [];
    const noAuth = retrieval?.warning === "no_matching_authority" || authorities.length === 0;

    // STAGE 2 — Generate
    const genUser =
`Produce a CPPA/CCPA risk assessment for this organisation, grounded ONLY in the retrieved authorities and deadlines.

INTAKE DATA:
${JSON.stringify(intake, null, 2)}

RETRIEVED AUTHORITIES (the only permitted source of citations):
${noAuth ? "NONE RETRIEVED — mark every finding requires attorney review." : buildAuthoritiesBlock(authorities)}

RETRIEVED DEADLINES (the only permitted source of dates/deadlines):
${buildDeadlinesBlock(deadlines)}

ENFORCEMENT CONTEXT (illustrative, non-binding):
${enforcement.text || "NONE AVAILABLE"}

Return JSON:
{
  "executive_summary": "150-200 words. Overall posture and top 3 priorities. Every legal claim must trace to an [A#] or [D#].",
  "scope_confirmation": {
    "in_scope": true,
    "threshold_met": "state which threshold is met, citing the [A#] threshold authority",
    "applicable_deadlines": ["each item must reference a [D#]"]
  },
  "overall_score": 0,
  "risk_level": "Critical|High|Medium|Low",
  "domains": [ {
    "domain": "...",
    "score": 0,
    "status": "Compliant|Partial|Gap|Critical Gap",
    "finding": "2-3 sentences",
    "regulatory_basis": "cite the exact [A#] citation(s); if none supports this domain, write 'No retrieved authority on point — requires attorney review'",
    "remediation": "specific steps",
    "priority": "Immediate|Within 90 days|Within 6 months|Monitor",
    "confidence_level": "High|Medium|Low",
    "attorney_review_needed": true
  } ],
  "top_risks": [ { "title": "...", "description": "...", "deadline": "reference a [D#] or omit", "consequence": "..." } ],
  "enforcement_context": "2-3 sentences; may reference [E#] as illustrative only",
  "next_steps": ["..."],
  "citations_used": ["every [A#]/[D#] citation string you relied on, verbatim"]
}

Domains to assess (one object each): Consumer Rights Infrastructure; Privacy Notices and Transparency; Opt-Out of Sale and Sharing; Sensitive Personal Information; Automated Decision-Making; Data Retention and Minimisation; Third-Party Contracts and Data Sharing; Incident Response and Breach Notification; Employee Notice and Training; CPPA Audit Readiness.

For any domain with no retrieved authority on point, set regulatory_basis to the attorney-review phrase above and attorney_review_needed=true rather than inventing a citation.`;

    const tGen = Date.now();
    const gen = await generateOrRetry("claude-sonnet-4-6", GENERATION_SYSTEM, genUser, 8000, "generate");
    console.log(`[pipeline] generate total ${Date.now() - tGen}ms`);
    if (!gen.parsed) {
      await supabase.from("cppa_assessments").update({
        status: "error",
        report_data: { error: "generation_parse_failed", debug: gen.rawText?.slice(0, 4000) ?? "" },
      }).eq("id", assessment_id);
      return new Response(JSON.stringify({ error: "Generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const draft = gen.parsed;

    // STAGE 3 — Validate
    const valUser =
`Validate the citations and deadlines in this draft assessment against the provided authorities.

DRAFT ASSESSMENT (JSON):
${JSON.stringify(draft, null, 2)}

PROVIDED AUTHORITIES (the only source you may validate against):
${noAuth ? "(NONE)" : buildValidationAuthBlock(authorities)}

PROVIDED DEADLINES:
${buildValidationDeadlineBlock(deadlines)}

Produce the citation_ledger, requires_attorney_review list, and summary per your instructions.
Remember: never approve or correct from your own knowledge — only from the authorities above.`;

    // Validator runs on Sonnet, not Opus: Opus on this prompt was running 3-4 min and
    // killing the edge function. Sonnet is still capable of cross-referencing the draft
    // against the provided authority text, and finishes inside the wall-clock budget.
    const tVal = Date.now();
    const val = await generateOrRetry("claude-sonnet-4-6", VALIDATION_SYSTEM, valUser, 6000, "validate");
    console.log(`[pipeline] validate total ${Date.now() - tVal}ms`);
    const validation = val.parsed ?? {
      citation_ledger: [],
      requires_attorney_review: ["Validator output unparseable — entire report needs human review."],
      summary: "Validator failed to return structured output.",
    };

    const corpusCitations = new Set<string>(authorities.map((a: any) => a.citation));
    const merged = mergeValidation(draft, validation, corpusCitations);

    // Preserve retrieval & enforcement metadata in the report for transparency
    merged.retrieval = {
      topics, authority_count: authorities.length, deadline_count: deadlines.length,
      verified_only_mode: retrieval?.verified_only_mode ?? false,
      warning: retrieval?.warning ?? null,
    };
    merged.enforcement_results = enforcement.results;

    await supabase.from("cppa_assessments")
      .update({ status: "complete", report_data: merged })
      .eq("id", assessment_id);
  } catch (e) {
    console.error("run-cppa-risk-assessment background error:", e);
    try {
      await supabase.from("cppa_assessments")
        .update({ status: "error", report_data: { error: String(e) } })
        .eq("id", assessment_id);
    } catch { /* ignore */ }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let assessment_id: string | undefined;
  try {
    const body = await req.json();
    assessment_id = body?.assessment_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!assessment_id) {
    return new Response(JSON.stringify({ error: "assessment_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Mark processing synchronously so the client sees immediate state change,
  // then fire-and-forget via EdgeRuntime.waitUntil. Client polls cppa_assessments.status.
  try {
    await supabase.from("cppa_assessments")
      .update({ status: "processing" }).eq("id", assessment_id);
  } catch { /* row existence is re-checked inside runPipeline */ }

  // @ts-ignore Deno Edge Runtime API
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) {
    er.waitUntil(runPipeline(assessment_id));
  } else {
    runPipeline(assessment_id).catch((e) => console.error("pipeline error:", e));
  }

  return new Response(JSON.stringify({ accepted: true, assessment_id }), {
    status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

