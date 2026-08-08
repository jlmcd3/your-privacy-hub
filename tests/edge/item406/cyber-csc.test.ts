// ITEM 406 LEG C — CYBER CSC: find-and-repair, honest absence, 403-A shape.
//
// Identities:
//   item406 linkage every prose-gold absence phrasing is detected
//   item406 linkage resolved labels are never absence
//   item406 cy1 repairs a component finding from the record register
//   item406 cy1 leaves a silent component byte-identical
//   item406 cy2 repairs a backed readiness surface
//   item406 cy2 repairs a backed evidence surface
//   item406 cy2 repairs the vendor oversight surface
//   item406 cy2 leaves an unbacked surface byte-identical
//   item406 403A evidence names only answered keys
//   item406 403A every primary key is independently sufficient
//   item406 403A no corroborating key backs a surface alone
//   item406 degraded goldens keep their honest absence byte-identical
//   item406 the audit-schedule sentences survive csc repair byte-identically
//   item406 the false-absence gate id is wired
//   item406 the pipeline stamp is the item406 value

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  answeredKeysForSurface,
  attachCyberCsc,
  CYBER_CSC_SURFACES,
  CYBER_CSC_VERSION,
  CYBER_LABEL_ABSENCE_RE,
  cyberCarriesAbsence,
  runCyberCsc,
  surfaceBacked,
} from "../../../supabase/functions/_shared/ltp/cyber-csc.ts";
import {
  CYBER_ABSENCE_LABEL_PHRASINGS,
} from "../../../supabase/functions/_shared/ltp/cyber-prose-gold.ts";
import { CYBER_PERFECT, CPPA_CYBER_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-cyber.ts";
import { FALSE_ABSENCE_CHECK_IDS } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { CYBER_PIPELINE_STAMP } from "../../../supabase/functions/_shared/prose/plans/cyber.spine.ts";
import {
  SCHEDULE_LITERALS,
  SCHEDULE_MARKER,
} from "../../../supabase/functions/_shared/ltp/cyber-audit-schedule.ts";

const PERFECT = CYBER_PERFECT[0].intake as Record<string, unknown>;
const ABSENCE = "The record does not yet carry a basis for this conclusion.";

function controlRow(slug: string, finding: string): Record<string, unknown> {
  return { key: slug, label: slug, finding };
}

// ── the item396 lesson: linkage ───────────────────────────────────────────

Deno.test("item406 linkage every prose-gold absence phrasing is detected", () => {
  assert(CYBER_ABSENCE_LABEL_PHRASINGS.length > 0);
  for (const phrase of CYBER_ABSENCE_LABEL_PHRASINGS) {
    assert(
      cyberCarriesAbsence(phrase, []),
      `prose-gold phrasing escaped the CSC detector: ${phrase}`,
    );
    assert(CYBER_LABEL_ABSENCE_RE.test(phrase), phrase);
  }
});

Deno.test("item406 linkage resolved labels are never absence", () => {
  for (const label of ["met on this record", "not met on this record", "audit-ready on this record"]) {
    assertEquals(cyberCarriesAbsence(label, []), null, label);
  }
});

// ── CY-1 both directions ──────────────────────────────────────────────────

Deno.test("item406 cy1 repairs a component finding from the record register", () => {
  const report: Record<string, unknown> = {
    controls: [controlRow("c1_auth", `Authentication. ${ABSENCE} Counsel should confirm.`)],
  };
  const t = runCyberCsc(report, { intake: PERFECT });
  const cy1 = t.violations.filter((v) => v.check_id === "cy1_control_finding_vs_record");
  assertEquals(cy1.length, 1);
  assertEquals(cy1[0].repaired, true);
  const finding = String((report.controls as any[])[0].finding);
  assertEquals(finding.includes(ABSENCE), false);
  assert(finding.length > 40, finding);
});

Deno.test("item406 cy1 leaves a silent component byte-identical", () => {
  const report: Record<string, unknown> = {
    controls: [controlRow("c1_auth", `Authentication. ${ABSENCE} Counsel should confirm.`)],
  };
  const before = JSON.stringify(report.controls);
  const t = runCyberCsc(report, { intake: { profile: {}, controls: [] } });
  assertEquals(t.violations.filter((v) => v.check_id === "cy1_control_finding_vs_record").length, 0);
  assertEquals(JSON.stringify(report.controls), before);
});

// ── CY-2 both directions, per surface class ───────────────────────────────

function cy2On(path: string, intake: unknown, node: Record<string, unknown>) {
  const report: Record<string, unknown> = path.includes("[")
    ? { [path.split("[")[0]]: [{ key: path.slice(path.indexOf("[") + 1, -1), ...node }] }
    : { [path]: node };
  const t = runCyberCsc(report, { intake });
  return { report, v: t.violations.filter((x) => x.check_id === "cy2_absence_claim_vs_record" && x.path === path) };
}

Deno.test("item406 cy2 repairs a backed readiness surface", () => {
  const { report, v } = cy2On("readiness_determination", PERFECT, { rationale: ABSENCE });
  assertEquals(v.length, 1);
  assertEquals(v[0].repaired, true);
  const node = report.readiness_determination as Record<string, unknown>;
  assertEquals(node.record_backed, true);
  assert(String(node.record_states).length > 40);
  // the shape is preserved: the original leaf is untouched.
  assertEquals(node.rationale, ABSENCE);
});

Deno.test("item406 cy2 repairs a backed evidence surface", () => {
  const { report, v } = cy2On("evidence_sufficiency[c2_encryption]", PERFECT, { assessment: ABSENCE });
  assertEquals(v.length, 1);
  assertEquals(v[0].repaired, true);
  const row = (report.evidence_sufficiency as any[])[0];
  assertEquals(row.record_backed, true);
  assert(String(row.record_states).length > 40);
});

Deno.test("item406 cy2 repairs the vendor oversight surface", () => {
  // The item404 defect (b) neighbourhood — third-party oversight.
  const { report, v } = cy2On("controls[c15_third_party]", PERFECT, { summary: ABSENCE });
  assertEquals(v.length, 1);
  assertEquals(v[0].repaired, true);
  assertEquals((report.controls as any[])[0].record_backed, true);
});

Deno.test("item406 cy2 leaves an unbacked surface byte-identical", () => {
  const intake = { profile: {}, controls: [] };
  const report: Record<string, unknown> = { readiness_determination: { rationale: ABSENCE } };
  const before = JSON.stringify(report.readiness_determination);
  const t = runCyberCsc(report, { intake });
  assertEquals(t.violations.filter((v) => v.check_id === "cy2_absence_claim_vs_record").length, 0);
  assertEquals(JSON.stringify(report.readiness_determination), before);
});

// ── the item403-A structural lessons ──────────────────────────────────────

Deno.test("item406 403A evidence names only answered keys", () => {
  // A record that answers exactly ONE key per surface must never produce an
  // evidence string naming the keys it does not answer.
  const intake = {
    profile: { auditor_engagement_status: PERFECT.profile && (PERFECT as any).profile.auditor_engagement_status },
    controls: [{ key: "c1_auth", notes: (PERFECT as any).controls[0].notes }],
  };
  for (const s of CYBER_CSC_SURFACES) {
    if (!surfaceBacked(s, intake)) continue;
    const answered = answeredKeysForSurface(s, intake);
    assert(answered.length > 0, s.path);
    for (const k of answered) {
      assertEquals(
        [...s.keys, ...(s.corroborating ?? [])].includes(k),
        true,
        `${s.path} named an undeclared key ${k}`,
      );
    }
    const unanswered = [...s.keys, ...(s.corroborating ?? [])].filter((k) => !answered.includes(k));
    for (const k of unanswered) {
      assertEquals(answered.includes(k), false, `${s.path} named an unanswered key ${k}`);
    }
  }
});

Deno.test("item406 403A every primary key is independently sufficient", () => {
  // Homogeneity: with ONLY that key filled, the surface is backed.
  for (const s of CYBER_CSC_SURFACES) {
    if (s.mode !== "any") continue;
    for (const key of s.keys) {
      const only = buildIntakeWithOnly(key);
      assertEquals(surfaceBacked(s, only), true, `${s.path}: ${key} did not back the surface alone`);
    }
  }
});

Deno.test("item406 403A no corroborating key backs a surface alone", () => {
  for (const s of CYBER_CSC_SURFACES) {
    for (const key of s.corroborating ?? []) {
      const only = buildIntakeWithOnly(key);
      assertEquals(surfaceBacked(s, only), false, `${s.path}: corroborating ${key} backed the surface alone`);
    }
  }
});

/** Build an intake filling EXACTLY one dotted / controls[slug].field key. */
function buildIntakeWithOnly(key: string): Record<string, unknown> {
  const m = /^controls\[([a-z0-9_]+)\]\.([a-z_]+)$/.exec(key);
  if (m) {
    const value = m[2] === "evidence" ? ["Policy / procedure document"] : "A recorded fact about this component that the record supplies in full.";
    return { profile: {}, controls: [{ key: m[1], [m[2]]: value }] };
  }
  const field = key.replace(/^profile\./, "");
  return { profile: { [field]: "A recorded programme fact supplied by the business." }, controls: [] };
}

// ── honest absence on the degraded goldens ────────────────────────────────

Deno.test("item406 degraded goldens keep their honest absence byte-identical", () => {
  for (const g of CPPA_CYBER_GOLDEN) {
    const intake = g.intake as Record<string, unknown>;
    const rows = Array.isArray((intake as any).controls) ? (intake as any).controls : [];
    const silent = ["c1_auth", "c15_third_party", "c17_incident"].filter((slug) =>
      !rows.some((r: any) => String(r?.key) === slug &&
        (String(r?.notes ?? "").trim() || String(r?.maturity ?? "").trim() || (Array.isArray(r?.evidence) && r.evidence.length)))
    );
    if (!silent.length) continue;
    const report: Record<string, unknown> = { controls: silent.map((s) => controlRow(s, ABSENCE)) };
    const before = JSON.stringify(report);
    runCyberCsc(report, { intake });
    assertEquals(JSON.stringify(report), before, `${g.id}: honest absence was rewritten`);
  }
});

// ── the byte-pinned audit schedule survives every repair path ─────────────

Deno.test("item406 the audit-schedule sentences survive csc repair byte-identically", () => {
  // The corpus-pinned § 7121(a) / § 7122 literals, as the schedule builder
  // writes them. Byte-identical survival is the assertion.
  const pinned = [
    SCHEDULE_MARKER,
    ...Object.values(SCHEDULE_LITERALS).flatMap((t) => [
      `Under § 7121${t.subdivision}, the audit is due ${t.deadline} where ${t.revenue_condition}, covering ${t.audit_period}.`,
    ]),
  ];
  assert(pinned.length > 0);
  const report: Record<string, unknown> = {
    audit_schedule: { statement: pinned.join(" ") },
    readiness_determination: { rationale: `${ABSENCE} ${pinned[0]}` },
    controls: [controlRow("c1_auth", `${ABSENCE} ${pinned[0]}`)],
  };
  const before = String((report.audit_schedule as any).statement);
  runCyberCsc(report, { intake: PERFECT });
  assertEquals(String((report.audit_schedule as any).statement), before);
  for (const s of pinned) {
    assert(String((report.audit_schedule as any).statement).includes(s), s);
  }
});

// ── wiring ────────────────────────────────────────────────────────────────

Deno.test("item406 the false-absence gate id is wired", () => {
  assertEquals([...FALSE_ABSENCE_CHECK_IDS["cppa-cyber"]], ["cy2_absence_claim_vs_record"]);
});

Deno.test("item406 the pipeline stamp is the item406 value", () => {
  assertEquals(CYBER_PIPELINE_STAMP, "cyber-pipeline@item407b-2026-08-08");
  const report: Record<string, unknown> = {};
  const t = attachCyberCsc(report, { intake: PERFECT });
  assertEquals(t.version, CYBER_CSC_VERSION);
  assertEquals(
    ((report._meta as any).internal.cyber_csc as any).version,
    CYBER_CSC_VERSION,
  );
});
