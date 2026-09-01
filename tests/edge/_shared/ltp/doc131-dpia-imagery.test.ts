// DOC 131 (DPIA batch, CEO-ratified 2026-09-01: doc 130 B1 option (a) + B1
// spec as drafted + detail companion + B2 fact-walk as drafted) — regression
// guards for the imagery-capture typed facts, the r10 risk spec, the
// Art. 35(3)(c) four-branch fact-walk, and the undetermined-branch follow-up.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDpiaDeliverables } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { DPIA_RISK_SPECS, IMAGERY_CAPTURE_NONE } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/elements.ts";
import { buildDpiaEngagementMap } from "../../../../supabase/functions/_shared/engagement-map.ts";
import {
  DPIA_IMAGERY_CAPTURE,
  DPIA_IMAGERY_SPACES,
  dpiaFrameworkContract,
} from "../../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";

const CAP_NONE = "No imagery or video of identifiable individuals";
const CAP_SUBJECTS = "Imagery or video in which identifiable individuals are the subjects";
const CAP_INCIDENTAL = "Imagery or video in which identifiable individuals appear incidentally";

const BASE = {
  organization_name: "North Gold GmbH",
  processing_activity_name: "Drone-based magnetic and visual surveys",
  description: "Fixed-wing and multirotor drones capture magnetometry and visual imagery over prospecting permits.",
  purpose: "Produce ortho-rectified mosaics",
  data_subjects: "Residents along transit corridors",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Imagery"],
  volume_frequency: "Weekly survey flights per permit block",
  retention_period: "30 days for raw frames",
  necessity_proportionality: "Blurring plus 30-day deletion is the least-intrusive means.",
};

Deno.test("doc131 — the contract carries the three imagery fields as fixed-choice/narrative optionals", () => {
  const byKey = new Map(dpiaFrameworkContract.fields.map((f) => [f.key, f]));
  const capture = byKey.get("imagery_capture");
  const spaces = byKey.get("imagery_capture_spaces");
  const detail = byKey.get("imagery_capture_detail");
  assertEquals(capture?.kind, "enum");
  assertEquals([...(capture?.options ?? [])], [...DPIA_IMAGERY_CAPTURE]);
  assertEquals(spaces?.kind, "enum");
  assertEquals([...(spaces?.options ?? [])], [...DPIA_IMAGERY_SPACES]);
  assertEquals(detail?.kind, "narrative");
  assertEquals(DPIA_IMAGERY_CAPTURE[0], IMAGERY_CAPTURE_NONE);
});

Deno.test("doc131 — the r10 spec exists with the ratified bytes and fires on the typed enum only", () => {
  const spec = DPIA_RISK_SPECS.find((s) => s.risk_id === "r10_imagery_identifiable_capture");
  assert(spec, "r10 spec missing");
  assertEquals(spec.severity, "Significant");
  assert(spec.source_template.includes("including individuals who are not the subjects of the processing"));
  assert([...spec.mitigating_safeguards].includes("Anonymisation"));
});

Deno.test("doc131 — the register carries the imagery risk iff the enum reports capture", () => {
  const withCapture = buildDpiaDeliverables({ ...BASE, imagery_capture: CAP_INCIDENTAL });
  const register = (withCapture as unknown as { risk_register: Array<{ risk_id?: string }> }).risk_register;
  assert(register.some((r) => r.risk_id === "r10_imagery_identifiable_capture"), "imagery risk missing from register");

  const noCapture = buildDpiaDeliverables({ ...BASE, imagery_capture: CAP_NONE });
  const register2 = (noCapture as unknown as { risk_register: Array<{ risk_id?: string }> }).risk_register;
  assert(!register2.some((r) => r.risk_id === "r10_imagery_identifiable_capture"), "imagery risk fired on the No answer");

  const legacy = buildDpiaDeliverables({ ...BASE });
  const register3 = (legacy as unknown as { risk_register: Array<{ risk_id?: string }> }).risk_register;
  assert(!register3.some((r) => r.risk_id === "r10_imagery_identifiable_capture"), "imagery risk fired without the typed fact");
});

function art35_3c(intake: Record<string, unknown>) {
  const map = buildDpiaEngagementMap(intake, {} as never);
  const entry = (map as unknown as { entries: Array<{ rule_id: string; status: string; rationale: string }> }).entries
    .find((e) => e.rule_id === "R_ART_35_3_C_PUBLIC_MONITORING");
  assert(entry, "35(3)(c) entry missing");
  return entry;
}

Deno.test("doc131 — 35(3)(c) legacy path (no typed facts) keeps the lexicon behavior byte-identical", () => {
  const e = art35_3c({ ...BASE });
  assertEquals(e.status, "engaged"); // "drone"/"aerial" lexicon (08-31 triage) fires on the description
  assert(e.rationale.includes("CCTV / public-space monitoring"), "legacy rationale changed");
});

Deno.test("doc131 — 35(3)(c) incidental branch: not engaged, bound to the incidental character", () => {
  const e = art35_3c({ ...BASE, imagery_capture: CAP_INCIDENTAL, imagery_capture_spaces: "Publicly accessible spaces" });
  assertEquals(e.status, "not_engaged");
  assert(e.rationale.includes("incidental to"), "incidental reasoning missing");
  assert(e.rationale.includes("the trigger must be re-run"), "bound-determination sentence missing");
  assert(e.rationale.includes('The record states: "Imagery or video in which identifiable individuals appear incidentally"'), "lead fact-splice missing");
});

Deno.test("doc131 — 35(3)(c) subjects + public spaces: engaged with the ratified sentence", () => {
  const e = art35_3c({ ...BASE, imagery_capture: CAP_SUBJECTS, imagery_capture_spaces: "Publicly accessible spaces" });
  assertEquals(e.status, "engaged");
  assert(e.rationale.includes("systematic and large-scale, so Article 35(3)(c) is engaged"));
});

Deno.test("doc131 — 35(3)(c) subjects + private premises: not engaged on the publicly-accessible limb", () => {
  const e = art35_3c({ ...BASE, imagery_capture: CAP_SUBJECTS, imagery_capture_spaces: "Private or controlled premises" });
  assertEquals(e.status, "not_engaged");
  assert(e.rationale.includes("not publicly accessible areas"));
});

Deno.test("doc131 — 35(3)(c) subjects + spaces unanswered: protective-footing conditional + a labeled ledger follow-up", () => {
  const e = art35_3c({ ...BASE, imagery_capture: CAP_SUBJECTS });
  assertEquals(e.status, "conditional");
  assert(e.rationale.includes("more protective footing"));
  const d = buildDpiaDeliverables({ ...BASE, imagery_capture: CAP_SUBJECTS });
  const ledger = (d as unknown as { gap_ledger: Array<{ ask_class?: string; display_label?: string }> }).gap_ledger;
  const entry = ledger.find((g) => g.ask_class === "ask_imagery_spaces");
  assert(entry, "the promised follow-up is not in the gap ledger");
  assert(entry.display_label?.includes("publicly accessible"), "ledger entry unlabeled");
});

Deno.test("doc131 — the detail narrative is quoted verbatim and decides nothing", () => {
  const withDetail = art35_3c({
    ...BASE,
    imagery_capture: CAP_INCIDENTAL,
    imagery_capture_detail: "Survey corridors clip residential boundaries; faces are blurred before release.",
  });
  assert(withDetail.rationale.includes('The Company adds: "Survey corridors clip residential boundaries'), "detail not quoted");
  assertEquals(withDetail.status, "not_engaged"); // same branch as without the detail
});

Deno.test("doc131 — 35(3)(c) capture answered No: not engaged, stated plainly", () => {
  const e = art35_3c({ ...BASE, imagery_capture: CAP_NONE });
  assertEquals(e.status, "not_engaged");
  assert(e.rationale.includes("No imagery or video of identifiable individuals is captured"));
});
