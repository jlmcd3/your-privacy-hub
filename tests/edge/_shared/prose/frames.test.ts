// ITEM 338 (PROSE PROGRAM 2 of 4) — FRAME LINT + REALIZER TESTS.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Frame, type FrameSet, frameSetRenderable, lintFrame, lintFrameSet } from "../../../../supabase/functions/_shared/prose/frames.ts";
import { renderFrame, renderSectionFromFrames } from "../../../../supabase/functions/_shared/prose/frame-render.ts";
import { CPPA_RISK_FRAMES } from "../../../../library/prose/load.ts";

const base = (over: Partial<Frame>): Frame => ({
  id: "t.1",
  product: "cppa-risk",
  section: "s",
  body: "{{ENTITY}} does a thing.",
  placeholders: [{ token: "ENTITY", kind: "text", source: "entity_name", required: true }],
  provenance: {
    sample_report_id: null,
    tool_slug: "cppa_risk",
    report_path: "x",
    harvested_at: "2026-08-01",
    origin: "draft",
  },
  status: "pending_review",
  ...over,
});

Deno.test("F1 — hard gate: a hard-coded citation fails the harvest lint", () => {
  const f = base({ body: "{{ENTITY}} must document this under § 7152(a)(5)." });
  const rules = lintFrame(f).map((x) => x.rule);
  assert(rules.includes("hardcoded_citation"), JSON.stringify(rules));
});

Deno.test("F2 — hard gate: regulator/authority assertions fail", () => {
  const rules = lintFrame(base({ body: "{{ENTITY}} filed with the CPPA." })).map((x) => x.rule);
  assert(rules.includes("authority_assertion"));
});

Deno.test("F3 — hard gate: legal-standard paraphrase fails", () => {
  const rules = lintFrame(base({ body: "{{ENTITY}} is required to keep a record." })).map((x) => x.rule);
  assert(rules.includes("legal_standard"));
});

Deno.test("F4 — a {{CITE}} slot is allowed; a citation inside it is not needed", () => {
  const f = base({
    body: "{{ENTITY}} maintains the record. {{CITE_1:cite}}",
    placeholders: [
      { token: "ENTITY", kind: "text", source: "entity_name", required: true },
      { token: "CITE_1", kind: "cite", source: "record_keeping", required: false },
    ],
  });
  assertEquals(lintFrame(f), []);
});

Deno.test("F5 — degenerate harvest tokens are rejected", () => {
  const f = base({
    body: "{{ENTITY}} and {{0_}} appear.",
    placeholders: [
      { token: "ENTITY", kind: "text", source: "entity_name", required: true },
      { token: "0_", kind: "text", source: "a[0]", required: true },
    ],
  });
  assert(lintFrame(f).some((x) => x.rule === "malformed_placeholder"));
});

Deno.test("F6 — the shipped cppa-risk frame set is lint-clean", () => {
  assertEquals(lintFrameSet(CPPA_RISK_FRAMES), []);
});

Deno.test("F7 — nothing renders until the set is approved", () => {
  assertEquals(frameSetRenderable(CPPA_RISK_FRAMES), false);
  const r = renderSectionFromFrames(CPPA_RISK_FRAMES, "record_card_lead", { values: {} });
  assertEquals(r.used_frames, false);
  assertEquals(r.rendered, null);
});

// ITEM 363 — F8/F9/F10 re-pointed at the REVISED (Item 363) frame set. The
// Item 346 `processing_narrative` frame was retired with the rejected plan;
// `record_card_lead` is its successor, and it carries the same three slot
// types. F8 now asserts the ITEM 363 rule: intake-derived values carry NO
// quotation marks and are span-tracked instead.
const lead = () => CPPA_RISK_FRAMES.frames.find((f) => f.section === "record_card_lead")!;

const LEAD_VALUES = {
  "engine.entity_name": "Syntara Corp.",
  "engine.activity_name": "automated risk scoring of California customers",
  "engine.activity_purpose": "scoring accounts for fraud review",
};

Deno.test("F8 — ITEM 363: intake values render unquoted and span-tracked", () => {
  const r = renderFrame(lead(), { values: LEAD_VALUES });
  const raw = r.rendered ?? "";
  const clean = extractSpans(raw);
  assert(clean.text.includes("Syntara Corp."), clean.text);
  assertEquals(clean.text.includes("\u201c"), false);
  assertEquals(clean.text.includes('"'), false);
  assert(clean.text.includes("The company states that the activity assessed is"), clean.text);
});

Deno.test("F9 — FILL-OR-OMIT: a silent required placeholder degrades, never half-fills", () => {
  const r = renderFrame(lead(), { values: { "engine.entity_name": "Syntara Corp." } });
  assertEquals(r.rendered, null);
  assertEquals(r.omitted, true);
  assert(r.missing_required.includes("engine.activity_purpose"));
});

Deno.test("F10 — CITE slots fill only from the caller's registry resolver", () => {
  const minimisation = CPPA_RISK_FRAMES.frames.find((f) => f.section === "risk_minimisation")!;
  const r = renderFrame(minimisation, {
    values: {
      "engine.necessity_paragraph": "The company has identified one element as necessary.",
      "engine.minimisation_phrase": "no element collected beyond what the stated purpose needs",
    },
    contract: "cppa-risk",
    // A caller-supplied resolver overrides the registry default entirely; a key
    // it declines to answer leaves a REQUIRED cite silent and the frame omits.
    resolveCite: () => null,
  });
  assertEquals(r.rendered, null);
  assert(r.missing_required.length > 0);
});

Deno.test("F11 — an approved set renders; frame provenance is retained", () => {
  const approved: FrameSet = {
    ...CPPA_RISK_FRAMES,
    approved: true,
    frames: CPPA_RISK_FRAMES.frames.map((f) => ({ ...f, status: "approved" as const })),
  };
  const r = renderSectionFromFrames(approved, "record_card_lead", { values: LEAD_VALUES });
  assertEquals(r.used_frames, true);
  assertEquals(r.frame_id, "cppa-risk.record_card_lead.001");
  assert(extractSpans(r.rendered ?? "").text.includes("Syntara Corp."));
});

// ── ITEM 346/363 — THREE-SLOT-TYPE AND NO-FLATTENING GUARANTEES ────────
import { buildCppaRiskFrameValues } from "../../../../supabase/functions/_shared/prose/frames/cppa-risk.values.ts";
import { extractSpans } from "../../../../supabase/functions/_shared/prose/span-tracking.ts";
import { checkCoverage, collectCoverageAtoms } from "../../../../supabase/functions/_shared/prose/frame-coverage.ts";
import { CPPA_RISK_ENGINE_CONCLUSIONS, resolveEngineConclusion } from "../../../../supabase/functions/_shared/prose/engine-conclusions.ts";
import { CPPA_RISK_LEGAL_PHRASINGS } from "../../../../supabase/functions/_shared/prose/legal-phrasings.ts";
import { composeCppaRisk } from "../../../../supabase/functions/_shared/prose/plans/cppa-risk.compose.ts";
import { renderDocumentFromPlan } from "../../../../supabase/functions/_shared/prose/plan-render.ts";
import { CPPA_RISK_PLAN } from "../../../../library/prose/load.ts";
import { buildActivityAnalytics } from "../../../../supabase/functions/_shared/ltp/analytic-deliverables/build.ts";
import { CPPA_RISK_GOLDEN } from "../../../../supabase/functions/_shared/golden/cppa-risk.ts";

const SECTIONS_363 = CPPA_RISK_FRAMES.frames.map((f) => f.section);

function renderAll363(): string {
  const intake = CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>;
  const analytics = buildActivityAnalytics(intake)[0];
  const { values } = buildCppaRiskFrameValues({ intake, analytics });
  const approved: FrameSet = {
    ...CPPA_RISK_FRAMES,
    approved: true,
    frames: CPPA_RISK_FRAMES.frames.map((f) => ({ ...f, status: "approved" as const })),
  };
  return extractSpans(
    SECTIONS_363
      .map((s) => renderSectionFromFrames(approved, s, { values, contract: "cppa-risk" }).rendered ?? "")
      .join("\n"),
  ).text;
}

Deno.test("F12 — every section of the revised set renders on a COMPLETE record", () => {
  const intake = CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>;
  const analytics = buildActivityAnalytics(intake)[0];
  const { values } = buildCppaRiskFrameValues({ intake, analytics });
  const approved: FrameSet = {
    ...CPPA_RISK_FRAMES,
    approved: true,
    frames: CPPA_RISK_FRAMES.frames.map((f) => ({ ...f, status: "approved" as const })),
  };
  for (const section of SECTIONS_363) {
    const r = renderSectionFromFrames(approved, section, { values, contract: "cppa-risk" });
    assert(r.rendered, `${section} omitted: ${r.missing_required.join(", ")}`);
  }
});

Deno.test("F13 — NO FLATTENING: every composer atom survives into the framed render", () => {
  // ITEM 363 — coverage is judged on the WHOLE composed document, because the
  // plan now owns surfaces the frames do not carry (the record card lines and
  // the condition bullets). Frame-only coverage would report those as dropped
  // while the customer plainly reads them.
  const intake = CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>;
  const analytics = buildActivityAnalytics(intake)[0];
  const approvedFrames: FrameSet = {
    ...CPPA_RISK_FRAMES,
    approved: true,
    frames: CPPA_RISK_FRAMES.frames.map((f) => ({ ...f, status: "approved" as const })),
  };
  const composed = composeCppaRisk({ intake, analytics, frames: approvedFrames });
  const doc = renderDocumentFromPlan(
    {
      ...CPPA_RISK_PLAN,
      approved: true,
      sections: CPPA_RISK_PLAN.sections.map((x) => ({ ...x, status: "approved" as const })),
    },
    composed.inputs,
    { mentions: { primary: composed.entity, shortForm: "the company" }, graph: composed.graph },
  );
  const text = doc.sections.map((x) => x.text).join("\n");
  const report = checkCoverage(collectCoverageAtoms({ analytics }), text, {
    clauseFor: (k) => resolveEngineConclusion("cppa-risk", k),
  });
  assert(report.total > 0);
  assertEquals(report.findings.map((f) => `${f.atom.kind}@${f.atom.path}`), []);
});

Deno.test("F14 — cite slots resolve in a REVIEW render (no literal registry stub)", () => {
  const text = renderAll363();
  assert(text.includes("11 CCR §"), "no pinpoint resolved in the review render");
  assert(!text.includes("[registry:"), "review render printed a literal registry stub");
});

Deno.test("F15 — legal and conclusion slots are PINNED data, never frame prose", () => {
  for (const f of CPPA_RISK_FRAMES.frames) {
    for (const p of f.placeholders) {
      if (p.kind === "legal") {
        assert(CPPA_RISK_LEGAL_PHRASINGS[p.source], `${f.id}: unpinned legal ${p.source}`);
      }
      if (p.kind === "conclusion" && !p.source.startsWith("@")) {
        assert(
          CPPA_RISK_ENGINE_CONCLUSIONS[p.source.split("#")[0]],
          `${f.id}: unpinned conclusion ${p.source}`,
        );
      }
    }
  }
  for (const row of Object.values(CPPA_RISK_LEGAL_PHRASINGS)) assertEquals(row.status, "pinned");
  for (const row of Object.values(CPPA_RISK_ENGINE_CONCLUSIONS)) assertEquals(row.status, "pinned");
});

Deno.test("F16 — an engine determination with no pinned clause fails closed (silent, never invented)", () => {
  assertEquals(resolveEngineConclusion("cppa-risk", "consequence.not_a_real_decision"), null);
  assertEquals(resolveEngineConclusion("cppa-risk", "consequence.initiate#blocked"), null);
});

Deno.test("F17 — the revised set stays UNAPPROVED pending CEO sign-off", () => {
  assertEquals(CPPA_RISK_FRAMES.approved, false);
  assertEquals(frameSetRenderable(CPPA_RISK_FRAMES), false);
});
