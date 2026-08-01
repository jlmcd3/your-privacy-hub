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

Deno.test("F8 — realizer quotes free text verbatim and joins lists naturally", () => {
  const frame = CPPA_RISK_FRAMES.frames[0];
  const r = renderFrame(frame, {
    values: {
      entity_name: "Syntara Corp.",
      subject_anchor: "automated risk scoring of California customers",
      i1_categories: ["contact identifiers", "device identifiers", "transaction history"],
      i4b_sources: "directly from the consumer at signup",
      i2_retention_period: "24 months",
    },
    resolveCite: () => null,
  });
  assert(r.rendered?.includes("“Syntara Corp.”"), r.rendered ?? "");
  assert(r.rendered?.includes("contact identifiers, device identifiers, and transaction history"));
  assertEquals(r.cites_filled.length, 0);
});

Deno.test("F9 — FILL-OR-OMIT: a silent required placeholder degrades, never half-fills", () => {
  const frame = CPPA_RISK_FRAMES.frames[0];
  const r = renderFrame(frame, { values: { entity_name: "Syntara Corp." } });
  assertEquals(r.rendered, null);
  assertEquals(r.omitted, true);
  assert(r.missing_required.includes("i2_retention_period"));
});

Deno.test("F10 — CITE slots fill only from the registry resolver", () => {
  const frame = CPPA_RISK_FRAMES.frames[2];
  const r = renderFrame(frame, {
    values: { subject_anchor: "risk scoring", i6_vendors: ["AWS", "Snowflake"] },
    resolveCite: (k) => (k === "scope_of_assessment" ? "Cal. Code Regs. tit. 11, § 7150(b)." : null),
  });
  assert(r.rendered?.includes("§ 7150(b)"));
  assertEquals([...r.cites_filled], ["scope_of_assessment"]);
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
