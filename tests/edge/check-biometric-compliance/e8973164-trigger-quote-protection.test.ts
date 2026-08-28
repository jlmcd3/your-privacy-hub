// E8973164 (2026-08-28, quality batch, flagged HIGH) — `repairBiometricProse`'s
// `repairStatutoryTriggers` regex silently substituted the statute's own
// phrase ("within 3 years of the individual's last interaction with the
// entity") into a QUOTED intake fact inside `record_fact`
// ('Destruction trigger described: "Termination of employment relationship
// or 3 years from collection date, ..."'), producing a fabricated retention
// anchor AND, because the regex's optional with/in prefix could swallow the
// preceding word boundary's whitespace, a literal "orwithin" concatenation
// artifact. Quoted spans are now protected from this repair, and the regex
// itself no longer starts matching before "within" or the bare digit.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyBiometricProseGold,
  repairBiometricProse,
  repairStatutoryTriggers,
} from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-prose-gold.ts";

const QUOTED_TRIGGER =
  'Destruction trigger described: "Termination of employment relationship or 3 years from collection date, whichever occurs first, with automated Sunday purge in UKG Kronos Workforce Dimensions".';

Deno.test("E8973164 — a quoted intake fact is never rewritten by the statutory-trigger repair", () => {
  const out = repairBiometricProse(QUOTED_TRIGGER, []);
  assertEquals(out, QUOTED_TRIGGER, "the quoted company fact must survive byte-for-byte");
  assert(!out.includes("orwithin"), "no concatenation artifact");
  assert(!out.includes("last interaction with the entity"), "the statute's phrase must not replace the company's own words");
});

Deno.test("E8973164 — the walked report tree preserves a quoted retention fact in record_fact", () => {
  const report = {
    duty_findings: [
      { key: "il_bipa.15a_comply_with_schedule", record_fact: QUOTED_TRIGGER },
    ],
  };
  const { report: out } = applyBiometricProseGold(report as never, []);
  const rf = (out.duty_findings as Array<{ record_fact: string }>)[0].record_fact;
  assertEquals(rf, QUOTED_TRIGGER);
});

Deno.test("E8973164 — the repair still fires on an UNQUOTED misstated legal standard (item 412-B, unchanged)", () => {
  const misstated = "740 ILCS 14/15(a) measures the destruction obligation as within 3 years of collection.";
  const out = repairStatutoryTriggers(misstated);
  assert(out.includes("last interaction with the entity"), "the legal-standard repair itself must still work outside quotes");
  assert(!out.includes("collectionwithin") && !out.includes("aswithin"), "no boundary-swallowing artifact");
});

Deno.test("E8973164 — the regex never swallows a preceding word's whitespace", () => {
  const out = repairStatutoryTriggers("Destruction occurs or 3 years from collection date, whichever occurs first.");
  assert(!out.includes("orwithin"), `must not glue the preceding word to the replacement: ${out}`);
  assert(out.includes("or within 3 years of the individual's last interaction with the entity"));
});
