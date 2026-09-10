// DOC 250 B1 (CEO-ratified bytes, 2026-09-10) — the Section V device-access
// overlay sentence for a record whose company answered the device-access
// question "Yes" and the strict-necessity question "Yes" (gate determination
// `exemption_claimed_on_the_record`, doc 189). Pinned byte-exact: the CEO's
// own sentence, pinpointed to Art. 5(3) ePrivacy Directive / PECR reg 6, with
// no subject-to clause. A change here is a new CEO ruling, never a re-wording.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildLiaEngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";
import { eprivacyOverlayNote } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";

const RATIFIED =
  "The company states that the processing stores information on, or reads information from, individuals' devices only to the extent strictly necessary to provide a service the individual has requested. Under Article 5(3) of the ePrivacy Directive (Directive 2002/58/EC) (regulation 6 of the Privacy and Electronic Communications (EC Directive) Regulations 2003 in the United Kingdom), consent is not required in that context. This assessment records the statement but does not verify it.";

function overlayEntry(determination: string) {
  const map = buildLiaEngagementMap({}, undefined, undefined, determination) as unknown as {
    entries: Array<Record<string, unknown>>;
  };
  const entry = map.entries.find((e) => e.rule_id === "R_EPRIVACY_PECR");
  if (!entry) throw new Error("R_EPRIVACY_PECR entry missing");
  return { map, entry };
}

Deno.test("doc250 B1 — the exemption_claimed overlay rationale is the CEO-ratified sentence, byte for byte", () => {
  const { entry } = overlayEntry("exemption_claimed_on_the_record");
  assertEquals(entry.status, "not_engaged");
  assertEquals(entry.basis, "exemption_claimed");
  assertEquals(entry.rationale, RATIFIED);
});

Deno.test("doc250 B1 — Section V renders it as 'Separately, the company states …' with the ratified bytes and nothing else", () => {
  const { map } = overlayEntry("exemption_claimed_on_the_record");
  const note = eprivacyOverlayNote({ engagement_map: map } as Record<string, unknown>);
  assertEquals(note, `Separately, ${RATIFIED.charAt(0).toLowerCase()}${RATIFIED.slice(1)}`);
  assertEquals(note.includes("stated subject to it"), false, "the subject-to clause is retired");
  assertEquals(note.includes("ePrivacy Directive / PECR 2003"), false, "the un-pinpointed label is gone");
});

Deno.test("doc250 B1 — the other three gate determinations are untouched by the ratification", () => {
  for (const d of ["consent_requirement_engaged", "not_engaged_on_the_record", "undetermined_on_the_record"]) {
    const { entry } = overlayEntry(d);
    assertEquals(entry.rationale === RATIFIED, false, d);
    assertEquals(entry.basis, undefined, `${d} carries no exemption basis`);
  }
});
