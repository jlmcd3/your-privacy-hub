// FORK-R1 acceptance tests — additive registry renderers.
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  renderAiActCitationBlock,
  renderTransferAdequacyNote,
  renderGdprCitationBlock,
  AI_ACT,
} from "../../../supabase/functions/_shared/dpia-jurisdiction-registry.ts";
import {
  renderIcoPenaltyFigures,
  ICO_FIGURES,
} from "../../../supabase/functions/_shared/enforcement-figures-registry.ts";

Deno.test("AI Act block: identity + four current-law phased dates + Omnibus WATCH as pending", () => {
  const out = renderAiActCitationBlock();
  assertStringIncludes(out, "Regulation (EU) 2024/1689");
  assertStringIncludes(out, "1 August 2024");
  assertStringIncludes(out, "2 February 2025");
  assertStringIncludes(out, "2 August 2025");
  assertStringIncludes(out, "2 August 2026");
  assertStringIncludes(out, "2 August 2027");
  assertStringIncludes(out, "Digital Omnibus");
  assertStringIncludes(out, "2 December 2027");
  assertStringIncludes(out, "2 August 2028");
  // Pending framing (P4 / Team 3)
  assertStringIncludes(out, "NOT YET ADOPTED");
  assertStringIncludes(out, "pending");
  assertStringIncludes(out, AI_ACT.verifyAgainst);
  // Identity guard
  assertStringIncludes(out, "never call it a proposal");
});

Deno.test("Transfer-adequacy note: surfaces EU-UK 27 December 2031 + generic verify-note for others", () => {
  const out = renderTransferAdequacyNote();
  assertStringIncludes(out, "27 December 2031");
  assertStringIncludes(out, "19 December 2025");
  assertStringIncludes(out, "[Verify current status");
});

Deno.test("ICO penalty figures: exactly the four canonical amounts; training traps flagged; guard present", () => {
  const out = renderIcoPenaltyFigures();
  assertStringIncludes(out, "£7,552,800");
  assertStringIncludes(out, "£20,000,000");
  assertStringIncludes(out, "£4,400,000");
  assertStringIncludes(out, "£6,090,000");
  // Training traps surfaced
  assertStringIncludes(out, "£9M");
  assertStringIncludes(out, "£5.03M");
  assertStringIncludes(out, "£6.88M");
  // Load-bearing guard
  assertStringIncludes(out, "never use training-data figures");
  assertEquals(ICO_FIGURES.length, 4);
});

Deno.test("renderGdprCitationBlock is unchanged by FORK-R1 (P5 — no collateral output change)", () => {
  // The shared GDPR block must NOT contain adequacy/AI-Act/ICO content; those
  // live in separate renderers injected explicitly by registration + IR.
  const out = renderGdprCitationBlock({ regime: "gdpr", jurisdictions: ["DE"] });
  assertEquals(out.includes("27 December 2031"), false);
  assertEquals(out.includes("2024/1689"), false);
  assertEquals(out.includes("£7,552,800"), false);
  // Still emits the existing core content
  assertStringIncludes(out, "RESOLVED GDPR CITATIONS");
  assertStringIncludes(out, "EU GDPR");
});

Deno.test("Every figure carries lastVerified + verifyAgainst (P3)", () => {
  for (const f of ICO_FIGURES) {
    assert(f.lastVerified && /^\d{4}-\d{2}-\d{2}$/.test(f.lastVerified));
    assert(f.verifyAgainst.startsWith("https://"));
  }
  assert(AI_ACT.lastVerified && /^\d{4}-\d{2}-\d{2}$/.test(AI_ACT.lastVerified));
  assert(AI_ACT.verifyAgainst.startsWith("https://"));
});
