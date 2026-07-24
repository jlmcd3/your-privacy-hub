// W6-CYBER-FIX (2026-07-24) — atomic post-generation scrub for cppa-cyber.
// Addresses wave-6 evidence-verified findings on campaign fd1be147 run
// 41aa6397 (cppa-cyber only):
//   (1) STATUTORY-TEXT INFLATION — regulatory_basis fields inflate the
//       cited § 7123(c)(N) subsection with intake-derived operational
//       language (e.g. "key management practices and field-level
//       protections", "mean time to remediate"). regulatory_basis MUST
//       state only what the cited provision actually says; intake-specific
//       detail is expressed in finding/remediation prose, not merged into
//       statutory paraphrase. This module truncates the model-supplied
//       regulatory_basis clause at the first inflation marker
//       (", including", ", such as", "; ", " — e.g.", " (e.g.", " (i.e.",
//       double-quoted phrases, and known operational-metric tokens).
//   (2) FRAMEWORK OVERRIDE — where the intake elects a framework other
//       than NIST CSF 2.0 (SOC 2, ISO 27001, CIS Controls, HITRUST,
//       PCI DSS, etc.), the report may reference NIST CSF only as an
//       explicitly optional crosswalk, never as "required". This module
//       rewrites "as required under 11 CCR § 7123(e)"/"as required under
//       NIST CSF 2.0" and similar mandate framings in NIST-CSF prose to
//       optional-crosswalk framing when the intake-elected framework
//       differs. If the intake did not elect a framework (or elected NIST
//       CSF 2.0), the prose is left untouched.
//   (3) DERIVED FIGURE AS RECORD FACT — cross-control figure porting
//       ("based on the stated population of NNN total users", derived
//       account estimates presented as record facts) is rewritten to a
//       labelled-derived form ("based on population figures reported for
//       the authentication control (not restated in this control's
//       intake)") or the derivation clause is stripped.
//
// The block is idempotent, fail-open, and self-contained.

export const W6_CYBER_FIX_VERSION = "w6-cyber-fix@2026-07-24";

// ── shared helpers ──────────────────────────────────────────────────────
const NIST_FRAMEWORK_LABEL = /NIST\s+CSF(?:\s+2\.0)?/i;
const NIST_FRAMEWORKS_NORMALIZED = new Set(["NIST CSF 2.0", "NIST CSF"]);

function isNistElection(framework: string | undefined | null): boolean {
  if (!framework) return false;
  return NIST_FRAMEWORK_LABEL.test(String(framework));
}

// ── (1) Regulatory-basis inflation truncation ───────────────────────────
// Strip intake-specific inflation appended to a statutory paraphrase.
// Applied to the model-supplied `regulatory_basis` noun phrase BEFORE it
// is spliced into the deterministic "Assessed under {citation}: ..." frame.
const INFLATION_SPLITS = [
  /,\s*including\s+/i,
  /,\s*such\s+as\s+/i,
  /;\s+/,
  /\s+—\s+e\.g\.\s+/i,
  /\s+-\s+e\.g\.\s+/i,
  /\s+\(e\.g\.,?\s+/i,
  /\s+\(i\.e\.,?\s+/i,
  /\s+"[^"]+"/, // any quoted phrase treated as intake-attribution
  /\s+"[^"]+"/, // curly-quote variant
];

// Operational-metric / implementation tokens that must never appear inside a
// § 7123(c)(N) statutory paraphrase. When present, everything from the token
// onward is dropped (with punctuation cleanup).
const INFLATION_TOKENS = [
  /\b(?:mean|median|average)\s+time\s+to\s+(?:remediate|detect|respond|contain)\b/i,
  /\bkey\s+management\s+practices\b/i,
  /\bfield-level\s+protections?\b/i,
  /\brotation\s+cadence(?:s)?\b/i,
  /\bMTTR\b/,
  /\bMTTD\b/,
  /\bSLA(?:s)?\b/,
];

export function truncateRegulatoryBasisInflation(s: string): { out: string; truncated: boolean } {
  if (!s) return { out: s ?? "", truncated: false };
  let out = s;
  let truncated = false;
  for (const re of INFLATION_SPLITS) {
    const m = out.match(re);
    if (m && typeof m.index === "number") {
      out = out.slice(0, m.index).trim();
      truncated = true;
    }
  }
  for (const re of INFLATION_TOKENS) {
    const m = out.match(re);
    if (m && typeof m.index === "number") {
      // walk back to the nearest sentence/clause boundary
      const cut = out.slice(0, m.index);
      const boundary = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "), cut.lastIndexOf(". "));
      out = (boundary > 0 ? cut.slice(0, boundary) : cut).trim();
      truncated = true;
    }
  }
  out = out.replace(/[\s,;:—–-]+$/g, "").trim();
  return { out, truncated };
}

// ── (2) Framework-override rewrite ──────────────────────────────────────
// Only applied when the intake-elected framework is defined and is NOT
// NIST CSF 2.0. Rewrites mandate framings ("as required under ...")
// around a NIST CSF mention to explicit optional-crosswalk framing.
export function rewriteFrameworkOverride(
  s: string,
  intakeFramework: string | undefined | null,
): { out: string; rewritten: number } {
  if (!s) return { out: s ?? "", rewritten: 0 };
  if (!intakeFramework || isNistElection(intakeFramework)) return { out: s, rewritten: 0 };
  let out = s;
  let rewritten = 0;
  const fw = String(intakeFramework).trim();

  // "corresponding to the [X] function of NIST CSF 2.0, as required under 11 CCR § 7123(e)"
  // → "which crosswalks to the [X] function of NIST CSF 2.0 as an optional reference; the intake-elected [fw] framework governs"
  out = out.replace(
    /corresponding to the ([A-Z][A-Za-z ]+?) function of NIST CSF(?:\s*2\.0)?,?\s+as required under[^.;]*/gi,
    (_m, fn: string) => {
      rewritten++;
      return `which crosswalks to the ${fn.trim()} function of NIST CSF 2.0 as an optional reference; the intake-elected ${fw} framework governs`;
    },
  );

  // "as required under NIST CSF 2.0" → "as an optional crosswalk to NIST CSF 2.0"
  out = out.replace(/\bas\s+required\s+under\s+NIST\s+CSF(?:\s*2\.0)?\b/gi, () => {
    rewritten++;
    return "as an optional crosswalk to NIST CSF 2.0";
  });

  // "required by NIST CSF 2.0" → "referenced in NIST CSF 2.0 as an optional crosswalk"
  out = out.replace(/\brequired\s+by\s+NIST\s+CSF(?:\s*2\.0)?\b/gi, () => {
    rewritten++;
    return "referenced in NIST CSF 2.0 as an optional crosswalk";
  });

  // "mandated (by|under) NIST CSF 2.0" → "referenced in NIST CSF 2.0 as an optional crosswalk"
  out = out.replace(/\bmandated\s+(?:by|under)\s+NIST\s+CSF(?:\s*2\.0)?\b/gi, () => {
    rewritten++;
    return "referenced in NIST CSF 2.0 as an optional crosswalk";
  });

  // Guard against the specific "as required under 11 CCR § 7123(e)" claim being
  // attached to a NIST-CSF sentence. § 7123(e) does not incorporate NIST CSF.
  // If a sentence contains a NIST CSF mention and "as required under ... 7123(e)",
  // strip the "as required" clause.
  // Sentence guard — split on periods so an unrelated preceding sentence
  // isn't dragged in; use character classes that TOLERATE version dots
  // ("2.0") within the NIST-CSF vicinity.
  out = out.split(/(?<=\.)\s+/).map((sent) => {
    if (!/NIST\s+CSF/i.test(sent)) return sent;
    const m = sent.match(/,?\s+as required under\s+(?:11\s*CCR\s+)?§?\s*7123\(e\)/i);
    if (!m) return sent;
    rewritten++;
    const before = sent.slice(0, m.index!).replace(/[,\s]+$/g, "");
    const after = sent.slice(m.index! + m[0].length);
    return `${before} (optional crosswalk; the intake-elected ${fw} framework governs)${after}`;
  }).join(" ");

  return { out: out.replace(/[ \t]{2,}/g, " "), rewritten };
}

// ── (3) Derived / cross-control figure porting ──────────────────────────
// Pattern from wave 6: an account-management finding cited "approximately
// 16–17 accounts at the reported completion rate, based on the stated
// population of 580 total users across engineering and staff" — where the
// 580 figure came from a DIFFERENT control's intake (authentication:
// 168 engineering + 412 staff). This scrub relaxes such derivations to a
// labelled-derived form OR strips the derivation clause entirely, so the
// finding does not present a cross-ported figure as a stated record fact.
export function scrubCrossControlDerivedFigures(s: string): { out: string; scrubbed: number } {
  if (!s) return { out: s ?? "", scrubbed: 0 };
  let out = s;
  let scrubbed = 0;

  // "based on the stated population of NNN total users [across X and Y]"
  out = out.replace(
    /,?\s*based on the stated population of\s+\d[\d,]*\s+total users(?:\s+across\s+[^.,;]+)?/gi,
    () => {
      scrubbed++;
      return " (derived from population figures reported in a separate control's intake, not restated in this control)";
    },
  );

  // "approximately N–M accounts at the reported completion rate" → label as derived
  out = out.replace(
    /\bapproximately\s+\d+\s*[–\-]\s*\d+\s+accounts?\s+at\s+the\s+reported\s+completion\s+rate\b/gi,
    (m: string) => {
      scrubbed++;
      return `${m} (derived estimate; the account-management intake does not state a population)`;
    },
  );

  // Generic "based on the population of NNN [users|accounts]" outside a
  // stated-fact context — label as derived.
  out = out.replace(
    /,?\s*based on the population of\s+\d[\d,]*\s+(?:users?|accounts?|employees?)\b/gi,
    (m: string) => {
      scrubbed++;
      return `${m} (derived; source population is reported in a separate control's intake)`;
    },
  );

  return { out: out.replace(/[ \t]{2,}/g, " "), scrubbed };
}

// ── orchestrator ────────────────────────────────────────────────────────
type CyberReport = Record<string, unknown> & {
  controls?: Array<Record<string, unknown>>;
  executive_summary?: string;
  top_risks?: unknown[];
  next_steps?: unknown[];
};

type CyberIntake = Record<string, unknown> & {
  profile?: { framework?: string | null; [k: string]: unknown };
  framework?: string | null;
  primary_framework?: string | null;
};

function readIntakeFramework(intake: CyberIntake | null | undefined): string | undefined {
  if (!intake || typeof intake !== "object") return undefined;
  const p = (intake as any).profile;
  const raw =
    (p && typeof p === "object" && (p as any).framework) ||
    (intake as any).primary_framework ||
    (intake as any).framework;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

const PROSE_FIELDS = [
  "finding",
  "remediation",
  "enforcement_context",
] as const;

export function applyW6CyberFix(
  report: CyberReport | null | undefined,
  intake: CyberIntake | null | undefined,
): {
  regulatoryBasisTruncated: number;
  frameworkRewritten: number;
  derivedFiguresScrubbed: number;
  framework: string | null;
} {
  const counters = {
    regulatoryBasisTruncated: 0,
    frameworkRewritten: 0,
    derivedFiguresScrubbed: 0,
    framework: null as string | null,
  };
  if (!report || typeof report !== "object") return counters;
  const framework = readIntakeFramework(intake);
  counters.framework = framework ?? null;

  const applyToString = (s: unknown): string | undefined => {
    if (typeof s !== "string") return undefined;
    let out = s;
    if (framework && !isNistElection(framework)) {
      const fw = rewriteFrameworkOverride(out, framework);
      out = fw.out;
      counters.frameworkRewritten += fw.rewritten;
    }
    const df = scrubCrossControlDerivedFigures(out);
    out = df.out;
    counters.derivedFiguresScrubbed += df.scrubbed;
    return out;
  };

  // Controls: prose fields + regulatory_basis inflation truncation
  const controls = Array.isArray(report.controls) ? report.controls : [];
  for (const c of controls) {
    if (!c || typeof c !== "object") continue;
    for (const key of PROSE_FIELDS) {
      const patched = applyToString((c as any)[key]);
      if (patched !== undefined) (c as any)[key] = patched;
    }
    // regulatory_basis: strip inflation before/after the framework rewrite.
    // The final regulatory_basis carries a deterministic frame appended by
    // index.ts ("Assessed under {citation}: the annual cybersecurity audit
    // must assess {cleanedRegBasis}, as applicable to the business."). We
    // must only truncate the tail of that composed sentence — the tail
    // begins after the "must assess " marker.
    const rb = (c as any).regulatory_basis;
    if (typeof rb === "string" && rb.length > 0) {
      const marker = "must assess ";
      const idx = rb.indexOf(marker);
      if (idx >= 0) {
        const head = rb.slice(0, idx + marker.length);
        const tail = rb.slice(idx + marker.length);
        // Strip a trailing ", as applicable to the business." if present so
        // the truncator sees only the noun phrase.
        const trailerMatch = tail.match(/,\s*as applicable to the business\.?\s*$/i);
        const trailer = trailerMatch ? trailerMatch[0] : "";
        const nounPhrase = trailerMatch ? tail.slice(0, trailerMatch.index!) : tail.replace(/\.\s*$/, "");
        const { out: cleanedNoun, truncated } = truncateRegulatoryBasisInflation(nounPhrase);
        if (truncated) {
          counters.regulatoryBasisTruncated++;
          const rebuilt =
            head +
            cleanedNoun.replace(/[\s,;:—–-]+$/g, "") +
            (trailer && trailer.length > 0 ? trailer : ".");
          (c as any).regulatory_basis = rebuilt;
        }
      } else {
        // No frame marker — treat entire string as a noun phrase.
        const { out, truncated } = truncateRegulatoryBasisInflation(rb);
        if (truncated) {
          counters.regulatoryBasisTruncated++;
          (c as any).regulatory_basis = out;
        }
      }
    }
  }

  // Top-level prose surfaces
  if (typeof report.executive_summary === "string") {
    const patched = applyToString(report.executive_summary);
    if (patched !== undefined) report.executive_summary = patched;
  }
  for (const arrKey of ["top_risks", "next_steps"] as const) {
    const arr = (report as any)[arrKey];
    if (Array.isArray(arr)) {
      for (let i = 0; i < arr.length; i++) {
        if (typeof arr[i] === "string") {
          const patched = applyToString(arr[i]);
          if (patched !== undefined) arr[i] = patched;
        } else if (arr[i] && typeof arr[i] === "object") {
          for (const k of Object.keys(arr[i])) {
            const patched = applyToString(arr[i][k]);
            if (patched !== undefined) arr[i][k] = patched;
          }
        }
      }
    }
  }

  return counters;
}
