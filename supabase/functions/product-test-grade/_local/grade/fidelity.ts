// product-test-grade — record-fidelity family (doc 272 §6.2).

import type { IntakeContract, IntakeField } from "../../../_shared/intake-contracts/types.ts";
import { emptyAskedKeys, SYSTEM_KEYS } from "../../../_shared/ltp/record-complete.ts";
import type { Check, ProductTestTool, VariantExpectations, VariantKind } from "../types.ts";
import { COMPANY_KEY_BY_TOOL } from "../variants/contracts-registry.ts";
import { customerTextOf, paragraphsOf } from "./text-extract.ts";

const NOT_RECORDED_RE =
  /\b(not\s+recorded|not\s+provided|record\s+does\s+not\s+state|record\s+is\s+silent|record_insufficient|information_needed|does\s+not\s+(?:state|record)|insufficient\s+(?:basis|information|evidence)|no\s+basis\s+to\s+(?:confirm|assess|determine))\b/i;

type Rec = Record<string, unknown>;

function readPathAll(root: unknown, key: string): unknown[] {
  let frontier: unknown[] = [root];
  for (const raw of key.split(".")) {
    const isArr = raw.endsWith("[]");
    const seg = isArr ? raw.slice(0, -2) : raw;
    const next: unknown[] = [];
    for (const node of frontier) {
      if (!node || typeof node !== "object") continue;
      const v = (node as Rec)[seg];
      if (isArr) { if (Array.isArray(v)) next.push(...v); } else next.push(v);
    }
    frontier = next;
  }
  return frontier;
}

function isEmptyValue(v: unknown): boolean {
  if (v === "" || v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

/**
 * Mirrors (does not copy — this is a ~10-line reimplementation, not a file
 * import) the trigger predicate in `_shared/ltp/record-complete.ts`'s
 * private `conditionalTriggered`, so fidelity.ts can compute "answered asked
 * keys" (emptyAskedKeys only exposes the EMPTY half of that set).
 */
function conditionalTriggered(intake: Rec, f: IntakeField): boolean {
  if (f.trigger) {
    const vals = readPathAll(intake, f.trigger.key);
    if (f.trigger.present) {
      const skip = (f.trigger.unlessLeadingWord ?? []).map((w) => w.toLowerCase());
      return vals.some((v) => {
        if (typeof v !== "string" || isEmptyValue(v)) return false;
        const lead = /^\s*([A-Za-z]+)/.exec(v)?.[1]?.toLowerCase();
        return !(lead !== undefined && skip.includes(lead));
      });
    }
    // Element-wise on array values, mirroring the 2026-09-18 fix in
    // _shared/ltp/record-complete.ts (multi-enum trigger without "[]").
    const equals = f.trigger.equals ?? [];
    return vals.some((v) =>
      Array.isArray(v)
        ? v.some((x) => typeof x === "string" && equals.includes(x))
        : typeof v === "string" && equals.includes(v)
    );
  }
  if (!f.key.includes("[]")) return false;
  const parent = f.key.slice(0, f.key.indexOf("[]") + 2);
  return readPathAll(intake, parent).length > 0;
}

/** Keys the intake contract ASKS and this record ANSWERS (non-empty). */
function answeredAskedKeys(contract: IntakeContract, intake: Rec): IntakeField[] {
  const empty = new Set(emptyAskedKeys(contract, intake));
  const out: IntakeField[] = [];
  for (const f of contract.fields) {
    if (SYSTEM_KEYS.has(f.key)) continue;
    if (f.emptyIsAnswer === true) continue;
    if (f.superseded === true) continue;
    if (f.required === "conditional" && !conditionalTriggered(intake, f)) continue;
    if (empty.has(f.key)) continue;
    out.push(f);
  }
  return out;
}

function sameParagraphAsLabel(paragraphs: readonly string[], label: string): { found: boolean; withNotRecorded: boolean; quote?: string } {
  const needle = label.toLowerCase();
  for (const p of paragraphs) {
    if (p.toLowerCase().includes(needle)) {
      return { found: true, withNotRecorded: NOT_RECORDED_RE.test(p), quote: p.slice(0, 200) };
    }
  }
  return { found: false, withNotRecorded: false };
}

export function checkFidelity(
  tool: ProductTestTool,
  contract: IntakeContract | null,
  intake: Rec,
  output: Rec,
  variantKind: VariantKind,
  expectations: VariantExpectations | undefined,
  panelCompanies: readonly string[] | undefined,
): Check[] {
  const checks: Check[] = [];
  const { text } = customerTextOf(tool, output);
  const paragraphs = paragraphsOf(text);

  // 1. the fixture's own company name appears.
  const companyKey = COMPANY_KEY_BY_TOOL[tool];
  const companyName = String(readPathAll(intake, companyKey)[0] ?? "").trim();
  if (companyName) {
    const present = text.includes(companyName);
    checks.push({
      check_id: "fidelity.company_name_present",
      family: "fidelity",
      severity: "high",
      passed: present,
      expected: companyName,
      actual: present ? companyName : "absent",
    });
  }

  // 2. no OTHER panel company's name appears (critical).
  for (const other of panelCompanies ?? []) {
    if (!other || other === companyName) continue;
    const hit = text.includes(other);
    checks.push({
      check_id: "fidelity.no_foreign_company",
      family: "fidelity",
      severity: "critical",
      passed: !hit,
      quote: hit ? other : undefined,
      expected: `"${other}" absent (belongs to a different fixture)`,
      actual: hit ? other : "absent",
    });
    if (hit) break; // one finding is enough to fail the run; avoid flooding on a shared substring.
  }

  // 3. must_report_not_recorded — the removed keys' labels.
  for (const label of expectations?.must_report_not_recorded ?? []) {
    const { found, withNotRecorded, quote } = sameParagraphAsLabel(paragraphs, label);
    const passed = !found || withNotRecorded;
    checks.push({
      check_id: "fidelity.not_recorded_reported",
      family: "fidelity",
      severity: "high",
      passed,
      block_key: label,
      quote,
      expected: `"${label}" reported not-recorded, or absent entirely`,
      actual: !found ? "label absent (OK)" : withNotRecorded ? "not-recorded phrasing present (OK)" : "label present without not-recorded phrasing",
    });
  }

  // 4. must_not_contain — absent (critical).
  for (const needle of expectations?.must_not_contain ?? []) {
    const hit = text.toLowerCase().includes(needle.toLowerCase());
    checks.push({
      check_id: "fidelity.must_not_contain",
      family: "fidelity",
      severity: "critical",
      passed: !hit,
      quote: hit ? needle : undefined,
      expected: `"${needle}" absent`,
      actual: hit ? needle : "absent",
    });
  }

  // 5. must_contain — present (high).
  for (const needle of expectations?.must_contain ?? []) {
    const hit = text.toLowerCase().includes(needle.toLowerCase());
    checks.push({
      check_id: "fidelity.must_contain",
      family: "fidelity",
      severity: "high",
      passed: hit,
      expected: `"${needle}" present`,
      actual: hit ? needle : "absent",
    });
  }

  // 6. golden variants only: no not-recorded phrasing about ANSWERED keys.
  if (variantKind === "golden" && contract) {
    for (const f of answeredAskedKeys(contract, intake)) {
      const label = f.key; // no `label` field on IntakeField (2026-09-18) — key is the label.
      const { found, withNotRecorded, quote } = sameParagraphAsLabel(paragraphs, label);
      if (!found) continue; // the label text itself may never appear verbatim; nothing to check.
      checks.push({
        check_id: "fidelity.golden_no_false_absence",
        family: "fidelity",
        severity: "high",
        passed: !withNotRecorded,
        block_key: label,
        quote,
        expected: `no not-recorded phrasing near "${label}" (the record answers it)`,
        actual: withNotRecorded ? "not-recorded phrasing present despite an answered key" : "clean",
      });
    }
  }

  return checks;
}
