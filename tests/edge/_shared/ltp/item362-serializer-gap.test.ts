/**
 * ITEM 362 — SERIALIZER GAP: submission_summary + next_steps.
 *
 * Run #186 (58.35) shipped the information-needed placeholder on both
 * surfaces for a record with `missing_data: 0`. Root cause was two emit-gate
 * degradations, not an absent determination:
 *   1. `e6_counsel_referral` fired on the SANCTIONED deterministic
 *      reserved-to-counsel register (§ 7157/§ 7155 + § 7121(a) schedule),
 *      degrading the whole `submission_summary` — taking the § 7120(b)
 *      prong postures and the cohort dates with it.
 *   2. `unterminated_sentence` fired on `next_steps` items whose template
 *      ends in a slot, because the slot renderer strips the value's terminal
 *      period when no template text follows.
 * Plus a projection gap: the schedule states all three tiers but never named
 * the deadline that follows from the ALREADY-RESOLVED revenue band
 * (qc_r1_4_cohort_determinism).
 */
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../../supabase/functions/_shared/ltp/generate-cppa-risk.ts";
import { ensureTerminalPunctuation } from "../../../../supabase/functions/_shared/ltp/pass2-render.ts";
import { isSanctionedCounselRegister } from "../../../../supabase/functions/_shared/emit-gate.ts";
import { renderResolvedCohortSentence } from "../../../../supabase/functions/_shared/ltp/cyber-audit-schedule.ts";

const PLACEHOLDER = "We could not verify this item from the information provided";

const raw = JSON.parse(
  await Deno.readTextFile(
    new URL("../../fixtures/item350/perfect-a073d9c5.json", import.meta.url),
  ),
);

const gen = await generateCppaRiskReport(raw, {
  buildStamp: "item362-test",
  runId: "item362-test",
  pass1: "deterministic",
  mode: "enforce",
  euCorpus: [],
});
const report = gen.report as Record<string, any>;

function flatten(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => flatten(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => flatten(x, out));
  return out;
}

// ITEM 428 (PIECE B) — re-homed per item428 Piece B: content unchanged, surface
// retired. The § 7120(b) prong postures, the § 7157(a)(1) submission timing,
// the § 7155(c) retention rule and the § 7121(a)(3) cohort deadline now ship
// on `submission_and_retention`, byte-for-byte as they shipped on
// `submission_summary`. Each pin below re-points to the new address; every
// content-level assertion is unchanged.
const submissionSurface = () =>
  flatten(report.submission_and_retention ?? report.submission_summary).join(" ");

Deno.test("[item362] qc_r1_2 — submission_and_retention carries the § 7120(b) prong statements", () => {
  const text = submissionSurface();
  assert(!text.includes(PLACEHOLDER), "submission_and_retention degraded to the placeholder");
  assert(/§\s*7120\(b\)/.test(text), "no § 7120(b) prong reference on submission_and_retention");
});

Deno.test("[item362] qc_r1_3 — § 7157 submission and § 7155 retention content present", () => {
  const text = submissionSurface();
  assert(/§\s*7157\(a\)\(1\)/.test(text), "missing § 7157(a)(1) submission timing");
  assert(/§\s*7155\(c\)/.test(text), "missing § 7155(c) retention rule");
});

Deno.test("[item362] qc_r1_4_cohort_determinism — resolved band names its § 7121(a) deadline", () => {
  const text = submissionSurface();
  assert(/§\s*7121\(a\)\(3\)/.test(text), "resolved $25M–$50M band did not name § 7121(a)(3)");
  assert(text.includes("April 1, 2030"), "resolved band did not name April 1, 2030");
});

Deno.test("[item362] cohort sentence is deterministic per band and conditional when unresolved", () => {
  assert(renderResolvedCohortSentence("$25M to under $50M", "2030-04-01").includes("April 1, 2030"));
  assert(renderResolvedCohortSentence("$50M to $100M", "2029-04-01").includes("April 1, 2029"));
  assert(renderResolvedCohortSentence("Over $100M", "2028-04-01").includes("April 1, 2028"));
  const indet = renderResolvedCohortSentence("not specified", "indeterminate");
  assert(indet.includes("April 1, 2029") && indet.includes("April 1, 2030"), "conditional missing");
});

Deno.test("[item362] next_steps is placeholder-free on a record with missing_data = 0", () => {
  const steps = flatten(report.next_steps);
  assert(steps.length > 0, "next_steps empty");
  for (const s of steps) {
    assert(!s.includes(PLACEHOLDER), `next_steps placeholder: ${s.slice(0, 120)}`);
  }
});

Deno.test("[item362] every next_steps item terminates as a sentence", () => {
  for (const s of flatten(report.next_steps)) {
    assert(/[.!?][")\]']?$/.test(s.trimEnd()), `unterminated next_step: ${s.slice(-80)}`);
  }
});

Deno.test("[item362] emit gate degraded nothing on the complete record", () => {
  const findings = (report._meta as any)?.internal?.emit_gate?.findings ?? [];
  assert(
    !flatten(report).some((s) => s.includes(PLACEHOLDER)) || findings.length === 0,
    `emit gate degraded customer prose: ${JSON.stringify(findings).slice(0, 300)}`,
  );
});

Deno.test("[item362] ensureTerminalPunctuation appends only when needed", () => {
  assert(ensureTerminalPunctuation("retain the file") === "retain the file.");
  assert(ensureTerminalPunctuation("retain the file.") === "retain the file.");
  assert(ensureTerminalPunctuation("see § 7152(a):") === "see § 7152(a):");
  assert(ensureTerminalPunctuation("") === "");
});

Deno.test("[item362] sanctioned counsel register is recognised; model referrals are not", () => {
  assert(
    isSanctionedCounselRegister(
      "The customer, in consultation with qualified legal counsel, determines the submission window.",
    ),
  );
  assert(
    isSanctionedCounselRegister(
      "This document is not legal advice and must be reviewed by qualified legal counsel before any operational use or reliance.",
    ),
  );
  assert(!isSanctionedCounselRegister("You should talk to your lawyer about this."));
});
