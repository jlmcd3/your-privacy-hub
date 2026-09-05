// DOC 188 (2026-09-05) — all-products batch e38460 (pinned data), Cyber P7.
// "Audit applicability — Resolve whether an independent cybersecurity audit is
// required (§ 7120)…" printed twice in Section 6: once as THE priority
// readiness action (DOC 137 promotion) and again as the first record-
// completion bullet (buildRecordCompletionExtras). FD703575-CY4: an action
// appears once. The Appendix C register keeps its ranked row — it reads the
// extras directly.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildReadinessActions,
  buildRecordCompletionExtras,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";

type Bag = Record<string, unknown>;

const unresolvedIntake = (): Bag => ({ profile: { entity_name: "Northwind Testing, Inc." }, controls: [] });
const applicabilityResolvedIntake = (): Bag => ({
  profile: { entity_name: "Northwind Testing, Inc.", q5_sell_share: "No", q1_revenue: "Under $25M" },
  controls: [],
});

Deno.test("doc188 P7 — the § 7120 applicability ask prints once: as the priority action, not again under record completion", () => {
  const intake = unresolvedIntake();
  const d = buildCyberDeliverables(intake);
  const actions = buildReadinessActions(intake, [], d);
  assertEquals(actions.priority_actions.length, 1);
  assert(actions.priority_actions[0].includes("§ 7120"));
  assert(
    !actions.record_completion_actions.some((a) => a.startsWith("Audit applicability —")),
    `duplicated: ${actions.record_completion_actions.join(" || ")}`,
  );
  // The other record-completion extras (auditor engagement) still print.
  assert(actions.record_completion_actions.some((a) => a.startsWith("Auditor engagement —")), actions.record_completion_actions.join(" || "));
});

Deno.test("doc188 P7 — the Appendix C register still carries the ranked 'Audit applicability' row", () => {
  const intake = unresolvedIntake();
  const d = buildCyberDeliverables(intake);
  assert(buildRecordCompletionExtras(intake, d).some((x) => x.label === "Audit applicability"));
  const out = assembleCyberSkeletonDocumentV4(d as unknown as Bag, intake, "", "2026-09-05");
  const appendix = out.document.sections.find((s) => s.id === "appendix_c_actions");
  const table = appendix?.paragraphs.find((p) => p.kind === "table")?.table;
  assert(table, "Appendix C table missing");
  assertEquals(table!.rows[0][1], "Audit applicability");
  assertEquals(table!.rows[0][0], "1");
});

Deno.test("doc188 P7 — once applicability is resolved nothing is filtered from record completion", () => {
  const intake = applicabilityResolvedIntake();
  const d = buildCyberDeliverables(intake);
  const actions = buildReadinessActions(intake, [], d);
  assert(actions.priority_actions[0].includes("§ 7122"));
  assert(!actions.record_completion_actions.some((a) => a.startsWith("Audit applicability —")));
  assert(actions.record_completion_actions.some((a) => a.startsWith("Auditor engagement —")));
});
