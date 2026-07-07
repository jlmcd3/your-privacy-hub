// doc-p build active
//
// generate-improvement-kit -- Doc P Phase 1 / Part 3.
//
// READ-ONLY EDGE FUNCTION. This function performs ZERO writes to any
// database table (no .insert / .update / .delete / .upsert / .rpc mutation
// against public tables). It reads the caller's cppa_assessments row, the
// static evidence-location map, and get-enforcement-context; it renders a
// deterministic Kit using ONLY the Section W templates (the LLM writes no
// Kit prose). Non-Professional callers receive { entitled: false } with no
// Kit content -- the upgrade teaser is Doc S, frontend-only.
//
// Provenance:
//   - Section W templates: EUP_DocP_Kit_Phase1_Function_Entitlement_Lovable_v2.md
//     (signed off John 2026-07-06; W3 amended "open items" wording).
//   - Entitlement (pin P2): Professional monthly AND annual only.
//     Intelligence subscribers and standalone purchasers are NOT entitled.
//   - Enforcement context (W6): cited-or-absent; fail-open with
//     console.warn (Doc F posture).
//   - QL2 exposure: zero by design (spec rule R4). run-stress-job never
//     invokes this function.
//
// Bright-lines doctrine (5c HYBRID ruling, John 2026-07-07):
//   R1. Bright-lines applies to KIT-AUTHORED text (skeleton, template,
//       preamble, framing) with ZERO exceptions.
//   R2. QUOTATION CARVE-OUT: within the verbatim quoted substring of a
//       cited enforcement item (guaranteed by W6 cited-or-absent), all
//       banned words EXCEPT "gap" are exempt. Masking is structural:
//       only the quoted span is masked before the R1 check; kit-authored
//       words around each quote remain fully checked. Each carve-out use
//       is logged.
//   R3. "gap" REMAINS ABSOLUTE (P5 zero-exception term): a cited quote
//       containing "gap" causes that ITEM to be treated as uncited --
//       omitted per-item, rest of Kit unaffected, omission logged. Never
//       a 500 for this.
//   R4. 500 fail-closed REMAINS for any R1 violation in kit-authored
//       text -- that is a build defect, not data.
//   R5. This comment IS the doctrine; keep it in sync with the code
//       below (claim-vs-reality discipline).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { lookupEvidence, EVIDENCE_MAP_VERSION } from "./evidence-map.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const KIT_BUILD_MARKER = "doc-p";
const KIT_VERSION = `${KIT_BUILD_MARKER}-${EVIDENCE_MAP_VERSION}`;

// Bright-lines banned-word list. Matched case-insensitively, whole-word.
// See R1-R4 doctrine in the header for scoping (kit-authored vs quoted).
const BANNED_WORDS = [
  "trail",
  "evidence",
  "audit",
  "gap",
  "fix",
  "correct",
  "mistake",
  "deficiency",
  "verified",
  "proof",
  "compliance",
  "compliant",
  "assurance",
] as const;

// "gap" is the absolute term (R3): never eligible for the quotation carve-out.
const ABSOLUTE_BANNED = new Set<string>(["gap"]);

function bannedWordHits(text: string): string[] {
  const hits: string[] = [];
  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${w}\\b`, "i");
    if (re.test(text)) hits.push(w);
  }
  return hits;
}

function containsAbsoluteBanned(text: string): boolean {
  for (const w of ABSOLUTE_BANNED) {
    if (new RegExp(`\\b${w}\\b`, "i").test(text)) return true;
  }
  return false;
}

// Mask a substring occurrence in `text` with spaces of equal length. Used
// to structurally exempt quoted enforcement spans from the R1 check while
// keeping all surrounding kit-authored text under check.
function maskFirstOccurrence(text: string, needle: string): string {
  if (!needle) return text;
  const idx = text.indexOf(needle);
  if (idx < 0) return text;
  return text.slice(0, idx) + " ".repeat(needle.length) + text.slice(idx + needle.length);
}

interface AssertionEntry {
  state: "confirmed" | "believed" | "unknown";
  basis: string | null;
}

interface KitItemA {
  item_id: string;
  citing_regulation: string;
  fact_required: string;
  where_facts_like_this_usually_live: string;
  a_sufficient_answer_looks_like: string;
  source_fields: string[];
  // Fixed-template reference back to the source report (E2, collision #2
  // ruling): the Kit never reproduces analyzer prose; when report detail
  // is relevant we point the reader at the numbered item in the report
  // itself. Kit-authored -- checked against the bright lines like any
  // other Kit string.
  reference_line: string;
}

interface KitItemB {
  item_id: string;
  citing_regulation: string;
  recorded_basis: string;
  template_or_policy: string;
  enforcement_line: string | null;
  // The full cited-enforcement quoted span (same string as enforcement_line
  // when rendered). Used by the R2 structural masking; kept separate so the
  // self-check can identify exactly what to mask before running R1.
  enforcement_quote: string | null;
  enforcement_citation: string | null;
}

function renderSectionA(items: KitItemA[]): string {
  if (!items.length) return "";
  const header =
    "## Items to resolve\n\n" +
    "Items to resolve -- open items in the record: contradictions to " +
    "reconcile, or facts not yet documented. These reflect what the record " +
    "contains, not a finding about your practices. Each entry states the " +
    "fact required, where facts like it usually live, and what a sufficient " +
    "answer looks like in form.\n";
  const body = items
    .map(
      (it) =>
        `\n${it.item_id} -- ${it.citing_regulation}\n` +
        `FACT REQUIRED: ${it.fact_required}\n` +
        `WHERE FACTS LIKE THIS USUALLY LIVE: ${it.where_facts_like_this_usually_live}\n` +
        `A SUFFICIENT ANSWER LOOKS LIKE: ${it.a_sufficient_answer_looks_like}\n` +
        `${it.reference_line}\n`,
    )
    .join("");
  return header + body;
}

function renderSectionB(items: KitItemB[]): string {
  if (!items.length) return "";
  const header =
    "## Optional depth\n\n" +
    "Optional depth -- your record is complete. The items below are " +
    "optional ways to deepen verification if and when you choose. None of " +
    "them is required to maintain the record.\n";
  const body = items
    .map((it) => {
      const lines = [
        `\n${it.item_id} -- ${it.citing_regulation}`,
        `Your record already covers this on the stated basis: ${it.recorded_basis}.`,
        `Common ways organizations deepen this: review the current ${it.template_or_policy} once; spot-check a small sample.`,
      ];
      // Enforcement line: cited-or-absent (W6). Rendered ONLY when the
      // service returned a cited item; omitted entirely otherwise.
      if (it.enforcement_line) {
        lines.push(`Enforcement context: ${it.enforcement_line}`);
      }
      return lines.join("\n") + "\n";
    })
    .join("");
  return header + body;
}

function renderKit(opts: {
  reportId: string;
  dateIso: string;
  sectionA: KitItemA[];
  sectionB: KitItemB[];
}): string {
  const provenance =
    `Assessment Improvement Kit\n` +
    `Prepared from End User Privacy CPPA Risk Assessment ${opts.reportId}, ${opts.dateIso}.`;
  const preamble =
    "Help me locate the following facts in our systems; do not guess or " +
    "infer answers; record where each was found.";
  const parts = [
    `# ${provenance.split("\n")[0]}\n\n${provenance.split("\n")[1]}`,
    preamble,
    renderSectionA(opts.sectionA),
    renderSectionB(opts.sectionB),
    `---\n${provenance}`,
  ].filter(Boolean);
  return parts.join("\n\n");
}

// ---- entitlement (P2): PROFESSIONAL only, monthly AND annual.
async function isProfessional(userId: string): Promise<boolean> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await admin
    .from("profiles")
    .select("is_pro, subscription_type, is_premium")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return false;
  if (data.is_pro === true) return true;
  const t = String(data.subscription_type ?? "");
  return t === "pro_monthly" || t === "pro_annual";
}

// ---- enforcement context (W6). Cited-or-absent, fail-open with warn.
async function enforcementLineForItem(
  admin: ReturnType<typeof createClient>,
  topic: string,
): Promise<{ line: string; citation: string } | null> {
  try {
    const { data, error } = await admin.functions.invoke(
      "get-enforcement-context",
      {
        body: {
          query: topic,
          jurisdictions: ["California", "US-CA", "United States"],
          regime: "ccpa",
          limit: 3,
        },
      },
    );
    if (error) {
      console.warn(
        "[improvement-kit] get-enforcement-context error (item omitted):",
        error?.message ?? String(error),
      );
      return null;
    }
    const rows = (data as { results?: unknown[] } | null)?.results ?? [];
    for (const raw of rows) {
      const r = raw as Record<string, unknown>;
      const cite = (r.source_url as string | undefined) ??
        (r.citation as string | undefined);
      // W6 rule: rendered ONLY when the service returns a cited item.
      if (!cite || typeof cite !== "string" || !cite.trim()) continue;
      const regulator = String(r.regulator ?? "Regulator");
      const subject = r.subject ? ` -- ${String(r.subject)}` : "";
      const failure = String(
        r.key_compliance_failure ?? r.violation ?? "posture noted",
      );
      const date = r.decision_date ? ` (${String(r.decision_date)})` : "";
      const citation = cite.trim();
      const line = `${regulator}${subject}: ${failure}${date} [${citation}]`;
      // R3: "gap" is absolute. If the verbatim quoted content contains
      // "gap", treat this item as uncited -- omit and log; do NOT 500.
      if (containsAbsoluteBanned(line)) {
        console.warn(
          `[improvement-kit] R3 omit: cited enforcement quote contains absolute banned term ("gap"); item treated as uncited. citation=${citation}`,
        );
        return null;
      }
      return { line, citation };
    }
    return null;
  } catch (e) {
    console.warn(
      "[improvement-kit] get-enforcement-context threw (item omitted):",
      (e as Error)?.message ?? String(e),
    );
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  console.log(
    `[improvement-kit] build active - marker=${KIT_BUILD_MARKER} version=${KIT_VERSION}`,
  );

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "missing bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const token = authHeader.slice("Bearer ".length);

    // User-scoped client resolves the caller identity from the JWT.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as { assessment_id?: string };
    const assessmentId = body?.assessment_id;
    if (!assessmentId || typeof assessmentId !== "string") {
      return new Response(
        JSON.stringify({ error: "assessment_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Server-side entitlement re-check (never trust a client tier claim).
    const entitled = await isProfessional(userId);
    if (!entitled) {
      return new Response(
        JSON.stringify({ entitled: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load assessment (service role: RLS ownership enforced explicitly).
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: row, error: rowErr } = await admin
      .from("cppa_assessments")
      .select("id, user_id, status, report_data, created_at")
      .eq("id", assessmentId)
      .maybeSingle();
    if (rowErr || !row) {
      return new Response(
        JSON.stringify({ error: "assessment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (row.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (row.status !== "complete") {
      return new Response(
        JSON.stringify({ error: "assessment not complete", status: row.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const report = (row.report_data ?? {}) as Record<string, unknown>;
    const inconsistencyFlags = (report.inconsistency_flags as Array<Record<string, unknown>>) ?? [];
    const informationNeeded = (report.information_needed as Array<Record<string, unknown>>) ?? [];
    const strengthenItems = (report.strengthen_items as Array<Record<string, unknown>>) ?? [];

    // ---- Section A: inconsistency_flags + information_needed.
    //
    // W4 compliance (Doc P v2 lines 67-73): fact_required is FORM ONLY --
    // days / yes-no / clause number / named list -- and NEVER reproduces
    // analyzer prose (E2, collision #2 ruling). where/sufficient_form come
    // from the static evidence map. A fixed reference_line template points
    // the reader back to the numbered item in the source report.
    // Contradiction items MUST render BOTH source fields (Doc P 5b:
    // "both source fields on the contradiction").
    const sectionA: KitItemA[] = [];
    for (let i = 0; i < inconsistencyFlags.length; i++) {
      const f = inconsistencyFlags[i];
      const sourceFields = Array.isArray(f.source_fields)
        ? (f.source_fields as string[]).map(String)
        : [];
      const f1 = String(
        (f.intake_field_1 as string | undefined) ??
          sourceFields[0] ??
          "unknown_field",
      );
      const f2 = String(
        (f.intake_field_2 as string | undefined) ??
          sourceFields[1] ??
          f1,
      );
      const ev1 = lookupEvidence(f1);
      const ev2 = lookupEvidence(f2);
      const citation = String(
        (f.regulatory_citation as string | undefined) ??
          (f.citation as string | undefined) ??
          "11 CCR § 7150",
      );
      const bothFields = f1 !== f2;
      sectionA.push({
        item_id: String(f.id ?? `C-${i + 1}`),
        citing_regulation: citation,
        fact_required: bothFields
          ? `reconciliation between fields ${f1} and ${f2}, stated as which recorded value applies to which scope (form: named scope per value)`
          : `a stated value for field ${f1} in the form its entry accepts (days, yes-no, clause number, or named list)`,
        where_facts_like_this_usually_live: bothFields
          ? `${ev1.where_it_lives}; and ${ev2.where_it_lives}`
          : ev1.where_it_lives,
        a_sufficient_answer_looks_like: bothFields
          ? `${ev1.sufficient_form}; and ${ev2.sufficient_form}`
          : ev1.sufficient_form,
        source_fields: bothFields
          ? [f1, f2]
          : (sourceFields.length ? sourceFields : [f1]),
        reference_line:
          `See inconsistency flag ${i + 1} in your CPPA Risk Assessment report.`,
      });
    }
    for (let i = 0; i < informationNeeded.length; i++) {
      const n = informationNeeded[i];
      const fieldId = String(
        (n.field as string | undefined) ??
          (n.field_id as string | undefined) ??
          (n.id as string | undefined) ??
          "unknown_field",
      );
      const ev = lookupEvidence(fieldId);
      const citation = String(
        (n.provision as string | undefined) ??
          (n.citation as string | undefined) ??
          "11 CCR § 7152",
      );
      sectionA.push({
        item_id: String(n.id ?? `N-${i + 1}`),
        citing_regulation: citation,
        fact_required:
          `a stated value for field ${fieldId} in the form its entry accepts (days, yes-no, clause number, or named list)`,
        where_facts_like_this_usually_live: ev.where_it_lives,
        a_sufficient_answer_looks_like: ev.sufficient_form,
        source_fields: [fieldId],
        reference_line:
          `See open-items entry ${i + 1} in your CPPA Risk Assessment report.`,
      });
    }

    // ---- Section B: strengthen_items. Enforcement line: cited-or-absent.
    const sectionB: KitItemB[] = [];
    for (let i = 0; i < strengthenItems.length; i++) {
      const s = strengthenItems[i];
      const fieldIds = Array.isArray(s.field_ids)
        ? (s.field_ids as string[]).map(String)
        : (s.field_id ? [String(s.field_id)] : []);
      const fieldId = fieldIds[0] ?? "unknown_field";
      const ev = lookupEvidence(fieldId);
      const basis = String(
        (s.recorded_basis as string | undefined) ??
          (s.basis as string | undefined) ??
          "standard_template",
      );
      // Enforcement topic is a Kit-authored short string derived from the
      // field id only -- never from analyzer prose. get-enforcement-context
      // does its own semantic search from the topic keyword.
      const topic = fieldId;
      const enforcement = await enforcementLineForItem(admin, topic);
      sectionB.push({
        item_id: String(s.item_id ?? s.id ?? `S-${i + 1}`),
        citing_regulation: String(s.citation ?? "11 CCR § 7152"),
        recorded_basis: basis,
        template_or_policy: ev.sufficient_form,
        enforcement_line: enforcement ? enforcement.line : null,
        enforcement_quote: enforcement ? enforcement.line : null,
        enforcement_citation: enforcement ? enforcement.citation : null,
      });
    }



    const rendered = renderKit({
      reportId: String(row.id),
      dateIso: new Date().toISOString().slice(0, 10),
      sectionA,
      sectionB,
    });

    // Bright-lines self-check (R1-R4).
    // R2 structural masking: mask each cited enforcement quote before the
    // R1 check so kit-authored text alone is measured. R3 already omitted
    // any item whose quote contains "gap" upstream.
    let maskedForR1 = rendered;
    for (const it of sectionB) {
      if (it.enforcement_quote) {
        // Per-item carve-out log: report any banned words present INSIDE
        // the quoted span (excluding "gap", which R3 already handled).
        const inQuote = bannedWordHits(it.enforcement_quote).filter(
          (w) => !ABSOLUTE_BANNED.has(w),
        );
        if (inQuote.length) {
          console.log(
            `[improvement-kit] bright-lines quotation carve-out used: ${inQuote.join(", ")} in cited enforcement quote ${it.enforcement_citation ?? "(no-cite)"}`,
          );
        }
        maskedForR1 = maskFirstOccurrence(maskedForR1, it.enforcement_quote);
      }
    }
    const banned = bannedWordHits(maskedForR1);
    if (banned.length) {
      // Debug: emit which line contains the banned word so we can trace
      // the offending kit-authored substring.
      for (const w of banned) {
        const re = new RegExp(`.{0,80}\\b${w}\\b.{0,80}`, "i");
        const m = maskedForR1.match(re);
        console.warn(`[improvement-kit] R1 hit context (${w}): ${m ? m[0] : "(no context)"}`);
      }
      console.warn(
        `[improvement-kit] R1 bright-lines violation in kit-authored text, refusing to return Kit: ${banned.join(", ")}`,
      );
      return new Response(
        JSON.stringify({ error: "bright_lines_violation", banned, scope: "kit_authored" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        entitled: true,
        version: KIT_VERSION,
        assessment_id: row.id,
        rendered_markdown: rendered,
        section_a: sectionA,
        section_b: sectionB,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[improvement-kit] unhandled:", (e as Error)?.message ?? String(e));
    return new Response(
      JSON.stringify({ error: "internal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
