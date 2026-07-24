// W10-RISK-B1 — TURN B of RECOVERY-BATCH-FIXES.
//
// Deterministic guards for two hallucination classes observed in batch
// 5e0558f3 (docs fcbcc203 and 1b32c6a9):
//
//   B1a — INTAKE FIELD CROSS-ATTRIBUTION. Every inconsistency_flags entry
//         that quotes an intake value must have that value validated
//         against the actual intake record at the named intake_field_1 /
//         intake_field_2 / source_fields keys. If the quoted value does not
//         appear (normalised substring / equality) under any referenced
//         key, attempt to re-key by locating the intake field whose value
//         actually contains the quoted string; failing that, DROP the flag.
//
//   B1b — OVERCLAIMING FROM INTAKE. Claims of the form "X confirmed",
//         "X is performed", "X is conducted" that name an intake field
//         must be validated against that field's actual textual content.
//         Unverifiable claims are downgraded to conditional phrasing
//         ("the record indicates …" / "may involve …") in risk_register
//         and executive_summary narrative surfaces.
//
// Fail-open, non-blocking; counters attach at _w10_risk_b1 for telemetry.

export const W10_RISK_B1_STAMP = "w10-risk-b1@2026-07-24T12:37:00Z";
// TURN D (WAVE12-FIX / cppa-risk) — D2 hardening. Bidirectional profiling
// guard: never assert profiling absent an intake basis (B1b, above) AND
// never DENY profiling that q5b_profiling_observation asserts. Fail-open;
// telemetry lands under _w10_risk_b1.counters.profiling_denials_*.
export const W12_RISK_D2_STAMP = "w12-risk-d2@2026-07-24T17:20:00Z";

export interface W10RiskB1Counters {
  flags_scanned: number;
  flags_rekeyed: number;
  flags_dropped: number;
  claims_scanned: number;
  claims_downgraded: number;
  claims_removed: number;
  // D2 — profiling-denial guard (bidirectional).
  profiling_denials_scanned: number;
  profiling_denials_downgraded: number;
}

const emptyCounters = (): W10RiskB1Counters => ({
  flags_scanned: 0,
  flags_rekeyed: 0,
  flags_dropped: 0,
  claims_scanned: 0,
  claims_downgraded: 0,
  claims_removed: 0,
  profiling_denials_scanned: 0,
  profiling_denials_downgraded: 0,
});

// ---------- Intake flattening ----------
function normalise(s: string): string {
  return s.toLowerCase().replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function flattenIntake(intake: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (node: unknown, key: string) => {
    if (node == null) return;
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
      const prev = out[key];
      out[key] = prev ? `${prev} | ${String(node)}` : String(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const v of node) walk(v, key);
      return;
    }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, key ? `${key}.${k}` : k);
      }
    }
  };
  for (const [k, v] of Object.entries(intake ?? {})) walk(v, k);
  return out;
}

function fieldContains(intakeFlat: Record<string, string>, fieldKey: string, quoted: string): boolean {
  const raw = intakeFlat[fieldKey];
  if (!raw) return false;
  const nRaw = normalise(raw);
  const nQ = normalise(quoted);
  if (!nQ) return false;
  return nRaw === nQ || nRaw.includes(nQ) || nQ.includes(nRaw);
}

function findFieldContaining(intakeFlat: Record<string, string>, quoted: string): string | null {
  const nQ = normalise(quoted);
  if (!nQ) return null;
  for (const [k, v] of Object.entries(intakeFlat)) {
    const nV = normalise(v);
    if (nV && (nV === nQ || nV.includes(nQ))) return k;
  }
  return null;
}

// Extract quoted strings (single, double, and typographic quotes) from prose.
const QUOTE_RE = /["\u201c]([^"\u201d\n]{4,200})["\u201d]|['\u2018]([^'\u2019\n]{4,200})['\u2019]/g;
function extractQuoted(prose: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = QUOTE_RE.exec(prose)) !== null) {
    const q = (m[1] ?? m[2] ?? "").trim();
    if (q.length >= 4) out.push(q);
  }
  return out;
}

// ---------- B1a — flag provenance ----------
function referencedFieldKeys(flag: Record<string, unknown>): string[] {
  const keys: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) keys.push(v.trim());
    else if (Array.isArray(v)) v.forEach(push);
  };
  push(flag.intake_field_1);
  push(flag.intake_field_2);
  push(flag.source_field_a);
  push(flag.source_field_b);
  push(flag.source_fields);
  push(flag.field_key);
  return Array.from(new Set(keys));
}

function flagProse(flag: Record<string, unknown>): string {
  return [flag.description, flag.explanation, flag.resolution_required, flag.detail, flag.narrative]
    .filter((v) => typeof v === "string")
    .join(" \n ");
}

function validateAndRepairFlag(
  flag: Record<string, unknown>,
  intakeFlat: Record<string, string>,
  counters: W10RiskB1Counters,
): Record<string, unknown> | null {
  counters.flags_scanned += 1;
  const refs = referencedFieldKeys(flag);
  if (refs.length === 0) return flag; // nothing to validate
  const prose = flagProse(flag);
  const quotes = extractQuoted(prose);
  if (quotes.length === 0) return flag; // no quoted value to attribute
  const rekeys: Record<string, string> = {};
  let dropFlag = false;
  for (const q of quotes) {
    const anyMatch = refs.some((k) => fieldContains(intakeFlat, k, q));
    if (anyMatch) continue;
    const found = findFieldContaining(intakeFlat, q);
    if (found) {
      rekeys[q] = found;
    } else {
      dropFlag = true;
      break;
    }
  }
  if (dropFlag) {
    counters.flags_dropped += 1;
    return null;
  }
  const rekeyValues = Object.values(rekeys);
  if (rekeyValues.length > 0) {
    counters.flags_rekeyed += 1;
    // Add re-keyed fields into source_fields; do NOT silently overwrite
    // intake_field_1/2 (leave existing anchors as-is so the model prose is
    // not further corrupted; we simply extend the provenance list).
    const sf = Array.isArray(flag.source_fields) ? [...(flag.source_fields as unknown[])] : [];
    for (const v of rekeyValues) if (typeof v === "string" && !sf.includes(v)) sf.push(v);
    (flag as Record<string, unknown>).source_fields = sf;
    (flag as Record<string, unknown>)._w10_rekeyed = rekeyValues;
  }
  return flag;
}

// ---------- B1b — claim guard ----------
// Matches assertions like "profiling/inference generation confirmed",
// "targeted advertising is performed", "sale of personal information is
// conducted" where the sentence names an intake field explicitly.
const CLAIM_RE =
  /([A-Z][^.!?\n]{6,240}?\b(?:confirmed|is performed|are performed|is conducted|are conducted|is established|are established)\b[^.!?\n]{0,80})[.!?]/g;

const FIELD_ID_RE = /\b([iq][0-9]+[a-z]?_[a-z0-9_]+|sensitive_location_basis|public_privacy_policy_url|impact_intake|content_detail\.[a-z_]+)\b/g;

function guardSentence(
  sentence: string,
  intakeFlat: Record<string, string>,
): { verdict: "keep" | "downgrade" | "remove"; replacement?: string } {
  const fieldIds = Array.from(new Set(Array.from(sentence.matchAll(FIELD_ID_RE), (m) => m[1])));
  if (fieldIds.length === 0) return { verdict: "keep" };
  // Extract the subject before "confirmed/is performed/…"
  const verbMatch = sentence.match(/\b(confirmed|is performed|are performed|is conducted|are conducted|is established|are established)\b/i);
  if (!verbMatch) return { verdict: "keep" };
  const subjectRaw = sentence.slice(0, verbMatch.index).trim();
  const subjectKey = normalise(subjectRaw);
  // Considered supported if ANY named field's content contains any keyword
  // token from the subject (>=4 chars) — a permissive check that still
  // catches "profiling/inference generation confirmed" attributed to
  // i1_processing_purpose whose content does not mention profiling.
  const tokens = subjectKey.split(" ").filter((t) => t.length >= 4);
  const supported = fieldIds.some((f) => {
    const v = intakeFlat[f];
    if (!v) return false;
    const nv = normalise(v);
    return tokens.some((t) => nv.includes(t));
  });
  if (supported) return { verdict: "keep" };
  // Downgrade: replace "confirmed / is performed / …" with conditional
  // phrasing referencing the record rather than an intake assertion.
  const downgraded = sentence
    .replace(/\bconfirmed\b/gi, "is not confirmed by the record and requires verification")
    .replace(/\b(is|are) performed\b/gi, "$1 not confirmed as performed by the record and requires verification")
    .replace(/\b(is|are) conducted\b/gi, "$1 not confirmed as conducted by the record and requires verification")
    .replace(/\b(is|are) established\b/gi, "$1 not confirmed as established by the record and requires verification");
  return { verdict: "downgrade", replacement: downgraded };
}

function guardNarrative(
  text: string,
  intakeFlat: Record<string, string>,
  counters: W10RiskB1Counters,
): string {
  if (typeof text !== "string" || text.length === 0) return text;
  return text.replace(CLAIM_RE, (m, sentence: string) => {
    counters.claims_scanned += 1;
    const trailing = m.slice(sentence.length); // punctuation
    const r = guardSentence(sentence, intakeFlat);
    if (r.verdict === "downgrade" && r.replacement) {
      counters.claims_downgraded += 1;
      return r.replacement + trailing;
    }
    return m;
  });
}

function guardObjectDeep(
  node: unknown,
  intakeFlat: Record<string, string>,
  counters: W10RiskB1Counters,
): unknown {
  if (typeof node === "string") return guardNarrative(node, intakeFlat, counters);
  if (Array.isArray(node)) return node.map((v) => guardObjectDeep(v, intakeFlat, counters));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = guardObjectDeep(v, intakeFlat, counters);
    return out;
  }
  return node;
}

// ---------- D2 — profiling-denial guard (reverse direction of B1b) ----------
// Wave-12 defect (doc 864495a3): the report wrote "no profiling inferences
// are recorded" while intake q5b_profiling_observation asserted
// "Yes — systematic observation of workers/students/applicants". A denial
// is a false negative that must never be emitted when the intake basis is
// present. We only fire when the intake ACTUALLY asserts profiling; if the
// intake denies profiling, the sentence stands.
const PROFILING_DENIAL_RE =
  /([A-Z][^.!?\n]{0,220}?\b(?:no\s+profiling\b|no\s+[^.!?\n]{0,60}?\binferences?\b|profiling\s+(?:is|are)\s+not\b|does\s+not\s+(?:perform|conduct|engage\s+in)\s+profiling|not\s+performing\s+profiling|no\s+systematic\s+observation)[^.!?\n]{0,120})[.!?]/g;

function intakeAssertsProfiling(intakeFlat: Record<string, string>): boolean {
  const q5b = intakeFlat["q5b_profiling_observation"];
  if (!q5b) return false;
  const n = normalise(q5b);
  // Any non-"no"/"not applicable"/"unsure" value beginning with "yes" counts.
  return /^yes\b/.test(n);
}

function guardProfilingDenials(
  text: string,
  intakeFlat: Record<string, string>,
  counters: W10RiskB1Counters,
): string {
  if (typeof text !== "string" || text.length === 0) return text;
  if (!intakeAssertsProfiling(intakeFlat)) return text;
  return text.replace(PROFILING_DENIAL_RE, (m, sentence: string) => {
    counters.profiling_denials_scanned += 1;
    const trailing = m.slice(sentence.length);
    counters.profiling_denials_downgraded += 1;
    // Preserve leading context; append a corrective clause that flags the
    // contradiction rather than restating the false negative.
    return (
      "The intake asserts systematic-observation profiling " +
      "(q5b_profiling_observation = Yes); the earlier statement that " +
      sentence.trim().replace(/^"|"$/g, "").toLowerCase() +
      " is not supported by the intake and must be reconciled" +
      trailing
    );
  });
}

function guardDenialsDeep(
  node: unknown,
  intakeFlat: Record<string, string>,
  counters: W10RiskB1Counters,
): unknown {
  if (typeof node === "string") return guardProfilingDenials(node, intakeFlat, counters);
  if (Array.isArray(node)) return node.map((v) => guardDenialsDeep(v, intakeFlat, counters));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = guardDenialsDeep(v, intakeFlat, counters);
    return out;
  }
  return node;
}

// ---------- Public entry ----------
export function applyW10RiskB1(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
): { counters: W10RiskB1Counters } {
  const counters = emptyCounters();
  if (!report || typeof report !== "object") return { counters };
  const intakeFlat = flattenIntake(intake ?? {});

  // B1a: inconsistency_flags provenance validation.
  const flagsRaw = (report as Record<string, unknown>).inconsistency_flags;
  if (Array.isArray(flagsRaw)) {
    const kept: unknown[] = [];
    for (const f of flagsRaw) {
      if (!f || typeof f !== "object") { kept.push(f); continue; }
      const repaired = validateAndRepairFlag(f as Record<string, unknown>, intakeFlat, counters);
      if (repaired !== null) kept.push(repaired);
    }
    (report as Record<string, unknown>).inconsistency_flags = kept;
  }

  // B1b: claims guard over risk_register + executive_summary +
  // risk_assessment_by_activity narrative surfaces.
  for (const key of ["risk_register", "executive_summary", "risk_assessment_by_activity"] as const) {
    const v = (report as Record<string, unknown>)[key];
    if (v !== undefined) {
      (report as Record<string, unknown>)[key] = guardObjectDeep(v, intakeFlat, counters);
    }
  }

  // D2 — profiling-denial guard over the same narrative surfaces plus
  // inconsistency_flags (denials sometimes surface inside a flag description).
  for (const key of ["risk_register", "executive_summary", "risk_assessment_by_activity", "inconsistency_flags", "assessment_summary"] as const) {
    const v = (report as Record<string, unknown>)[key];
    if (v !== undefined) {
      (report as Record<string, unknown>)[key] = guardDenialsDeep(v, intakeFlat, counters);
    }
  }

  return { counters };
}
