// BATCH a77240e3 (2026-09-12) — ChatGPT's "Report Prose Review v5" plus
// Claude's independent code check agreed on two real EU/UK Notice defects,
// both confirmed directly against a rendered PDF from the batch.
//
// EUN5-01 — the notice named an EEA establishment address in Section 1 while
// asserting "not established in the EEA" (no Art. 27 representative
// suppressed, no lead authority named) a few sections later —
// `establishment_jurisdiction` and the free-text controller_address/
// gdpr_dpa_contact fields have no cross-validation. Fixed with a banner that
// surfaces the conflict rather than silently picking a side.
// EUN5-02 — the Art. 22 lead sentence asserted "We make decisions based
// solely on automated processing... that produce legal effects" whenever
// automated_decisions === "yes", even when the SAME record's detail field
// said "No legal or equivalently significant effects arise" two paragraphs
// later — a direct, customer-visible contradiction.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildNoticeHtml, type FwSel } from "../../../supabase/functions/generate-eu-notice/index.ts";
import { establishmentConsistencyBannerHtml } from "../../../supabase/functions/generate-eu-notice/_local/validate.ts";

const EU: FwSel = { framework_code: "EU_GDPR", framework_name: "EU GDPR", region: "EU" };
const AT = "September 12, 2026";

function baseAnswers(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    controller_name: "Luminet Advertising Group Ltd",
    controller_address: "10 Viaduct Gardens, London SW11 7BW, United Kingdom (with EU establishment: Luminet Advertising Group BV, Prins Bernhardplein 200, 1097 JB Amsterdam, Netherlands)",
    contact_email: "privacy@luminet-adgroup.eu",
    processing_purposes: ["advertising"],
    data_categories: ["identifiers"],
    lawful_basis: ["consent"],
    establishment_jurisdiction: "outside",
    gdpr_dpa_contact: "Autoriteit Persoonsgegevens (Netherlands)",
    automated_decisions: "yes",
    ...over,
  };
}

// ── EUN5-01 ────────────────────────────────────────────────────────────────

Deno.test("EUN5-01 — a banner fires when establishment_jurisdiction says 'outside' but the controller address reads as EEA/UK", () => {
  const banner = establishmentConsistencyBannerHtml(baseAnswers());
  assertStringIncludes(banner, "ESTABLISHMENT ANSWER MAY CONFLICT");
});

Deno.test("EUN5-01 — no banner when establishment_jurisdiction is consistent with the address (no regression)", () => {
  const banner = establishmentConsistencyBannerHtml(baseAnswers({ establishment_jurisdiction: "eea" }));
  assert(banner === "", "expected no banner for a consistent record");
});

Deno.test("EUN5-01 — no banner when establishment_jurisdiction is genuinely outside and the address is genuinely outside too (no false positive)", () => {
  const banner = establishmentConsistencyBannerHtml({
    establishment_jurisdiction: "outside",
    controller_address: "500 Market Street, San Francisco, CA, United States",
    gdpr_dpa_contact: "",
  });
  assert(banner === "", "expected no banner for a genuinely-outside record");
});

Deno.test("EUN5-01 — the banner is wired into the rendered notice document", () => {
  const html = buildNoticeHtml({ fw: EU, answers: baseAnswers({ automated_decisions: "no" }), generatedAtHuman: AT });
  assertStringIncludes(html, "ESTABLISHMENT ANSWER MAY CONFLICT");
});

// ── EUN5-02 ────────────────────────────────────────────────────────────────

Deno.test("EUN5-02 — 'yes' contradicted by a 'no legal ... significant effects' detail routes through the confirm-first prompt, not the flat assertion", () => {
  const html = buildNoticeHtml({
    fw: EU,
    answers: baseAnswers({
      automated_decisions: "yes",
      automated_decisions_detail: "No legal or equivalently significant effects arise from individual ad-serving decisions, but the profiling that feeds them is systematic and large-scale.",
    }),
    generatedAtHuman: AT,
  });
  assert(!html.includes("We make decisions based solely on automated processing"), "must not assert the Art. 22 lead sentence its own detail contradicts");
  assertStringIncludes(html, "confirm whether we make decisions based solely on automated processing");
  assertStringIncludes(html, "which appears to say the opposite");
  assertStringIncludes(html, "No legal or equivalently significant effects arise");
});

Deno.test("EUN5-02 — 'yes' with detail that does NOT contradict still asserts the Art. 22 lead sentence (no regression)", () => {
  const html = buildNoticeHtml({
    fw: EU,
    answers: baseAnswers({
      automated_decisions: "yes",
      automated_decisions_detail: "Each application is scored by an automated underwriting model that determines loan eligibility without human review.",
    }),
    generatedAtHuman: AT,
  });
  assertStringIncludes(html, "We make decisions based solely on automated processing");
  assert(!html.includes("which appears to say the opposite"));
});

Deno.test("EUN5-02 — 'yes' with no detail at all still asserts the Art. 22 lead sentence (no regression)", () => {
  const html = buildNoticeHtml({ fw: EU, answers: baseAnswers({ automated_decisions: "yes", automated_decisions_detail: "" }), generatedAtHuman: AT });
  assertStringIncludes(html, "We make decisions based solely on automated processing");
});
