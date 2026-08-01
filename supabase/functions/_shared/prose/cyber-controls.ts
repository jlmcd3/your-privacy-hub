/**
 * ITEM 337 (PROSE PROGRAM 1, Part D4) — CYBER CONTROL DEDUP + HIPAA PINPOINT.
 *
 * Two recorded defects in the cppa-cyber PDF:
 *
 *   1. The same canonical § 7123(c) component appeared twice in `controls[]`
 *      (e.g. "Access controls" and "Account management" both mapped to
 *      § 7123(c)(1)), which then broke every derived count.
 *   2. HIPAA appeared as a bare framework name ("the HIPAA Security Rule
 *      requires MFA") with no pinpoint and with an operative verb, contrary
 *      to the operative-standard rule: HIPAA is comparative context only and
 *      must carry a 45 C.F.R. pinpoint.
 *
 * Deterministic. Pure. Never throws.
 */

import { splitSentencesSafe } from "./segment.ts";

export const CYBER_PROSE_VERSION = "prose-cyber-2026-08-01-item337";

/** Bare-HIPAA → pinpointed, comparative-framed replacement. */
const HIPAA_PINPOINTS: ReadonlyArray<{ topic: RegExp; cite: string }> = [
  { topic: /\b(multi-?factor|MFA|authenticat\w*|access control|unique user)\b/i, cite: "45 C.F.R. § 164.312(a)(2) and (d)" },
  { topic: /\b(encrypt\w*|at rest|in transit)\b/i, cite: "45 C.F.R. § 164.312(a)(2)(iv) and (e)(2)(ii)" },
  { topic: /\b(audit log\w*|logging|monitor\w*)\b/i, cite: "45 C.F.R. § 164.312(b)" },
  { topic: /\b(risk analysis|risk assessment|risk management)\b/i, cite: "45 C.F.R. § 164.308(a)(1)(ii)" },
  { topic: /\b(incident|breach|response)\b/i, cite: "45 C.F.R. § 164.308(a)(6)" },
  { topic: /\b(train\w*|awareness)\b/i, cite: "45 C.F.R. § 164.308(a)(5)" },
  { topic: /\b(contingency|backup|disaster recovery)\b/i, cite: "45 C.F.R. § 164.308(a)(7)" },
];

const OPERATIVE_VERBS = /\b(requires|mandates|governs|dictates|drives)\b/i;

/**
 * Pinpoint bare "HIPAA Security Rule" mentions and strip operative verbs.
 * A mention that already carries a 45 C.F.R. pinpoint is left untouched.
 */
export function pinpointHipaa(text: string): { text: string; changed: number } {
  let changed = 0;
  const src = String(text ?? "");
  if (!/HIPAA/i.test(src)) return { text: src, changed: 0 };

  const out = splitSentencesSafe(src).map((sentence) => {
    if (!/HIPAA/i.test(sentence)) return sentence;
    let s = sentence;
    if (/45\s*C\.?F\.?R\.?/i.test(s)) return s;
    const hit = HIPAA_PINPOINTS.find((p) => p.topic.test(s));
    const cite = hit?.cite ?? "45 C.F.R. Part 164, Subpart C";
    s = s.replace(
      /\bthe\s+HIPAA\s+Security\s+Rule\b|\bHIPAA\s+Security\s+Rule\b|\bHIPAA\b/i,
      (m) => `${m.startsWith("the") ? m : m} (${cite})`,
    );
    if (OPERATIVE_VERBS.test(s)) {
      s = s.replace(OPERATIVE_VERBS, "addresses");
      if (!/comparative/i.test(s)) s = `For comparative context, ${s[0].toLowerCase()}${s.slice(1)}`;
    }
    changed += 1;
    return s;
  }).join(" ");

  return { text: out, changed };
}

function controlKey(c: Record<string, unknown>): string {
  const cite = String(c.citation ?? c.component_citation ?? "").trim().toLowerCase();
  if (cite) return cite;
  return String(c.control ?? c.component ?? c.name ?? "").trim().toLowerCase();
}

const STATUS_RANK: Record<string, number> = {
  "critical gap": 5,
  "gap": 4,
  "partial": 3,
  "implemented": 2,
  "mature": 2,
  "insufficient information": 1,
};

/**
 * Collapse duplicate controls onto their canonical § 7123(c) component.
 * The MORE SEVERE assessed status wins — deduplication must never launder a
 * gap into an implemented rating. Findings are merged, not discarded.
 */
export function dedupeControls<T extends Record<string, unknown>>(
  controls: readonly T[],
): { controls: T[]; merged: number } {
  const byKey = new Map<string, T>();
  let merged = 0;
  for (const c of controls ?? []) {
    if (!c || typeof c !== "object") continue;
    const key = controlKey(c as Record<string, unknown>);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...c });
      continue;
    }
    merged += 1;
    const rank = (x: unknown) => STATUS_RANK[String(x ?? "").trim().toLowerCase()] ?? 0;
    const keep = rank(c.status) > rank(prev.status) ? { ...c } : { ...prev };
    const loser = rank(c.status) > rank(prev.status) ? prev : c;
    const joinField = (f: string) => {
      const a = String((keep as Record<string, unknown>)[f] ?? "").trim();
      const b = String((loser as Record<string, unknown>)[f] ?? "").trim();
      if (!b || a.includes(b)) return a;
      return a ? `${a} ${b}` : b;
    };
    (keep as Record<string, unknown>).finding = joinField("finding");
    (keep as Record<string, unknown>).remediation = joinField("remediation");
    byKey.set(key, keep);
  }
  return { controls: [...byKey.values()], merged };
}

/** Apply both passes to a cyber report in place; returns telemetry. */
export function applyCyberProsePass(
  report: Record<string, unknown>,
): { controls_merged: number; hipaa_pinpointed: number } {
  const tel = { controls_merged: 0, hipaa_pinpointed: 0 };
  try {
    if (Array.isArray(report.controls)) {
      const { controls, merged } = dedupeControls(report.controls as Record<string, unknown>[]);
      report.controls = controls;
      tel.controls_merged = merged;
    }
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string") {
          const r = pinpointHipaa(v);
          if (r.changed) {
            obj[k] = r.text;
            tel.hipaa_pinpointed += r.changed;
          }
        } else if (v && typeof v === "object") walk(v);
      }
    };
    walk(report);
  } catch {
    /* fail-open — never block emission */
  }
  return tel;
}
