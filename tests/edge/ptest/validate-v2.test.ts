// /all-ptest v2 (DOC 261) — STAGE 3 validator: every drop reason has a case,
// every keep path has a case.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { lookupIntake, validateWorkerFindings, valueMatches, type ValidationContext } from "../../../supabase/functions/_shared/review/validate-v2.ts";
import { REGISTRY_PACKS } from "../../../supabase/functions/_shared/review/packs/index.ts";

const BLOCK_A = "The Company answers “Yes” to processing sensitive personal information, and the Activity falls within the risk-assessment obligation.";
const BLOCK_B = "Section 7155(a)(1) requires a risk assessment before the Company initiates processing that falls within § 7150(b).";
const BLOCK_C = "The Company records approval by L. Whitcomb on 2026-08-01.";

const ctx: ValidationContext = {
  documentText: [BLOCK_A, BLOCK_B, BLOCK_C].join("\n\n"),
  blocks: new Map([["ii_information:4", BLOCK_A], ["v_governance:4", BLOCK_B], ["v_governance:1", BLOCK_C]]),
  intake: {
    q5_spi: "Yes",
    entity_name: "Sierra Outfitters, Inc.",
    a6_safeguards: [{ safeguard: "Encryption at rest" }, { safeguard: "MFA on all decision systems" }],
    impact_intake: { benefitsOutweigh: "Yes" },
    q4_pi_categories: ["Contact identifiers (name, email, phone)", "Financial information"],
  },
  registryPack: REGISTRY_PACKS["cppa-risk"],
};

Deno.test("lookupIntake — dotted and bracket paths resolve; missing paths report not found", () => {
  assertEquals(lookupIntake(ctx.intake, "q5_spi"), { found: true, value: "Yes" });
  assertEquals(lookupIntake(ctx.intake, "a6_safeguards[1].safeguard"), { found: true, value: "MFA on all decision systems" });
  assertEquals(lookupIntake(ctx.intake, "a6_safeguards.0.safeguard"), { found: true, value: "Encryption at rest" });
  assertEquals(lookupIntake(ctx.intake, "impact_intake.benefitsOutweigh"), { found: true, value: "Yes" });
  assertEquals(lookupIntake(ctx.intake, "no_such").found, false);
  assertEquals(lookupIntake(ctx.intake, "a6_safeguards[9].safeguard").found, false);
});

Deno.test("valueMatches — scalars normalise, an array element matches, objects compare as JSON", () => {
  assert(valueMatches("yes", "Yes"));
  assert(valueMatches("“Yes”", "Yes"));
  assert(valueMatches("Financial information", ["Contact identifiers (name, email, phone)", "Financial information"]));
  assert(!valueMatches("No", "Yes"));
  assert(valueMatches(null, ""));
  assert(valueMatches('{"benefitsOutweigh":"Yes"}', { benefitsOutweigh: "Yes" }));
});

Deno.test("W-RECORD — contradicts keeps on a matching value, drops on a mismatch or an unknown key; unsupported needs no stored value", () => {
  const r = validateWorkerFindings("W-RECORD", {
    findings: [
      { id: "ok", block_key: "ii_information:4", intake_key: "q5_spi", intake_value: "Yes", quote: "answers “Yes” to processing sensitive personal information", kind: "contradicts", mismatch: "x", severity: "high" },
      { id: "mismatch", block_key: "ii_information:4", intake_key: "q5_spi", intake_value: "No", quote: "answers “Yes” to processing sensitive personal information", kind: "contradicts", mismatch: "x", severity: "high" },
      { id: "unknown", block_key: "ii_information:4", intake_key: "q99_nothing", intake_value: "Yes", quote: "answers “Yes” to processing sensitive personal information", kind: "contradicts", mismatch: "x", severity: "high" },
      { id: "unsupported", block_key: "ii_information:4", intake_key: "q99_nothing", intake_value: null, quote: "falls within the risk-assessment obligation", kind: "unsupported", mismatch: "no value supports this", severity: "editorial" },
      { id: "nested", block_key: "ii_information:4", intake_key: "a6_safeguards[1].safeguard", intake_value: "MFA on all decision systems", quote: "falls within the risk-assessment obligation", kind: "omitted", mismatch: "x", severity: "editorial" },
    ],
  }, ctx);
  assertEquals(r.findings.map((f) => f.id).sort(), ["nested", "ok", "unsupported"]);
  assertEquals(r.dropped.map((d) => `${d.id}:${d.reason}`).sort(), ["mismatch:value_mismatch", "unknown:unknown_intake_key"]);
  assertEquals(r.findings.find((f) => f.id === "ok")?.why, "x");
});

Deno.test("quote law — an unlocatable quote drops; a short quote drops; a quote in another block is re-anchored; an unknown block with no locatable quote drops", () => {
  const r = validateWorkerFindings("W-REASON", {
    findings: [
      { id: "unloc", block_key_a: "ii_information:4", quote_a: "This sentence is not in the document at all.", kind: "broken_chain", why: "x", severity: "high" },
      { id: "short", block_key_a: "ii_information:4", quote_a: "Company", kind: "broken_chain", why: "x", severity: "high" },
      { id: "reanchor", block_key_a: "ii_information:4", quote_a: "records approval by L. Whitcomb", kind: "broken_chain", why: "x", severity: "high" },
      { id: "unknownblock", block_key_a: "nowhere:9", quote_a: "records approval by L. Whitcomb", kind: "broken_chain", why: "x", severity: "high" },
      { id: "twoblocks", block_key_a: "v_governance:4", quote_a: "requires a risk assessment before the Company initiates processing", block_key_b: "v_governance:1", quote_b: "approval by L. Whitcomb on 2026-08-01", kind: "contradiction", why: "x", severity: "critical" },
    ],
  }, ctx);
  const byId = Object.fromEntries(r.findings.map((f) => [f.id, f]));
  assertEquals(r.dropped.map((d) => `${d.id}:${d.reason}`).sort(), ["short:unlocatable_quote", "unloc:unlocatable_quote"]);
  assertEquals(byId.reanchor.block_key, "v_governance:1");
  assertEquals(byId.reanchor.reanchored, true);
  assertEquals(byId.unknownblock.block_key, "v_governance:1");
  assertEquals(byId.twoblocks.block_key_b, "v_governance:1");
  assertEquals(byId.twoblocks.severity, "critical");
});

Deno.test("W-LAW — a bound finding needs a real row and a verbatim registry quote; NO ROW findings pass; unbound statements pass through with locatability", () => {
  const r = validateWorkerFindings("W-LAW", {
    findings: [
      { id: "bound-ok", block_key: "v_governance:4", binding: "bound", registry_row_id: "ra_when_required", registry_quote: "must conduct a risk assessment", quote: "requires a risk assessment before the Company initiates processing", divergence: "x", severity: "high" },
      { id: "bad-row", block_key: "v_governance:4", binding: "bound", registry_row_id: "no_such_row", registry_quote: "anything", quote: "requires a risk assessment before the Company initiates processing", divergence: "x", severity: "high" },
      { id: "misquote", block_key: "v_governance:4", binding: "bound", registry_row_id: "ra_when_required", registry_quote: "this text is not in the row", quote: "requires a risk assessment before the Company initiates processing", divergence: "x", severity: "high" },
      { id: "no-row", block_key: "v_governance:4", binding: "unbound", registry_row_id: null, registry_quote: null, quote: "requires a risk assessment before the Company initiates processing", divergence: "NO ROW: no registry text covers the initiation timing", severity: "editorial" },
      { id: "bound-no-row", block_key: "v_governance:4", binding: "bound", registry_row_id: null, quote: "requires a risk assessment before the Company initiates processing", divergence: "x", severity: "high" },
    ],
    unbound_statements: [
      { block_key: "v_governance:4", quote: "requires a risk assessment before the Company initiates processing", proposed_row_id: "ra_when_required", consistent: true },
      { block_key: "v_governance:4", quote: "not in the document", proposed_row_id: null, consistent: false, note: "n" },
    ],
  }, ctx);
  assertEquals(r.findings.map((f) => f.id).sort(), ["bound-ok", "no-row"]);
  assertEquals(r.dropped.map((d) => `${d.id}:${d.reason}`).sort(), ["bad-row:unknown_registry_row", "bound-no-row:malformed", "misquote:misquoted_registry"]);
  assertEquals(r.unbound.map((u) => u.locatable), [true, false]);
});
