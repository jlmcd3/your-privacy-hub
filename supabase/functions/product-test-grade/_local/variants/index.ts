// product-test-grade — action `variants` (doc 272 §4, §6).
//
// Deterministic: for a fixed (tool, fixture_id, intake) the returned list and
// its order never change — every step below walks the contract's own field
// order (or the CONTRADICTIONS_BY_TOOL / MESSY_BY_TOOL authored order), never
// Object.keys() over the intake and never Math.random / Date.now.

import type { IntakeContract, IntakeField } from "../../../_shared/intake-contracts/types.ts";
import { emptyAskedKeys } from "../../../_shared/ltp/record-complete.ts";
import type { ProductTestTool } from "../types.ts";
import type { Variant, VariantExpectations } from "../types.ts";
import {
  CONTRACT_BY_TOOL,
  ROPA_OPTIONAL_LOOKING_KEYS,
  GEO_BY_TOOL,
} from "./contracts-registry.ts";
import { CONTRADICTIONS_BY_TOOL } from "./contradictions.ts";
import { MESSY_BY_TOOL } from "../golden/messy-registry.ts";
import type { GoldenCase } from "../golden/types.ts";

// ── generic dotted-path helpers (one optional "[]" hop, mirrors the shape of
//    quality-batch-orchestrator/_local/golden/messy-registry.ts `drop()` —
//    reimplemented rather than imported: importing across two functions'
//    `_local` trees is not permitted, and `drop` is not exported there) ──

type Rec = Record<string, unknown>;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function readParent(root: Rec, path: string): { parent: Rec; key: string } | null {
  const parts = path.split(".");
  let node: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!node || typeof node !== "object") return null;
    node = (node as Rec)[parts[i]];
  }
  if (!node || typeof node !== "object") return null;
  return { parent: node as Rec, key: parts[parts.length - 1] };
}

/** Delete a dotted path (one terminal "[]" hop supported, e.g.
 *  "a2_necessity_set[].justification" or the top-level-array form
 *  "controls[].notes"). Returns true if something was actually removed. */
function dropPath(root: Rec, path: string): boolean {
  const arrIdx = path.indexOf("[].");
  if (arrIdx !== -1) {
    const arrPath = path.slice(0, arrIdx);
    const leaf = path.slice(arrIdx + 3);
    const holder = readParent(root, arrPath);
    if (!holder) return false;
    const val = holder.parent[holder.key];
    if (!Array.isArray(val)) return false;
    let any = false;
    for (const el of val) {
      if (el && typeof el === "object" && leaf in (el as Rec)) {
        delete (el as Rec)[leaf];
        any = true;
      }
    }
    return any;
  }
  const holder = readParent(root, path);
  if (!holder) return false;
  if (!(holder.key in holder.parent)) return false;
  delete holder.parent[holder.key];
  return true;
}

/** Set a dotted path (no "[]" support needed for contradictions), creating
 *  intermediate objects as needed. */
function setPath(root: Rec, path: string, value: unknown): void {
  const parts = path.split(".");
  let node: Rec = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!node[k] || typeof node[k] !== "object") node[k] = {};
    node = node[k] as Rec;
  }
  node[parts[parts.length - 1]] = value;
}

/** "", null, undefined, [], {} and whitespace are not answers. */
function isEmptyAnswer(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as Rec).length === 0;
  return false;
}

function readPathSimple(root: Rec, path: string): unknown {
  const parts = path.split(".");
  let node: unknown = root;
  for (const p of parts) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Rec)[p];
  }
  return node;
}

/** No `label` field exists on IntakeField (_shared/intake-contracts/types.ts,
 *  verified 2026-09-18) — every call takes the "else the key" branch the
 *  brief specifies. Kept as a function (not a bare `.key` read at call
 *  sites) so a future contract type that adds `label` needs one edit. */
function labelFor(_contract: IntakeContract, key: string): string {
  return key;
}

// ── mapping to the messy-registry's own tool slugs ─────────────────────────

const MESSY_TOOL_ALIAS: Partial<Record<ProductTestTool, string>> = {
  "cppa-risk": "cppa-risk",
  "cppa-cyber": "cppa-cyber",
  "cppa-admt": "cppa-admt",
  "governance": "governance",
  "dpia": "dpia",
  "lia": "lia",
  "dpa": "dpa-generator",
  "ir-playbook": "ir-playbook",
  "biometric": "biometric-checker",
  "registration": "registration",
  // ropa, us-notice, eu-notice, cppa-cyber(dup) have no MESSY_BY_TOOL entry.
};

// ── wrong-regime vocabulary ─────────────────────────────────────────────────

const GDPR_VOCAB =
  " [wrong-regime probe] The lawful basis under Article 6 GDPR relied on for this processing is legitimate interests.";
const CCPA_VOCAB =
  " [wrong-regime probe] This record requires a § 7150 risk assessment under the CPPA regulations.";

function firstFreeTextField(contract: IntakeContract): IntakeField | null {
  return contract.fields.find((f) => (f.kind === "text" || f.kind === "narrative") && f.required !== "always")
    ?? contract.fields.find((f) => f.kind === "text" || f.kind === "narrative")
    ?? null;
}

function buildWrongRegime(
  tool: ProductTestTool,
  fixtureId: string,
  contract: IntakeContract,
  goldenIntake: Rec,
): Variant | null {
  const geo = GEO_BY_TOOL[tool];
  if (geo === "both") return null; // ambiguous regime; not built (documented in the report)
  const vocab = geo === "us" ? GDPR_VOCAB : CCPA_VOCAB;
  const field = firstFreeTextField(contract);
  if (!field) return null;
  const intake = clone(goldenIntake);
  const existing = readPathSimple(intake, field.key);
  const base = typeof existing === "string" && existing.trim() ? existing : "";
  setPath(intake, field.key, `${base}${vocab}`);
  return {
    variant_id: `${fixtureId}__wrong-regime`,
    kind: "wrong-regime",
    description:
      `The golden intake with "${field.key}" carrying ${geo === "us" ? "GDPR" : "CPPA"} vocabulary foreign to a ${geo === "us" ? "CCPA" : "GDPR"} product (contamination probe).`,
    intake,
    removed_keys: [],
    expectations: {
      must_report_not_recorded: [],
      must_not_contain: [],
      // The contamination itself must not be adopted as the product's own
      // legal conclusion — legal.ts's cross-regime check covers this
      // independently of the variant's own expectations.
      must_contain: [],
    },
  };
}

// ── removed-keys expectations (record-complete rule) ───────────────────────

function buildRemovedExpectations(
  contract: IntakeContract,
  thinnedIntake: Rec,
  removedKeys: readonly string[],
): VariantExpectations {
  // emptyAskedKeys computed on the THINNED intake: a removed conditional
  // field whose trigger no longer fires (because the triggering key was
  // ALSO removed, or was never set) is correctly excluded here — it was
  // never "asked" of this record, so it must not be expected as
  // "not recorded" (doc 271 §4 defect 1 / this brief's record-complete rule).
  const asked = new Set(emptyAskedKeys(contract, thinnedIntake));
  const reportable = removedKeys.filter((k) => asked.has(k));
  return {
    must_report_not_recorded: reportable.map((k) => labelFor(contract, k)),
    must_not_contain: [],
    must_contain: [],
  };
}

// ── entry point ──────────────────────────────────────────────────────────

const THIN_ONE_CAP = 25;
const BLANK_REQUIRED_CAP = 10;

export function buildVariants(
  tool: ProductTestTool,
  fixtureId: string,
  intake: Record<string, unknown>,
): Variant[] {
  const variants: Variant[] = [];
  const golden = clone(intake) as Rec;

  // The golden variant's id is the bare word "golden" (lead, 2026-09-18): the
  // page synthesises the same variant locally when no messy kind is selected
  // (src/lib/productTest/plan.ts goldenVariant) and the two must agree, so
  // that snapshot pins are keyed `<tool>/<fixture_id>/golden` on both paths.
  variants.push({
    variant_id: "golden",
    kind: "golden",
    description: "The fixture's intake, unchanged.",
    intake: clone(golden),
    removed_keys: [],
    expectations: { must_report_not_recorded: [], must_not_contain: [], must_contain: [] },
  });

  const contract = CONTRACT_BY_TOOL[tool];

  if (!contract) {
    // RoPA (doc 271 §4 defect 4): no intake contract anywhere in the
    // codebase. Emit only "golden" and "thin-all", over the hand-picked
    // top-level optional-looking keys in ROPA_OPTIONAL_LOOKING_KEYS.
    const removed: string[] = [];
    const thin = clone(golden);
    for (const k of ROPA_OPTIONAL_LOOKING_KEYS) {
      if (dropPath(thin, k)) removed.push(k);
    }
    if (removed.length) {
      variants.push({
        variant_id: `${fixtureId}__thin-all`,
        kind: "thin-all",
        description:
          "RoPA has no intake contract (doc 271 §4 defect 4); thins the hand-picked list of optional-looking top-level keys from PANEL-BRIEF.md instead of a contract's `required` classification.",
        intake: thin,
        removed_keys: removed,
        expectations: {
          // No contract exists for RoPA, so labelFor's "else the key"
          // fallback applies unconditionally here — the label IS the key.
          must_report_not_recorded: [...removed],
          must_not_contain: [],
          must_contain: [],
        },
      });
    }
    return variants;
  }

  const optionalOrConditional = contract.fields.filter(
    (f) => f.required === "optional" || f.required === "conditional",
  );
  const alwaysRequired = contract.fields.filter((f) => f.required === "always");

  // thin-all
  if (optionalOrConditional.length) {
    const thin = clone(golden);
    const removed: string[] = [];
    for (const f of optionalOrConditional) {
      if (dropPath(thin, f.key)) removed.push(f.key);
    }
    variants.push({
      variant_id: `${fixtureId}__thin-all`,
      kind: "thin-all",
      description: `Every optional/conditional field removed (${removed.length} of ${optionalOrConditional.length} present) — "the customer skipped everything they could."`,
      intake: thin,
      removed_keys: removed,
      expectations: buildRemovedExpectations(contract, thin, removed),
    });
  }

  // thin-one — one variant per optional/conditional field the fixture ANSWERS
  // (non-empty), contract order, cap 25. Lead correction 2026-09-18 after the
  // first messy Risk run: a field absent or empty in the fixture yielded a
  // variant identical to golden (32 of 125 thin-one documents on five
  // fixtures), a wasted generation and a meaningless "pass". A thin-one
  // variant now exists only where something was really taken away, so a
  // document identical to golden means the answered key never surfaced —
  // which the page reports as `fidelity.answered_key_never_surfaces`.
  let thinOneCount = 0;
  for (const f of optionalOrConditional) {
    if (thinOneCount >= THIN_ONE_CAP) break;
    if (isEmptyAnswer(readPathSimple(golden, f.key.replace(/\[\]\..*$/, "")))) continue;
    const thin = clone(golden);
    const removedOk = dropPath(thin, f.key);
    if (!removedOk) continue;
    thinOneCount++;
    variants.push({
      variant_id: `${fixtureId}__thin-one-${slug(f.key)}`,
      kind: "thin-one",
      description: `Removes the single ${f.required} field "${f.key}".`,
      intake: thin,
      removed_keys: [f.key],
      expectations: buildRemovedExpectations(contract, thin, [f.key]),
    });
  }

  // blank-required — one variant per required:"always" field set to "", cap 10.
  let blankCount = 0;
  for (const f of alwaysRequired) {
    if (blankCount >= BLANK_REQUIRED_CAP) break;
    if (typeof readPathSimple(golden, f.key) !== "string" && f.kind !== "text" && f.kind !== "narrative" && f.kind !== "enum") {
      // Only string-shaped fields can be meaningfully blanked to "".
      continue;
    }
    blankCount++;
    const blanked = clone(golden);
    setPath(blanked, f.key, "");
    variants.push({
      variant_id: `${fixtureId}__blank-required-${slug(f.key)}`,
      kind: "blank-required",
      description: `Blanks the required:"always" field "${f.key}" to "" — "the form would still submit."`,
      intake: blanked,
      removed_keys: [f.key],
      expectations: {
        must_report_not_recorded: [labelFor(contract, f.key)],
        must_not_contain: [],
        must_contain: [],
      },
    });
  }

  // contradict — authored rows, applied one at a time.
  for (const row of CONTRADICTIONS_BY_TOOL[tool] ?? []) {
    const c = clone(golden);
    for (const [k, v] of Object.entries(row.changes)) setPath(c, k, v);
    variants.push({
      variant_id: `${fixtureId}__contradict-${row.id}`,
      kind: "contradict",
      description: row.description,
      intake: c,
      removed_keys: [],
      expectations: {
        must_report_not_recorded: [],
        must_not_contain: [...row.must_not_contain],
        must_contain: [],
      },
    });
  }

  // authored — the messy registry's hand-written scenarios (own intake, not
  // derived from this fixture's golden intake).
  const messyTool = MESSY_TOOL_ALIAS[tool];
  const messyCases: GoldenCase[] = messyTool ? (MESSY_BY_TOOL[messyTool] ?? []) : [];
  for (const c of messyCases) {
    const mustInclude: string[] = [];
    const mustNotInclude: string[] = [];
    for (const a of c.assertions) {
      // Only literal-safe patterns are carried into the substring-based
      // must_contain/must_not_contain expectations the grading side checks;
      // `must_cite` is a verbatim substring so it always qualifies.
      // Patterns with regex metacharacters, and `jurisdiction_resolved`
      // (a structural check, not a string), are intentionally NOT carried
      // over — grading these fully would mean re-implementing evaluateGolden
      // against a regex, which fidelity.ts does not do (see its module
      // header). This is a documented simplification.
      if (a.kind === "must_cite") mustInclude.push(a.citation);
      else if (a.kind === "must_include" && /^[\w\s.,'’"()%$&/–-]+$/.test(a.pattern)) mustInclude.push(a.pattern);
      else if (a.kind === "must_not_include" && /^[\w\s.,'’"()%$&/–-]+$/.test(a.pattern)) mustNotInclude.push(a.pattern);
    }
    variants.push({
      variant_id: `${fixtureId}__authored-${c.id}`,
      kind: "authored",
      description: `Hand-authored messy case from the orchestrator's golden registry (quality-batch-orchestrator/_local/golden/messy-registry.ts): ${c.id}.`,
      intake: clone(c.intake) as Rec,
      removed_keys: [],
      expectations: {
        must_report_not_recorded: [],
        must_not_contain: mustNotInclude,
        must_contain: mustInclude,
      },
    });
  }

  // wrong-regime
  const wr = buildWrongRegime(tool, fixtureId, contract, golden);
  if (wr) variants.push(wr);

  return variants;
}

function slug(key: string): string {
  return key.replace(/\[\]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}
