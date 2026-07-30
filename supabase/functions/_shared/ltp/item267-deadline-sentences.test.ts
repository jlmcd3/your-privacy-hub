/**
 * ITEM 267 PART 2 — DEADLINE-SENTENCE PROSE (Build Issue 6R).
 *
 * Authority: CEO delegation 2026-07-30 (verbatim): "I agree to whatever the
 * teams recommend on each issue - except for issue 8. Go forward with all
 * other changes".
 *
 * Asserts every row's `deadline_sentence` reads as a natural standalone
 * sentence — no "by Ongoing —" / "by Prospective —" glue wart — while the
 * pinpoint text and the cohort distinction survive verbatim. The
 * `deadline_label` values (which carry the §2.2 marking prefixes) are
 * asserted UNCHANGED.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  CPPA_RISK_DEADLINES,
  CPPA_RISK_DEADLINE_INDEX,
  selectDeadlineOrFallback,
} from "../legal-test/cppa-risk-deadlines.ts";

Deno.test("item267 — no sentence contains the marker-glue wart", () => {
  for (const d of CPPA_RISK_DEADLINES) {
    assert(!/by\s+Ongoing\s+—/.test(d.deadline_sentence), `${d.id}: "by Ongoing —"`);
    assert(!/by\s+Prospective\s+—/.test(d.deadline_sentence), `${d.id}: "by Prospective —"`);
    assert(!/—/.test(d.deadline_sentence), `${d.id}: em-dash marker leaked into prose`);
    assert(/\.$/.test(d.deadline_sentence), `${d.id}: must end as a sentence`);
  }
});

Deno.test("item267 — §2.2 markings survive on the LABELS (unchanged)", () => {
  assertEquals(
    CPPA_RISK_DEADLINE_INDEX["d.assessment_record.pre_existing"].deadline_label,
    "Ongoing — 2027-12-31 (§ 7155(b))",
  );
  assertEquals(
    CPPA_RISK_DEADLINE_INDEX["d.assessment_record.prospective"].deadline_label,
    "Prospective — before initiating the processing (§ 7155(a))",
  );
});

Deno.test("item267 — dates + pinpoints preserved verbatim in prose", () => {
  const pre = CPPA_RISK_DEADLINE_INDEX["d.assessment_record.pre_existing"].deadline_sentence;
  assert(pre.includes("December 31, 2027"));
  assert(pre.includes("11 CCR § 7155(b)"));
  assert(pre.includes("ongoing obligation"));

  const admt = CPPA_RISK_DEADLINE_INDEX["d.admt_pre_use_notice.existing"].deadline_sentence;
  assert(admt.includes("January 1, 2027"));
  assert(admt.includes("11 CCR § 7220"));

  const prosp = CPPA_RISK_DEADLINE_INDEX["d.assessment_record.prospective"].deadline_sentence;
  assert(prosp.includes("prospectively"));
  assert(prosp.includes("11 CCR § 7155(a)"));
});

Deno.test("item267 — §2.3 ongoing-processing clause reads naturally, fallback intact", () => {
  const sel = selectDeadlineOrFallback("d.does_not_exist");
  assertEquals(sel.pin_fallback, true);
  assertEquals(sel.row.id, "d.ongoing_processing");
  assertEquals(
    sel.row.deadline_sentence,
    "Address this item immediately, before continuing the processing, because no statutory deadline extends the compliance date.",
  );
  assertEquals(sel.row.deadline_label, "Immediate (before continuing the processing)");
});
