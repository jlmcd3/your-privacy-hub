// Fleet ToA numeric ordering (CEO-ratified 2026-08-26) — pins the rule that
// resolved the fleet-standing "ToA numeric pinpoint ordering" item: numeric
// ascending on every embedded number, letters after numbers within a
// paragraph, prefix before its extensions. The batch-2 defect this fixes
// rendered the 35-group as "Art. 35(11), (7), (7)(a), (7)(b), (7)(c),
// (7)(d), (9)".

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { naturalCitationCompare } from "../../../supabase/functions/_shared/ltp/citation-order.ts";

Deno.test("the confirmed batch-2 defect set orders numerically, prefix-first", () => {
  const shuffled = [
    "GDPR Art. 35(11)",
    "GDPR Art. 35(7)",
    "GDPR Art. 35(7)(a)",
    "GDPR Art. 35(7)(b)",
    "GDPR Art. 35(7)(c)",
    "GDPR Art. 35(7)(d)",
    "GDPR Art. 35(9)",
  ];
  assertEquals([...shuffled].sort(naturalCitationCompare), [
    "GDPR Art. 35(7)",
    "GDPR Art. 35(7)(a)",
    "GDPR Art. 35(7)(b)",
    "GDPR Art. 35(7)(c)",
    "GDPR Art. 35(7)(d)",
    "GDPR Art. 35(9)",
    "GDPR Art. 35(11)",
  ]);
});

Deno.test("article numbers order numerically across the group (9 before 13 before 35)", () => {
  const shuffled = ["GDPR Art. 35(1)", "GDPR Art. 9(2)(h)", "GDPR Art. 13(1)", "GDPR Art. 9(1)"];
  assertEquals([...shuffled].sort(naturalCitationCompare), [
    "GDPR Art. 9(1)",
    "GDPR Art. 9(2)(h)",
    "GDPR Art. 13(1)",
    "GDPR Art. 35(1)",
  ]);
});

Deno.test("regime prefixes and non-GDPR strings stay lexicographic where no digits differ", () => {
  const shuffled = ["UK GDPR Art. 5(1)", "GDPR Art. 5(1)"];
  assertEquals([...shuffled].sort(naturalCitationCompare), [
    "GDPR Art. 5(1)",
    "UK GDPR Art. 5(1)",
  ]);
});

Deno.test("statute citations with schedule/part/paragraph numbers order numerically", () => {
  const shuffled = [
    "Data Protection Act 2018, Sch. 1, Pt. 4, para. 39",
    "Data Protection Act 2018, Sch. 1, Pt. 1, para. 1",
  ];
  assertEquals([...shuffled].sort(naturalCitationCompare), [
    "Data Protection Act 2018, Sch. 1, Pt. 1, para. 1",
    "Data Protection Act 2018, Sch. 1, Pt. 4, para. 39",
  ]);
});

Deno.test("comparator is total and deterministic (equal strings compare 0, antisymmetric)", () => {
  assertEquals(naturalCitationCompare("GDPR Art. 35(7)", "GDPR Art. 35(7)"), 0);
  const a = "GDPR Art. 35(7)";
  const b = "GDPR Art. 35(11)";
  assertEquals(Math.sign(naturalCitationCompare(a, b)), -Math.sign(naturalCitationCompare(b, a)));
});
