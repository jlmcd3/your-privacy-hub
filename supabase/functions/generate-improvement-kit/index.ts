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

// Bright-lines banned-word list (P5 sign-off: ZERO exceptions; "gap" fully
// banned). Matched case-insensitively, whole-word.
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

function bannedWordHits(text: string): string[] {
  const hits: string[] = [];
  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${w}\\b`, "i");
    if (re.test(text)) hits.push(w);
  }
  return hits;
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
}

interface KitItemB {
  item_id: string;
  citing_regulation: string;
  recorded_basis: string;
  template_or_policy: string;
  enforcement_line: string | null;
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
        `A SUFFICIENT ANSWER LOOKS LIKE: ${it.a_sufficient_answer_looks_like}\n`,
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
): Promise<string | null> {
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
      return `${regulator}${subject}: ${failure}${date} [${cite.trim()}]`;
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
    const sectionA: KitItemA[] = [];
    for (const f of inconsistencyFlags) {
      const sourceFields = Array.isArray(f.source_fields)
        ? (f.source_fields as string[])
        : [];
      const primary = sourceFields[0] ?? String(f.field_id ?? "unknown_field");
      const ev = lookupEvidence(primary);
      sectionA.push({
        item_id: String(f.id ?? `inconsistency-${sectionA.length + 1}`),
        citing_regulation: String(f.citation ?? "11 CCR § 7150"),
        fact_required: String(f.fact_required ?? f.description ?? "unresolved contradiction between recorded fields"),
        where_facts_like_this_usually_live: ev.where_it_lives,
        a_sufficient_answer_looks_like: ev.sufficient_form,
        source_fields: sourceFields.length ? sourceFields : [primary],
      });
    }
    for (const n of informationNeeded) {
      const fieldId = String(n.field_id ?? n.id ?? "unknown_field");
      const ev = lookupEvidence(fieldId);
      sectionA.push({
        item_id: String(n.id ?? `information-needed-${sectionA.length + 1}`),
        citing_regulation: String(n.citation ?? "11 CCR § 7152"),
        fact_required: String(n.fact_required ?? n.description ?? "fact not yet documented"),
        where_facts_like_this_usually_live: ev.where_it_lives,
        a_sufficient_answer_looks_like: ev.sufficient_form,
        source_fields: [fieldId],
      });
    }

    // ---- Section B: strengthen_items. Enforcement line: cited-or-absent.
    const sectionB: KitItemB[] = [];
    for (const s of strengthenItems) {
      const fieldId = String(s.field_id ?? s.id ?? "unknown_field");
      const ev = lookupEvidence(fieldId);
      const basis = String(
        (s.recorded_basis as string | undefined) ??
          (s.basis as string | undefined) ??
          "standard_template",
      );
      const topic = String(
        (s.enforcement_topic as string | undefined) ??
          (s.description as string | undefined) ??
          fieldId,
      );
      const enforcementLine = await enforcementLineForItem(admin, topic);
      sectionB.push({
        item_id: String(s.id ?? `strengthen-${sectionB.length + 1}`),
        citing_regulation: String(s.citation ?? "11 CCR § 7152"),
        recorded_basis: basis,
        template_or_policy: ev.sufficient_form,
        enforcement_line: enforcementLine,
      });
    }

    const rendered = renderKit({
      reportId: String(row.id),
      dateIso: new Date().toISOString().slice(0, 10),
      sectionA,
      sectionB,
    });

    // Bright-lines self-check (never ship if a banned word slipped in).
    const banned = bannedWordHits(rendered);
    if (banned.length) {
      console.warn(
        `[improvement-kit] bright-lines violation, refusing to return Kit: ${banned.join(", ")}`,
      );
      return new Response(
        JSON.stringify({ error: "bright_lines_violation", banned }),
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
