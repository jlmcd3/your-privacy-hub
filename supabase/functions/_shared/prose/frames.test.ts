// ITEM 338 (PROSE PROGRAM 2 of 4) — FRAME LINT + REALIZER TESTS.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Frame, type FrameSet, frameSetRenderable, lintFrame, lintFrameSet } from "./frames.ts";
import { renderFrame, renderSectionFromFrames } from "./frame-render.ts";
import { CPPA_RISK_FRAMES } from "./frames/cppa-risk.frames.ts";

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
  const r = renderSectionFromFrames(CPPA_RISK_FRAMES, "processing_narrative", { values: {} });
  assertEquals(r.used_frames, false);
  assertEquals(r.rendered, null);
});

// ITEM 346 — F8/F9/F10 re-pointed at the REVISED frames (the Item 338 slot
// paths they used were retired with the set the CEO rejected). record_echo is
// unchanged and still exercised by F11 on its original source paths.
const narrative = () =>
  CPPA_RISK_FRAMES.frames.find((f) => f.section === "processing_narrative")!;

Deno.test("F8 — realizer quotes free text verbatim and joins lists naturally", () => {
  const r = renderFrame(narrative(), {
    values: {
      entity_name: "Syntara Corp.",
      activity_name: "automated risk scoring of California customers",
      activity_purpose: "scoring accounts for fraud review",
      data_categories: ["contact identifiers", "device identifiers", "transaction history"],
      sources: "directly from the consumer at signup",
      retention_period: "24 months",
      vendors: ["AWS", "Snowflake"],
    },
  });
  assert(r.rendered?.includes("“Syntara Corp.”"), r.rendered ?? "");
  assert(r.rendered?.includes("contact identifiers, device identifiers, and transaction history"));
  // ITEM 346 — cite slots now resolve from the verified-authority registry by
  // default; the review-render literal "[registry: ...]" defect is gone.
  assert(r.rendered?.includes("11 CCR § 7152(a)(1)"), r.rendered ?? "");
  assertEquals([...r.cites_filled], ["ra_content_operational", "ra_content_purpose"]);
});

Deno.test("F9 — FILL-OR-OMIT: a silent required placeholder degrades, never half-fills", () => {
  const r = renderFrame(narrative(), { values: { entity_name: "Syntara Corp." } });
  assertEquals(r.rendered, null);
  assertEquals(r.omitted, true);
  assert(r.missing_required.includes("retention_period"));
});

Deno.test("F10 — CITE slots fill only from the caller's registry resolver", () => {
  const r = renderFrame(narrative(), {
    values: {
      entity_name: "Syntara Corp.",
      activity_name: "risk scoring",
      activity_purpose: "scoring accounts for fraud review",
      data_categories: ["contact identifiers"],
      sources: "directly from the consumer at signup",
      retention_period: "24 months",
      vendors: ["AWS", "Snowflake"],
    },
    // A caller-supplied resolver overrides the registry default entirely, and a
    // key it declines to answer leaves a REQUIRED cite silent — the frame then
    // omits rather than half-fills.
    resolveCite: (k) => (k === "ra_content_purpose" ? "Cal. Code Regs. tit. 11, § 7152(a)(1)." : null),
  });
  assertEquals(r.rendered, null);
  assertEquals([...r.missing_required], ["ra_content_operational"]);
  assertEquals([...r.cites_filled], ["ra_content_purpose"]);
});

Deno.test("F11 — an approved set renders; frame provenance is retained", () => {
  const approved: FrameSet = {
    ...CPPA_RISK_FRAMES,
    approved: true,
    frames: CPPA_RISK_FRAMES.frames.map((f) => ({ ...f, status: "approved" as const })),
  };
  const r = renderSectionFromFrames(approved, "record_echo", {
    values: {
      entity_name: "Syntara Corp.",
      q2_consumers: "Over 100,000",
      i6_vendors: ["AWS", "Snowflake", "Zendesk"],
      "impact_intake.safeguards": ["RBAC", "MFA"],
    },
  });
  assertEquals(r.used_frames, true);
  assertEquals(r.frame_id, "cppa-risk.record_echo.001");
  assert(r.rendered?.includes("AWS, Snowflake, and Zendesk"));
});

// ── ITEM 346 — THREE-SLOT-TYPE AND NO-FLATTENING GUARANTEES ────────────
import { buildCppaRiskFrameValues } from "./frames/cppa-risk.values.ts";
import { checkCoverage, collectCoverageAtoms } from "./frame-coverage.ts";
import { CPPA_RISK_ENGINE_CONCLUSIONS, resolveEngineConclusion } from "./engine-conclusions.ts";
import { CPPA_RISK_LEGAL_PHRASINGS } from "./legal-phrasings.ts";
import { buildActivityAnalytics } from "../ltp/analytic-deliverables/build.ts";
import { CPPA_RISK_GOLDEN } from "../golden/cppa-risk.ts";

const SECTIONS_346 = [
  "opening_analysis",
  "processing_narrative",
  "record_echo",
  "scope_notes",
  "necessity_analysis",
  "harm_analysis",
  "benefits_rationale",
];

function renderAll346(): string {
  const intake = CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>;
  const analytics = buildActivityAnalytics(intake)[0];
  const { values } = buildCppaRiskFrameValues({ intake, analytics });
  const approved: FrameSet = {
    ...CPPA_RISK_FRAMES,
    approved: true,
    frames: CPPA_RISK_FRAMES.frames.map((f) => ({ ...f, status: "approved" as const })),
  };
  return SECTIONS_346
    .map((s) => renderSectionFromFrames(approved, s, { values, contract: "cppa-risk" }).rendered ?? "")
    .join("\n");
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
  for (const section of SECTIONS_346) {
    const r = renderSectionFromFrames(approved, section, { values, contract: "cppa-risk" });
    assert(r.rendered, `${section} omitted: ${r.missing_required.join(", ")}`);
  }
});

Deno.test("F13 — NO FLATTENING: every composer atom survives into the framed render", () => {
  const intake = CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>;
  const analytics = buildActivityAnalytics(intake)[0];
  const report = checkCoverage(collectCoverageAtoms({ analytics }), renderAll346(), {
    clauseFor: (k) => resolveEngineConclusion("cppa-risk", k),
  });
  assert(report.total > 0);
  assertEquals(report.findings.map((f) => `${f.atom.kind}@${f.atom.path}`), []);
});

Deno.test("F14 — cite slots resolve in a REVIEW render (no literal registry stub)", () => {
  const text = renderAll346();
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
