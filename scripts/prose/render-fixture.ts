#!/usr/bin/env -S deno run --allow-read --allow-env --allow-run
// ITEM 348 — BYTE-IDENTITY PROBE.
//
// Renders the cppa-risk golden fixture through the FULL prose pipeline and
// prints the rendered document followed by its SHA-256. The library can be
// loaded from either side of the Item 348 migration:
//
//   --source=file   the authored library JSON in `library/prose/` (pre-migration
//                   source of truth, byte-identical to the deleted TS literals)
//   --source=db     the `prose_frame_sets` / `prose_document_plans` rows, read
//                   through the same loader the edge functions use
//
// The two must produce byte-identical output. Any difference fails Item 348.
//
//   deno run --allow-read --allow-env --allow-run scripts/prose/render-fixture.ts --source=db

import { composeCppaRisk } from "../../supabase/functions/_shared/prose/plans/cppa-risk.compose.ts";
import { renderDocumentFromPlan } from "../../supabase/functions/_shared/prose/plan-render.ts";
import { buildActivityAnalytics } from "../../supabase/functions/_shared/ltp/analytic-deliverables/build.ts";
import { CPPA_RISK_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-risk.ts";
import {
  loadFrameSet,
  loadDocumentPlan,
  type ProseLibrarySource,
} from "../../supabase/functions/_shared/prose/library-source.ts";
import { fileLibrarySource } from "./file-source.ts";
import { psqlLibrarySource } from "./psql-source.ts";

const which = (Deno.args.find((a) => a.startsWith("--source=")) ?? "--source=file").slice(9);
const source: ProseLibrarySource = which === "db" ? psqlLibrarySource() : fileLibrarySource();

const fixture = CPPA_RISK_GOLDEN[0];
const intake = fixture.intake as Record<string, unknown>;
const analytics = buildActivityAnalytics(intake)[0];

const t0 = performance.now();
const frameSet = await loadFrameSet("cppa-risk", source);
const plan = await loadDocumentPlan("cppa-risk", source);
const coldMs = performance.now() - t0;

// Warm read — must not touch the source again (one read per isolate).
const t1 = performance.now();
await loadFrameSet("cppa-risk", source);
await loadDocumentPlan("cppa-risk", source);
const warmMs = performance.now() - t1;

// Approval is simulated IN MEMORY ONLY; the rows stay `approved = false`.
const framesInMemory = {
  ...frameSet,
  approved: true,
  frames: frameSet.frames.map((f) => ({ ...f, status: "approved" as const })),
};
const planInMemory = {
  ...plan,
  approved: true,
  sections: plan.sections.map((s) => ({ ...s, status: "approved" as const })),
};

const composed = composeCppaRisk({ intake, analytics, frames: framesInMemory });
const doc = renderDocumentFromPlan(planInMemory, composed.inputs, {
  mentions: { primary: composed.entity, shortForm: "the company" },
  graph: composed.graph,
});

const body = doc.sections
  .map((s) => `### ${s.title}${s.degraded ? " *(degraded)*" : ""}\n\n${s.text}`)
  .join("\n\n");

const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");

console.log(body);
console.error(`source=${which} sha256=${hash} bytes=${body.length}`);
console.error(`cold_load_ms=${coldMs.toFixed(1)} warm_load_ms=${warmMs.toFixed(1)}`);
