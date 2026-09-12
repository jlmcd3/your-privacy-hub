// BATCH d573cc4f (2026-09-12) — ChatGPT's "Report Prose Review v6" plus
// Claude's independent code check agreed on two real EU/UK Notice defects.
//
// EUN6-01 — AUTOMATED_EFFECTS_NEGATION_RE (added last round for EUN5-02)
// only matched "no legal ... significant effects" with the negator directly
// adjacent to "legal" and a tight 60-char gap to "significant effects" —
// missed phrasings where more words intervene between the negator and
// "legal", or a longer (but still 80-char-bounded) gap to "significant
// effects".
//
// EUN6-03 — data_source_categories' "other" option ("Other third-party
// source") rendered verbatim with no companion free-text field anywhere in
// the intake schema — a data subject reading it learns nothing. Consistent
// with this generator's no-new-intake-fields convention (doc 180), it now
// renders as a bracketed completion prompt instead.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildNoticeHtml, type FwSel } from "../../../supabase/functions/generate-eu-notice/index.ts";

const EU: FwSel = { framework_code: "EU_GDPR", framework_name: "EU GDPR", region: "EU" };
const AT = "September 12, 2026";

function baseAnswers(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    controller_name: "Velorix Digital Ltd",
    controller_address: "1 High Street, London EC1A 1AA, United Kingdom",
    contact_email: "privacy@velorix.example",
    processing_purposes: ["advertising"],
    data_categories: ["identifiers"],
    lawful_basis: ["consent"],
    establishment_jurisdiction: "eea",
    automated_decisions: "no",
    ...over,
  };
}

// ── EUN6-01 ──────────────────────────────────────────────────────────────

Deno.test("EUN6-01 — a negator separated from 'legal' by intervening words is now caught (no longer requires 'no legal' adjacency)", () => {
  const html = buildNoticeHtml({
    fw: EU,
    answers: baseAnswers({
      automated_decisions: "yes",
      automated_decisions_detail: "No decision output in this feature triggers legal or similarly significant effects for a data subject, though the underlying scoring is fully automated.",
    }),
    generatedAtHuman: AT,
  });
  assert(!html.includes("We make decisions based solely on automated processing"), "must not assert the Art. 22 lead sentence its own detail contradicts, even with words between the negator and 'legal'");
  assertStringIncludes(html, "confirm whether we make decisions based solely on automated processing");
  assertStringIncludes(html, "which appears to say the opposite");
});

Deno.test("EUN6-01 — a wider (but still bounded) gap between 'legal' and 'significant effects' is now caught (60→80 char widening)", () => {
  const html = buildNoticeHtml({
    fw: EU,
    answers: baseAnswers({
      automated_decisions: "yes",
      automated_decisions_detail: "No legal, contractual, disciplinary, reputational, or otherwise materially significant effects are produced by this scoring step, which is fully automated end to end.",
    }),
    generatedAtHuman: AT,
  });
  assert(!html.includes("We make decisions based solely on automated processing"), "must not assert the Art. 22 lead sentence when the wider gap still states no significant effects");
  assertStringIncludes(html, "which appears to say the opposite");
});

Deno.test("EUN6-01 — an unrelated 'no ... legal ... significant' passage far beyond 80 chars does NOT false-positive (no regression)", () => {
  const html = buildNoticeHtml({
    fw: EU,
    answers: baseAnswers({
      automated_decisions: "yes",
      automated_decisions_detail: "Each application is scored by an automated underwriting model that determines loan eligibility without human review, producing legally binding significant effects for the applicant.",
    }),
    generatedAtHuman: AT,
  });
  assertStringIncludes(html, "We make decisions based solely on automated processing");
});

// ── EUN6-03 ──────────────────────────────────────────────────────────────

Deno.test("EUN6-03 — the 'other' source category renders a completion prompt, not the bare 'Other third-party source' label", () => {
  const html = buildNoticeHtml({
    fw: EU,
    answers: baseAnswers({
      collection_source: "indirect",
      data_source_categories: ["public_sources", "other"],
    }),
    generatedAtHuman: AT,
  });
  assert(!html.includes("Other third-party source"), "the bare, empty enum label must not render verbatim");
  assertStringIncludes(html, '<em class="fi-fill">[specify the other source]</em>');
  // The other recorded category still renders normally alongside it.
  assertStringIncludes(html, "Publicly accessible sources");
});

Deno.test("EUN6-03 — a record with no 'other' category is unaffected (no regression)", () => {
  const html = buildNoticeHtml({
    fw: EU,
    answers: baseAnswers({
      collection_source: "indirect",
      data_source_categories: ["public_sources", "partners"],
    }),
    generatedAtHuman: AT,
  });
  assert(!html.includes("fi-fill\">[specify the other source]"));
  assertStringIncludes(html, "Publicly accessible sources");
  assertStringIncludes(html, "Business partners");
});
