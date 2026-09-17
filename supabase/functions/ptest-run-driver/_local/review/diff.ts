// /all-ptest v2 (DOC 261, 2026-09-14) — STAGE 7: the before/after diff on
// identical inputs.
//
// Two batches are compared PER GOLDEN INTAKE (the same document regenerated
// from the same stored intake). Findings are matched by their dedupe key
// (block key + normalised quote): `gone` (in A, not in B), `persists` (both),
// `new` (in B only). Lint hits are compared by rule. Composite scores and the
// queued/CEO/observed counts are reported before and after. The report is the
// acceptance gate for a fix batch (Rev 2 §0A V6): every queued item `gone`,
// zero `new` critical/high.
//
// Only batches whose settings match are compared; a settings mismatch is
// reported instead of a diff.

import { dedupeKey } from "./classify.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;
type Bag = Record<string, unknown>;

export interface DiffFinding {
  readonly key: string;
  readonly block_key: string;
  readonly quote: string;
  readonly severity: string | null;
  readonly fix_class: string | null;
  readonly route: string | null;
  readonly raised_by: string[];
}

export interface GoldenDiff {
  readonly golden_ref: string;
  readonly product: string;
  readonly label: string | null;
  readonly assessment_before: string | null;
  readonly assessment_after: string | null;
  readonly gone: DiffFinding[];
  readonly persists: DiffFinding[];
  readonly new: DiffFinding[];
  readonly lint_before: Record<string, number>;
  readonly lint_after: Record<string, number>;
  readonly composite_before: number | null;
  readonly composite_after: number | null;
  readonly routes_before: Record<string, number>;
  readonly routes_after: Record<string, number>;
}

export interface BatchDiff {
  readonly batch_before: string;
  readonly batch_after: string;
  readonly comparable: boolean;
  readonly settings_note: string | null;
  readonly goldens: GoldenDiff[];
  readonly accepted: boolean;
  readonly acceptance_note: string;
}

interface FindingRowLite {
  golden_ref: string | null; assessment_id: string; tool_slug: string; worker: string; vendor: string | null;
  block_key: string | null; quote: string | null; severity: string | null; fix_class: string | null; route: string | null; lint_rule: string | null;
}

function settingsComparable(a: Bag | null, b: Bag | null): { ok: boolean; note: string | null } {
  if (!a || !b) return { ok: false, note: "one of the batches has no recorded settings" };
  const keys = ["mode", "prompt_version", "vendors", "determinism", "review_effort", "classify_effort"];
  const diffs = keys.filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
  return diffs.length ? { ok: false, note: `settings differ: ${diffs.join(", ")}` } : { ok: true, note: null };
}

function findingsByGolden(rows: FindingRowLite[]): Map<string, { assessment: string; findings: Map<string, DiffFinding>; lint: Record<string, number> }> {
  const out = new Map<string, { assessment: string; findings: Map<string, DiffFinding>; lint: Record<string, number> }>();
  for (const r of rows) {
    const g = r.golden_ref ?? `doc:${r.assessment_id}`;
    let slot = out.get(g);
    if (!slot) { slot = { assessment: r.assessment_id, findings: new Map(), lint: {} }; out.set(g, slot); }
    if (r.worker === "LINT") {
      const rule = r.lint_rule ?? "L-?";
      slot.lint[rule] = (slot.lint[rule] ?? 0) + 1;
      continue;
    }
    if (!r.block_key || !r.quote) continue;
    const key = dedupeKey(r.block_key, r.quote);
    const label = r.vendor ? `${r.worker}/${r.vendor}` : r.worker;
    const cur = slot.findings.get(key);
    if (cur) {
      slot.findings.set(key, { ...cur, raised_by: [...new Set([...cur.raised_by, label])], fix_class: cur.fix_class ?? r.fix_class, route: cur.route ?? r.route });
    } else {
      slot.findings.set(key, { key, block_key: r.block_key, quote: r.quote.slice(0, 240), severity: r.severity, fix_class: r.fix_class, route: r.route, raised_by: [label] });
    }
  }
  return out;
}

export async function computeBatchDiff(admin: Admin, batchBefore: string, batchAfter: string): Promise<BatchDiff> {
  const [{ data: batches }, { data: fA }, { data: fB }, { data: vA }, { data: vB }, { data: goldens }] = await Promise.all([
    admin.from("ptest_batches").select("batch_id, settings").in("batch_id", [batchBefore, batchAfter]),
    admin.from("ptest_findings").select("golden_ref, assessment_id, tool_slug, worker, vendor, block_key, quote, severity, fix_class, route, lint_rule").eq("batch_id", batchBefore).eq("status", "validated"),
    admin.from("ptest_findings").select("golden_ref, assessment_id, tool_slug, worker, vendor, block_key, quote, severity, fix_class, route, lint_rule").eq("batch_id", batchAfter).eq("status", "validated"),
    admin.from("ptest_arbitrations").select("assessment_id, tool_slug, agreed_score, metrics").eq("batch_id", batchBefore).eq("arbitration_scope", "document").is("error", null),
    admin.from("ptest_arbitrations").select("assessment_id, tool_slug, agreed_score, metrics").eq("batch_id", batchAfter).eq("arbitration_scope", "document").is("error", null),
    admin.from("ptest_golden_intakes").select("id, product, label"),
  ]);
  const settings = new Map<string, Bag | null>((batches ?? []).map((b: Bag) => [String(b.batch_id), (b.settings ?? null) as Bag | null]));
  const cmp = settingsComparable(settings.get(batchBefore) ?? null, settings.get(batchAfter) ?? null);

  const A = findingsByGolden((fA ?? []) as FindingRowLite[]);
  const B = findingsByGolden((fB ?? []) as FindingRowLite[]);
  const verdictA = new Map<string, { score: number | null; routes: Record<string, number> }>();
  for (const v of (vA ?? []) as Bag[]) verdictA.set(String(v.assessment_id), { score: v.agreed_score === null ? null : Number(v.agreed_score), routes: ((v.metrics as Bag)?.by_route ?? {}) as Record<string, number> });
  const verdictB = new Map<string, { score: number | null; routes: Record<string, number> }>();
  for (const v of (vB ?? []) as Bag[]) verdictB.set(String(v.assessment_id), { score: v.agreed_score === null ? null : Number(v.agreed_score), routes: ((v.metrics as Bag)?.by_route ?? {}) as Record<string, number> });
  const goldenMeta = new Map<string, { product: string; label: string }>((goldens ?? []).map((g: Bag) => [String(g.id), { product: String(g.product), label: String(g.label) }]));

  const refs = new Set<string>([...A.keys(), ...B.keys()].filter((k) => !k.startsWith("doc:")));
  const out: GoldenDiff[] = [];
  for (const ref of [...refs].sort()) {
    const a = A.get(ref);
    const b = B.get(ref);
    const gone: DiffFinding[] = [];
    const persists: DiffFinding[] = [];
    const fresh: DiffFinding[] = [];
    for (const [k, f] of a?.findings ?? []) (b?.findings.has(k) ? persists : gone).push(f);
    for (const [k, f] of b?.findings ?? []) if (!a?.findings.has(k)) fresh.push(f);
    const meta = goldenMeta.get(ref);
    out.push({
      golden_ref: ref,
      product: meta?.product ?? "?",
      label: meta?.label ?? null,
      assessment_before: a?.assessment ?? null,
      assessment_after: b?.assessment ?? null,
      gone, persists, new: fresh,
      lint_before: a?.lint ?? {},
      lint_after: b?.lint ?? {},
      composite_before: a ? verdictA.get(a.assessment)?.score ?? null : null,
      composite_after: b ? verdictB.get(b.assessment)?.score ?? null : null,
      routes_before: a ? verdictA.get(a.assessment)?.routes ?? {} : {},
      routes_after: b ? verdictB.get(b.assessment)?.routes ?? {} : {},
    });
  }

  const queuedPersisting = out.flatMap((g) => g.persists.filter((f) => f.route === "fix_list"));
  const newSevere = out.flatMap((g) => g.new.filter((f) => f.severity === "critical" || f.severity === "high"));
  const accepted = cmp.ok && out.length > 0 && queuedPersisting.length === 0 && newSevere.length === 0;
  const acceptance_note = !cmp.ok
    ? `not comparable — ${cmp.note}`
    : !out.length
    ? "no golden intakes in common"
    : accepted
    ? "accepted: every queued item is gone and no new critical/high finding appeared"
    : `not accepted: ${queuedPersisting.length} queued item(s) persist, ${newSevere.length} new critical/high finding(s)`;
  return { batch_before: batchBefore, batch_after: batchAfter, comparable: cmp.ok, settings_note: cmp.note, goldens: out, accepted, acceptance_note };
}
