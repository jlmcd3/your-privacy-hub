// PROMPT 8K (2026-08-12) — CLOSED-LOOP PERFECT FIXTURES. HARNESS ONLY.
//
// RATIONALE: the "perfect" variant drifted from the product twice because
// "perfect" was defined by a prose spec. From 8K on, PERFECT IS DEFINED BY THE
// PRODUCT ITSELF: a perfect intake is one the deliverables builder finds
// NOTHING MISSING in. This module runs the real, unmodified product builder
// (`buildDpiaDeliverables`) over a candidate intake and rejects the intake
// unless every insufficiency signal is clear.
//
// REJECT unless ALL of:
//   (a) gap_ledger is empty;
//   (b) no finding on any surface carries status "record_insufficient";
//   (c) no risk_register row has residual_band "undetermined";
//   (d) the sign-off block is complete — approver name, title, date, basis,
//       and a resolvable rescorer (the `{rescorer}` slot must not fall back
//       to "the company").
//
// NOT a rejection reason: the DETERMINATION (approved / conditionally_approved
// / consultation_required are all legitimate on perfect data), and
// risk_count_note firing (the assessment surfacing more risks than the company
// self-identified is an analytic result, not a data defect).
//
// CARVE-OUT (CEO-RULED 2026-08-17, PROMPT 9M — supersedes the 8K parked note):
// a perfect scenario must NOT combine legal_basis_proposed "Legitimate
// interests" with special-category data_categories. This is no longer an open
// design question: under the 9M ruling such a record is conditionally approved
// WITH a gap-ledger entry BY DESIGN, because the Art. 9 carve requires a
// separate Art. 9(2) condition that a 6(1)(f) record does not supply. It can
// therefore never be closed-loop perfect, and the lint keeps rejecting it.
// Lint behaviour is unchanged by the ruling — only the rationale is settled.

import { buildDpiaDeliverables, SPECIAL_CATEGORY_DISCLAIMER_RE } from "../ltp/dpia-deliverables/build.ts";

export const PERFECT_CLOSED_LOOP_VERSION = "perfect-closed-loop@prompt8k-2026-08-12";

export const CARVE_OUT_REASON =
  "6(1)(f)+special-category excluded from perfect variant: conditionally approved with a gap-ledger entry by design (CEO ruling, PROMPT 9M)";

const SPECIAL_CATEGORY_CATS = [
  "Health or medical data",
  "Biometric data",
  "Genetic data",
  "Racial or ethnic origin",
  "Political opinions",
  "Religious or philosophical beliefs",
  "Trade union membership",
  "Sex life or sexual orientation",
  "Criminal convictions or offences",
];

// FIX 2026-08-25 — FALSE-POSITIVE NARROWING for the secondary_uses text path
// only (see violatesPerfectCarveOut). Found live in a non-pinned so-final-test
// batch: two well-constructed generated DPIA scenarios were rejected by this
// carve-out even though their PRIMARY basis for the special-category
// processing was a valid, distinct basis (Art. 9(2)(b) / Art. 6(1)(c)) — the
// carve-out fired only because a SEPARATE secondary operation stated its own
// Art. 6(1)(f) basis, and that secondary operation's own text explicitly said
// it does not touch special-category data (anonymised/de-identified first).
// PROMPT 9M's rationale is that a 6(1)(f) record cannot supply the Art. 9(2)
// condition special-category data needs; an operation the record itself says
// no longer carries special-category data at that point never needed one, so
// it is not the violation PROMPT 9M targets. This disclaimer check applies
// ONLY to the secondary_uses text path — the primary legal_basis_proposed
// field stays exactly as blunt as before (a record that names "Legitimate
// interest" as ITS OWN basis for special-category data is unconditionally a
// violation, matching the existing pinned prompt8k test).
//
// FIX 2026-08-26 (batch a2db9e57) — the SAME false-positive class was found
// live in the PRODUCT builder itself (buildLegalBasis's art9Special), not
// only in this screener; that fix made build.ts's SPECIAL_CATEGORY_DISCLAIMER_RE
// the single source of truth, so this file imports it instead of keeping a
// separate literal copy that could drift from the product's own rule.
const ANONYMISATION_DISCLAIMER_RE = SPECIAL_CATEGORY_DISCLAIMER_RE;

export interface PerfectDeficiency {
  /** "gap" | "insufficient" | "undetermined" | "signoff" | "carve_out" | "build" */
  readonly kind: string;
  readonly detail: string;
}

export interface PerfectCheckResult {
  readonly ok: boolean;
  readonly deficiencies: PerfectDeficiency[];
}

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function categories(intake: Record<string, unknown>): string[] {
  const v = intake["data_categories"];
  if (Array.isArray(v)) return v.map((x) => s(x)).filter(Boolean);
  return s(v) ? [s(v)] : [];
}

/** CEO-parked carve-out: 6(1)(f) + special-category data. */
export function violatesPerfectCarveOut(intake: unknown): boolean {
  const o = (intake ?? {}) as Record<string, unknown>;
  // PROMPT 9H item 1 (harness) — the secondary operation may state its OWN
  // Art. 6(1) basis, so the carve-out reads the record-level field AND the
  // secondary-use text. 6(1)(f) over special-category data is parked in both.
  const basis = s(o["legal_basis_proposed"]).toLowerCase();
  const secondaryRaw = s(o["secondary_uses"]);
  const secondary = secondaryRaw.toLowerCase();
  const li = /legitimate interest|6\(1\)\(f\)/;
  const cats = categories(o).map((c) => c.toLowerCase());
  const hasSpecialCategory = SPECIAL_CATEGORY_CATS.some((sc) => cats.includes(sc.toLowerCase()));
  if (!hasSpecialCategory) return false;
  // The record's OWN primary basis is LI: unconditional violation, exactly as
  // before this fix — this is the clear, unambiguous PROMPT 9M case.
  if (li.test(basis)) return true;
  // A separate secondary operation states its own LI basis. Only a violation
  // if that operation's own text does NOT disclaim special-category
  // involvement (see the FIX 2026-08-25 note above) — an operation the
  // record itself says is anonymised/de-identified before that basis applies
  // never needed the Art. 9(2) condition PROMPT 9M is protecting.
  if (li.test(secondary)) return !ANONYMISATION_DISCLAIMER_RE.test(secondaryRaw);
  return false;
}

/** Sign-off block completeness — the four recorded fields plus a rescorer. */
export function signOffDeficiencies(intake: unknown): PerfectDeficiency[] {
  const o = (intake ?? {}) as Record<string, unknown>;
  const out: PerfectDeficiency[] = [];
  const req: Array<[string, string]> = [
    ["dpia_approved_by_name", "approver name"],
    ["dpia_approved_by_title", "approver title"],
    ["dpia_approval_date", "approval date"],
    ["dpia_signoff_basis", "sign-off basis"],
  ];
  for (const [key, label] of req) {
    if (!s(o[key])) out.push({ kind: "signoff", detail: `sign-off block incomplete: ${label} (${key}) is not recorded` });
  }
  // The {rescorer} slot resolves to dpia_approved_by_name, else "the company".
  if (!s(o["dpia_approved_by_name"])) {
    out.push({ kind: "signoff", detail: "the {rescorer} slot falls back to \"the company\" — record dpia_approved_by_name" });
  }
  return out;
}

/**
 * Run the PRODUCT builder over the candidate intake and report every
 * insufficiency signal. Pure; no I/O, no model calls.
 */
export function checkPerfectDpiaIntake(intake: unknown): PerfectCheckResult {
  const deficiencies: PerfectDeficiency[] = [];

  if (violatesPerfectCarveOut(intake)) {
    return { ok: false, deficiencies: [{ kind: "carve_out", detail: CARVE_OUT_REASON }] };
  }

  let built: ReturnType<typeof buildDpiaDeliverables>;
  try {
    built = buildDpiaDeliverables(intake);
  } catch (e) {
    return {
      ok: false,
      deficiencies: [{ kind: "build", detail: `deliverables builder threw: ${(e as Error)?.message ?? String(e)}` }],
    };
  }

  // (a) gap_ledger empty.
  for (const g of built.gap_ledger ?? []) {
    deficiencies.push({ kind: "gap", detail: `gap_ledger: ${g.field} — ${g.dimensions}` });
  }

  // (b) no record_insufficient finding on any surface.
  const surfaces: Array<[string, ReadonlyArray<{ status?: string; information_needed?: string }>]> = [
    ["necessity_findings", built.necessity_findings ?? []],
    ["proportionality", built.proportionality ?? []],
    ["legal_basis", built.legal_basis ?? []],
    ["risk_register", built.risk_register ?? []],
    ["processing_inventory.controllers", built.processing_inventory?.controllers ?? []],
    ["processing_inventory.processors", built.processing_inventory?.processors ?? []],
    ["processing_inventory.data_items", built.processing_inventory?.data_items ?? []],
  ];
  for (const [name, rows] of surfaces) {
    for (const r of rows) {
      if (r?.status === "record_insufficient") {
        deficiencies.push({
          kind: "insufficient",
          detail: `${name}: record_insufficient${r.information_needed ? ` — needs ${r.information_needed}` : ""}`,
        });
      }
    }
  }
  if ((built.art36_consultation as { status?: string } | undefined)?.status === "record_insufficient") {
    deficiencies.push({ kind: "insufficient", detail: "art36_consultation: record_insufficient" });
  }
  const cov = built.section2_coverage as unknown as Record<string, unknown> | undefined;
  if (cov) {
    for (const [key, val] of Object.entries(cov)) {
      if (!Array.isArray(val)) continue;
      for (const row of val as Array<{ status?: string; information_needed?: string }>) {
        if (row?.status === "record_insufficient") {
          deficiencies.push({
            kind: "insufficient",
            detail: `section2_coverage.${key}: record_insufficient${row.information_needed ? ` — needs ${row.information_needed}` : ""}`,
          });
        }
      }
    }
  }

  // (c) no undetermined residual band.
  for (const r of built.risk_register ?? []) {
    if (r.residual_band === "undetermined") {
      deficiencies.push({ kind: "undetermined", detail: `risk_register: ${r.risk_label} has residual_band "undetermined"` });
    }
  }

  // (d) sign-off block complete.
  deficiencies.push(...signOffDeficiencies(intake));

  return { ok: deficiencies.length === 0, deficiencies };
}

/** One-line reasons, deduped, for the progress_log and generator retry guidance. */
export function deficiencyLines(d: readonly PerfectDeficiency[]): string[] {
  return [...new Set(d.map((x) => `${x.kind}: ${x.detail}`))];
}

/**
 * Retry guidance fed back to the generator (8G per-scenario retry path).
 *
 * PROMPT 12F item 1 — KIND-AWARE. A carve-out rejection can only be fixed by a
 * REMOVAL (drop the LI basis or drop the special-category/children's
 * categories), so the fact-additive frame ("same kind of scenario… add facts,
 * never remove detail") reproduced the violation on every repair retry (batch
 * 60fd852e). Carve-out rejections therefore get their own frame; every other
 * deficiency kind keeps the fact-additive text byte-unchanged.
 */
export const CARVE_OUT_REPAIR_GUIDANCE =
  "HARD-CONSTRAINT VIOLATION — the previous scenario combined 'Legitimate interests' with special-category or children's data, which is auto-rejected on the perfect variant. Generate a DIFFERENT scenario: EITHER keep the sector and choose a non-LI basis (Art. 6(1)(b), (c) or (e)) OR keep 'Legitimate interests' and use only non-special, non-children data_categories. Do NOT reuse the previous basis+categories combination.";

export function perfectRetryGuidance(d: readonly PerfectDeficiency[]): string {
  const lines = deficiencyLines(d).slice(0, 12);
  if (d.some((x) => x.kind === "carve_out")) {
    return [CARVE_OUT_REPAIR_GUIDANCE, ...lines.map((l) => `- ${l}`)].join("\n");
  }
  return [
    "CLOSED-LOOP REJECTION — the previous scenario was rejected because the product's own deliverables builder found the record insufficient.",
    "Regenerate the SAME kind of scenario with these specific facts supplied (add facts, never remove detail):",
    ...lines.map((l) => `- ${l}`),
    `CARVE-OUT: ${CARVE_OUT_REASON}. Never combine legal_basis_proposed "Legitimate interests" with special-category data_categories.`,
  ].join("\n");
}

/**
 * PROMPT 12F item 2 — CONSTRAINT SALIENCE. Compact hard-constraint block placed
 * at the VERY TOP of the perfect-variant generation prompt, before the contract
 * render. The full guidance below it is unchanged.
 */
// QB-REPAIR-2 (2026-08-27) — live batch 510a9953: DPIA's perfect variant
// aborted 4/4 on the closed-loop lint (checkPerfectDpiaIntake, via
// buildLegalBasis's checkNonLiBasis in build.ts) with record_insufficient on
// the legal-basis surface. Root cause: whichever non-LI legal_basis_proposed
// the generator picks, build.ts's basis check requires a SPECIFIC coupled
// field to carry basis-specific language (e.g. Contract requires
// data_subjects to use party-relationship wording like "customers" or
// "applicants" — CONTRACT_PARTY_LEXICON), but nothing in the base generation
// prompt ever told the generator this coupling exists. The single post-
// rejection repair retry (perfectRetryGuidance) names the deficiency, but by
// then the model has already committed to subject/narrative language that
// often can't be patched by "add facts" alone, and the run exhausts its
// attempts. Naming the couplings UP FRONT (mirroring items 1-2 below, which
// exist for exactly this reason) is the fix — items 6-9 below.
export const PERFECT_HARD_CONSTRAINTS = [
  "HARD CONSTRAINTS — scenarios violating any of these are auto-rejected:",
  "(1) never legal_basis_proposed 'Legitimate interests' with special-category data_categories;",
  "(2) never 'Legitimate interests' with 'Children's data';",
  "(3) secondary_uses follows RULE A or RULE B exactly;",
  "(4) every transfer flow fully resolved per the 9F forms;",
  "(5) complete sign-off block.",
  "(6) legal_basis_proposed 'Contract' (Art. 6(1)(b)) requires data_subjects to describe them as a party to the contract or taking a pre-contractual step at their own request — use words like \"customers\", \"clients\", \"subscribers\", \"employees\", \"applicants\", \"account holders\", \"policyholders\", \"members\", \"the insured\", \"borrowers\", or \"prospective customers/applying for …\"; generic descriptions like \"individuals whose data is processed\" do not qualify and will be rejected;",
  "(7) legal_basis_proposed 'Consent' (Art. 6(1)(a)) requires data_subject_rights_mechanisms or description to state HOW consent is captured (e.g. opt-in, consent banner/form, consent record) AND how it can be withdrawn (e.g. unsubscribe, preference centre);",
  "(8) legal_basis_proposed 'Legal obligation' (Art. 6(1)(c)) or 'Public task' (Art. 6(1)(e)) requires necessity_proportionality, nature_scope_context, reasons_to_conduct, or codes_of_conduct to NAME the specific instrument (a named Act, Regulation (EU) …, Directive …, or statute, with an Article or Section NUMBER spelled out as the word \"Article\" or \"Section\" — NEVER the \"§\" symbol, which the citation screen rejects outside a small US-statute allowlist) — describing the obligation generally, without naming the law, will be rejected;",
  "(9) legal_basis_proposed 'Vital interests' (Art. 6(1)(d)) requires either \"Health or medical data\" in data_categories or a stated life/safety/emergency scenario in the narrative/description/nature_scope_context fields.",
  // 3E9AD759-H1 (2026-08-27, live batch 3e9ad759) — the dpia run aborted on
  // exactly this gap: a secondary operation ("Employee Occupational Health
  // Monitoring Platform") had no alternatives_considered entry, tripping the
  // closed-loop gap ledger on both attempts. The per-operation coverage rule
  // was enforced by the lint but never stated to the generator.
  "(10) alternatives_considered must cover EVERY named processing operation — the primary activity AND each secondary operation kept under RULE A or RULE B — with at least one less-intrusive alternative PER OPERATION (named for that operation) and a specific rejection reason for each; an operation with no alternatives entry, or an alternative lacking its rejection reason, is auto-rejected.",
  // D1D2B3B8-H2 (2026-08-28, live batch d1d2b3b8) — the dpia run aborted 3/5
  // on exactly this: healthcare-flavoured scenarios whose NARRATIVE described
  // health-adjacent data (symptoms, treatment, wellness, medication) without
  // listing a special-category data_category, so constraint (1) never bit,
  // article_9_condition stayed empty, and the closed-loop gap ledger rejected
  // ("the described data may constitute special-category data; confirm and
  // identify an Art. 9(2) condition"). Two of the five also tripped the
  // 6(1)(f)+special-category carve-out (excluded from the perfect variant by
  // design — CEO ruling, PROMPT 9M). The rule is stated to the generator up
  // front, like items 6-10 before it.
  "(11) SPECIAL-CATEGORY-ADJACENT DATA: if the narrative, description, purpose or data_subjects text describes health-adjacent data (health conditions, symptoms, diagnoses, treatment, medication, wellness or fitness metrics, disability, mental health, genetic or biometric identifiers, sexual orientation, religious belief, trade-union membership, political opinions) — even without listing a special-category option in data_categories — the intake MUST list the matching special-category data_category AND set article_9_condition to a named Art. 9(2) condition. For the PERFECT variant specifically: never build a healthcare/medical/wellness scenario on 'Legitimate interests' (6(1)(f)+special-category is excluded from the perfect variant by design); use a different sector, or a non-LI basis with the Art. 9(2) condition named.",
].join("\n");

