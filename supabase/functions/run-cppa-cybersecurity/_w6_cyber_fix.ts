// W6-CYBER-FIX (2026-07-24 v2) — atomic post-generation scrub for cppa-cyber.
// Wave-6 + Wave-7 evidence-verified findings on campaign fd1be147.
//
//   (1) REGULATORY-BASIS FIDELITY — regulatory_basis MUST paraphrase the
//       cited § 7123(c)(N) subsection only; intake-specific detail or
//       remediation-metric language must not be spliced in. Additionally,
//       "N-year …retention rule" named-rule assertions without a pinpoint
//       cite are rewritten to a "confirm pinpoint" form so a fabricated
//       named rule is not carried as regulation.
//   (2) OPERATIVE-STANDARD DISCIPLINE — 11 CCR § 7123 is the sole
//       operative standard. Comparative frameworks (HIPAA, NIST CSF,
//       HITRUST, ISO 27001, SOC 2) may appear only as comparative context,
//       never with an operative verb ("requires/governs/drives/is the
//       operative standard/mandates") applied to this assessment. The
//       intake-elected framework is NEVER silently substituted.
//   (3) DERIVED FIGURE AS RECORD FACT — cross-control figure porting is
//       labelled derived (with the source control named) or stripped.
//
// The block is idempotent, fail-open, and self-contained.

export const W6_CYBER_FIX_VERSION = "w6-cyber-fix@2026-07-24-v2";

// ── shared helpers ──────────────────────────────────────────────────────
const NIST_FRAMEWORK_LABEL = /NIST\s+CSF(?:\s+2\.0)?/i;

function isNistElection(framework: string | undefined | null): boolean {
  if (!framework) return false;
  return NIST_FRAMEWORK_LABEL.test(String(framework));
}

// ── (1a) Regulatory-basis inflation truncation ──────────────────────────
const INFLATION_SPLITS = [
  /,\s*including\s+/i,
  /,\s*such\s+as\s+/i,
  /;\s+/,
  /\s+—\s+e\.g\.\s+/i,
  /\s+-\s+e\.g\.\s+/i,
  /\s+\(e\.g\.,?\s+/i,
  /\s+\(i\.e\.,?\s+/i,
  /\s+"[^"]+"/,
  /\s+"[^"]+"/,
];

// Operational-metric / implementation tokens that must never appear inside a
// § 7123(c)(N) statutory paraphrase.
const INFLATION_TOKENS = [
  /\b(?:mean|median|average)\s+time\s+to\s+(?:remediate|detect|respond|contain)\b/i,
  /\bkey\s+management\s+practices\b/i,
  /\bfield-level\s+protections?\b/i,
  /\brotation\s+cadence(?:s)?\b/i,
  /\bMTTR\b/,
  /\bMTTD\b/,
  /\bSLA(?:s)?\b/,
  // Wave-7 additions
  /\bintegrity\s+protection\b/i,
  /\bsecurity-relevant\s+logs?\b/i,
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
      const cut = out.slice(0, m.index);
      const boundary = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "), cut.lastIndexOf(". "));
      out = (boundary > 0 ? cut.slice(0, boundary) : cut).trim();
      truncated = true;
    }
  }
  out = out.replace(/[\s,;:—–-]+$/g, "").trim();
  return { out, truncated };
}

// ── (1b) Named-rule without pinpoint cite ───────────────────────────────
// Wave-7 pattern: "the five-year audit-record retention rule" asserted as
// a named regulatory rule with no pinpoint cite. Rewrite to a "confirm
// pinpoint" form so a fabricated named rule is not carried as regulation.
// Only fires if no § pinpoint appears in the same sentence.
const NAMED_RULE_RE =
  /\bthe\s+(?:two|three|five|seven|ten|\d+)[-\s](?:year|month)\s+([A-Za-z][A-Za-z\s-]*?)\s+rule\b/gi;

export function rewriteUncitedNamedRules(s: string): { out: string; rewritten: number } {
  if (!s) return { out: s ?? "", rewritten: 0 };
  let rewritten = 0;
  const sentences = s.split(/(?<=[.;])\s+/);
  const patched = sentences.map((sent) => {
    if (!NAMED_RULE_RE.test(sent)) {
      NAMED_RULE_RE.lastIndex = 0;
      return sent;
    }
    NAMED_RULE_RE.lastIndex = 0;
    // If sentence already carries a pinpoint (§ NNNN or § NNNN.N or § 7124…),
    // leave it alone.
    if (/§\s*\d/.test(sent)) return sent;
    const replaced = sent.replace(NAMED_RULE_RE, (_m, subj: string) => {
      rewritten++;
      const s2 = String(subj || "").trim().toLowerCase();
      return `the ${s2 ? s2 + " " : ""}retention requirement (confirm pinpoint cite, see § 7124 et seq.)`;
    });
    return replaced;
  });
  return { out: patched.join(" ").replace(/[ \t]{2,}/g, " "), rewritten };
}

// ── (2) Framework-override rewrite (intake vs NIST CSF) ─────────────────
export function rewriteFrameworkOverride(
  s: string,
  intakeFramework: string | undefined | null,
): { out: string; rewritten: number } {
  if (!s) return { out: s ?? "", rewritten: 0 };
  if (!intakeFramework || isNistElection(intakeFramework)) return { out: s, rewritten: 0 };
  let out = s;
  let rewritten = 0;
  const fw = String(intakeFramework).trim();

  out = out.replace(
    /corresponding to the ([A-Z][A-Za-z ]+?) function of NIST CSF(?:\s*2\.0)?,?\s+as required under[^.;]*/gi,
    (_m, fn: string) => {
      rewritten++;
      return `which crosswalks to the ${fn.trim()} function of NIST CSF 2.0 as an optional reference; the intake-elected ${fw} framework governs`;
    },
  );

  out = out.replace(/\bas\s+required\s+under\s+NIST\s+CSF(?:\s*2\.0)?\b/gi, () => {
    rewritten++;
    return "as an optional crosswalk to NIST CSF 2.0";
  });

  out = out.replace(/\brequired\s+by\s+NIST\s+CSF(?:\s*2\.0)?\b/gi, () => {
    rewritten++;
    return "referenced in NIST CSF 2.0 as an optional crosswalk";
  });

  out = out.replace(/\bmandated\s+(?:by|under)\s+NIST\s+CSF(?:\s*2\.0)?\b/gi, () => {
    rewritten++;
    return "referenced in NIST CSF 2.0 as an optional crosswalk";
  });

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

// ── (2b) Operative-standard discipline for comparative frameworks ───────
// Closed list of five comparative frameworks (expansion only on evidenced
// wave findings, per accepted convention). Wave-7 evidence: HIPAA framed
// as operative ("The HIPAA Security Rule (45 CFR Part 164) requires…").
// Detect a comparative-framework name within an operative-verb window and
// rewrite to comparative framing.
const COMPARATIVE_FRAMEWORKS: Array<{ label: string; re: RegExp }> = [
  { label: "HIPAA", re: /\bHIPAA(?:\s+Security\s+Rule)?(?:\s+\(45\s*C\.?F\.?R\.?\s+Part\s+164\))?\b/i },
  { label: "NIST CSF 2.0", re: /\bNIST\s+CSF(?:\s+2\.0)?\b/i },
  { label: "HITRUST", re: /\bHITRUST(?:\s+CSF)?\b/i },
  { label: "ISO 27001", re: /\bISO(?:\/IEC)?\s*27001\b/i },
  { label: "SOC 2", re: /\bSOC\s*2\b/i },
];

// Operative verbs that must not be applied to comparative frameworks.
const OPERATIVE_VERBS_RE =
  /\b(?:requires?|governs?|drives?|mandates?|dictates?|controls?|is\s+the\s+operative\s+standard\s+for|is\s+the\s+governing\s+standard\s+for)\b/i;

// A1 fix (2026-07-24): the appended operative tail must resolve the § 7123(c)
// subsection from the CALLING control's own citation. When the caller has no
// per-control context (executive_summary / top_risks / next_steps), the tail
// is OMITTED entirely — we NEVER emit "(N)" or any unresolved placeholder
// token in customer-facing output.
export interface RewriteCompOpts {
  /** Full per-control citation, e.g. "11 CCR § 7123(c)(1)". If omitted, no
   *  operative tail is appended. */
  controlCitation?: string;
}

// Safety net — strip any stray "(N)" literal that slipped through earlier
// builds. Also normalizes "§ 7123(c)(N)" → "§ 7123(c)" when N is the literal
// token "N".
function stripLiteralNPlaceholder(s: string): string {
  return s
    .replace(/11\s*CCR\s*§\s*7123\(c\)\(N\)/gi, "11 CCR § 7123(c)")
    .replace(/§\s*7123\(c\)\(N\)/gi, "§ 7123(c)")
    .replace(/\(c\)\(N\)/g, "(c)");
}

export function rewriteComparativeAsOperative(
  s: string,
  opts: RewriteCompOpts = {},
): { out: string; rewritten: number } {
  if (!s) return { out: s ?? "", rewritten: 0 };
  let rewritten = 0;
  // WAVE12-FIX TURN E (E1a root cause): split on real sentence terminators
  // (. ! ?) — NOT on `;`. Splitting on ";" caused fragments like
  // "For comparative context, the ISO 27001 framework provides comparative
  // guidance on;" because "X governs; the operative requirement is Y" was
  // sliced into two clauses and only the head was rewritten, orphaning the
  // preposition. Splitting on true terminators keeps operative-verb clauses
  // whole with their objects.
  const sentences = s.split(/(?<=[.!?])\s+/);
  const patched = sentences.map((sent) => {
    if (!OPERATIVE_VERBS_RE.test(sent)) return sent;
    const hit = COMPARATIVE_FRAMEWORKS.find((f) => f.re.test(sent));
    if (!hit) return sent;
    if (/11\s*CCR\s*§\s*7123/i.test(sent) && !hit.re.test(sent.split(/11\s*CCR/i)[0] ?? "")) {
      return sent;
    }
    rewritten++;
    let rewritten_sent = sent
      .replace(/\brequires?\b/gi, "addresses")
      .replace(/\bmandates?\b/gi, "addresses")
      .replace(/\bgoverns?\b/gi, "provides comparative guidance on")
      .replace(/\bdrives?\b/gi, "informs")
      .replace(/\bdictates?\b/gi, "addresses")
      .replace(/\bis\s+the\s+operative\s+standard\s+for\b/gi, "provides comparative context for")
      .replace(/\bis\s+the\s+governing\s+standard\s+for\b/gi, "provides comparative context for");
    // TURN E E1a — orphan-preposition rollback: if the rewrite left a stub
    // (verb-phrase ending in a bare preposition immediately before a
    // terminator/semicolon) OMIT the transformed clause entirely rather
    // than emit "…provides comparative guidance on;". Per dispatch: "where
    // a comparative clause has no substantive content, omit the clause".
    if (/\b(?:on|of|for|to|in|at|with|by|from|as)\s*[.;:!?]?\s*$/i.test(rewritten_sent)) {
      rewritten--;
      return "";
    }
    if (!/for\s+comparative\s+context/i.test(rewritten_sent)) {
      rewritten_sent = `For comparative context, ${rewritten_sent.charAt(0).toLowerCase()}${rewritten_sent.slice(1)}`;
    }
    // A1: append the operative tail ONLY when we have a resolved per-control
    // citation. Otherwise omit — never emit "(N)".
    const cite = opts.controlCitation && /11\s*CCR\s*§\s*7123\(c\)\(\d+\)/i.test(opts.controlCitation)
      ? opts.controlCitation
      : "";
    if (cite && !/operative\s+requirement\s+is\s+11\s*CCR\s*§\s*7123/i.test(rewritten_sent)) {
      rewritten_sent = rewritten_sent.replace(/[.;]?\s*$/, "") +
        `; the operative requirement is ${cite}.`;
    }
    return rewritten_sent;
  }).filter((x) => x.length > 0);
  return { out: stripLiteralNPlaceholder(patched.join(" ").replace(/[ \t]{2,}/g, " ")), rewritten };
}

// ── (3) Derived / cross-control figure porting ──────────────────────────
export function scrubCrossControlDerivedFigures(s: string): { out: string; scrubbed: number } {
  if (!s) return { out: s ?? "", scrubbed: 0 };
  let out = s;
  let scrubbed = 0;

  out = out.replace(
    /,?\s*based on the stated population of\s+\d[\d,]*\s+total users(?:\s+across\s+[^.,;]+)?/gi,
    () => {
      scrubbed++;
      return " (derived from population figures reported in a separate control's intake, not restated in this control)";
    },
  );

  out = out.replace(
    /\bapproximately\s+\d+\s*[–\-]\s*\d+\s+accounts?\s+at\s+the\s+reported\s+completion\s+rate\b/gi,
    (m: string) => {
      scrubbed++;
      return `${m} (derived estimate; the account-management intake does not state a population)`;
    },
  );

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

// Anchor keys skipped by the walker (accepted convention across W6 fixes).
const ANCHOR_KEYS = new Set([
  "field", "source_fields", "field_ids", "citation_ids",
  "intake_field_1", "intake_field_2", "canonical_fields", "element_id",
]);

// A1 (2026-07-24): per-control § 7123(c) citation registry keyed by the
// canonical report control label. Mirrors index.ts COMPONENT_CITATIONS.
// Any label not in this map yields undefined → operative tail is OMITTED
// (never emits "(N)" or an unresolved placeholder).
const COMPONENT_CITATION_BY_LABEL: Record<string, string> = {
  "Authentication": "11 CCR § 7123(c)(1)",
  "Encryption of personal information": "11 CCR § 7123(c)(2)",
  "Account management and access controls": "11 CCR § 7123(c)(3)",
  "Inventory and management of personal information and systems": "11 CCR § 7123(c)(4)",
  "Secure configuration of hardware and software": "11 CCR § 7123(c)(5)",
  "Vulnerability scanning and penetration testing": "11 CCR § 7123(c)(6)",
  "Audit-log management": "11 CCR § 7123(c)(7)",
  "Network monitoring and defenses": "11 CCR § 7123(c)(8)",
  "Antivirus and anti-malware protections": "11 CCR § 7123(c)(9)",
  "Segmentation of an information system": "11 CCR § 7123(c)(10)",
  "Port and protocol management and protection": "11 CCR § 7123(c)(11)",
  "Cybersecurity awareness": "11 CCR § 7123(c)(12)",
  "Cybersecurity education and training": "11 CCR § 7123(c)(13)",
  "Secure development and coding practices": "11 CCR § 7123(c)(14)",
  "Oversight of service providers, contractors, and third parties": "11 CCR § 7123(c)(15)",
  "Retention schedules and proper disposal of personal information": "11 CCR § 7123(c)(16)",
  "Security-incident response management": "11 CCR § 7123(c)(17)",
  "Business-continuity and disaster-recovery planning": "11 CCR § 7123(c)(18)",
};

function resolveControlCitation(label: unknown): string | undefined {
  if (typeof label !== "string") return undefined;
  return COMPONENT_CITATION_BY_LABEL[label.trim()];
}

export function applyW6CyberFix(
  report: CyberReport | null | undefined,
  intake: CyberIntake | null | undefined,
): {
  regulatoryBasisTruncated: number;
  frameworkRewritten: number;
  derivedFiguresScrubbed: number;
  namedRuleRewritten: number;
  comparativeOperativeRewritten: number;
  regulatoryBasisScrubZeroRuns: number;
  framework: string | null;
} {
  const counters = {
    regulatoryBasisTruncated: 0,
    frameworkRewritten: 0,
    derivedFiguresScrubbed: 0,
    namedRuleRewritten: 0,
    comparativeOperativeRewritten: 0,
    regulatoryBasisScrubZeroRuns: 0,
    framework: null as string | null,
  };
  if (!report || typeof report !== "object") return counters;
  const framework = readIntakeFramework(intake);
  counters.framework = framework ?? null;

  // A1 (2026-07-24): resolve the calling control's § 7123(c) citation from
  // the report's own control label so rewriteComparativeAsOperative can
  // stamp the correct operative anchor. For fields with no per-control
  // context (executive_summary/top_risks/next_steps), citation is omitted
  // and the operative tail is not appended.
  const applyToString = (s: unknown, key?: string, controlCitation?: string): string | undefined => {
    if (typeof s !== "string") return undefined;
    if (key && ANCHOR_KEYS.has(key)) return undefined;
    let out = s;
    if (framework && !isNistElection(framework)) {
      const fw = rewriteFrameworkOverride(out, framework);
      out = fw.out;
      counters.frameworkRewritten += fw.rewritten;
    }
    const comp = rewriteComparativeAsOperative(out, { controlCitation });
    out = comp.out;
    counters.comparativeOperativeRewritten += comp.rewritten;
    const named = rewriteUncitedNamedRules(out);
    out = named.out;
    counters.namedRuleRewritten += named.rewritten;
    const df = scrubCrossControlDerivedFigures(out);
    out = df.out;
    counters.derivedFiguresScrubbed += df.scrubbed;
    return out;
  };

  const controls = Array.isArray(report.controls) ? report.controls : [];
  let rbScrubbed = 0;
  for (const c of controls) {
    if (!c || typeof c !== "object") continue;
    const cite = resolveControlCitation((c as any).control);
    for (const key of PROSE_FIELDS) {
      const patched = applyToString((c as any)[key], key, cite);
      if (patched !== undefined) (c as any)[key] = patched;
    }
    const rb = (c as any).regulatory_basis;
    if (typeof rb === "string" && rb.length > 0) {
      const marker = "must assess ";
      const idx = rb.indexOf(marker);
      // Apply named-rule rewrite to regulatory_basis wholesale first
      const named = rewriteUncitedNamedRules(rb);
      let working = named.out;
      if (named.rewritten > 0) counters.namedRuleRewritten += named.rewritten;
      if (idx >= 0) {
        const head = working.slice(0, idx + marker.length);
        const tail = working.slice(idx + marker.length);
        const trailerMatch = tail.match(/,\s*as applicable to the business\.?\s*$/i);
        const trailer = trailerMatch ? trailerMatch[0] : "";
        const nounPhrase = trailerMatch ? tail.slice(0, trailerMatch.index!) : tail.replace(/\.\s*$/, "");
        const { out: cleanedNoun, truncated } = truncateRegulatoryBasisInflation(nounPhrase);
        if (truncated) {
          counters.regulatoryBasisTruncated++;
          rbScrubbed++;
          const rebuilt =
            head +
            cleanedNoun.replace(/[\s,;:—–-]+$/g, "") +
            (trailer && trailer.length > 0 ? trailer : ".");
          (c as any).regulatory_basis = rebuilt;
        } else if (named.rewritten > 0) {
          (c as any).regulatory_basis = working;
        }
      } else {
        const { out, truncated } = truncateRegulatoryBasisInflation(working);
        if (truncated) {
          counters.regulatoryBasisTruncated++;
          rbScrubbed++;
          (c as any).regulatory_basis = out;
        } else if (named.rewritten > 0) {
          (c as any).regulatory_basis = working;
        }
      }
    }
  }
  // Telemetry: zero-scrub runs (per Item 1 deviation note) — if the report
  // has ≥1 control regulatory_basis field but the scrubber found nothing to
  // truncate, count this run so we can measure prompt-only compliance.
  if (controls.length > 0 && rbScrubbed === 0) counters.regulatoryBasisScrubZeroRuns = 1;

  if (typeof report.executive_summary === "string") {
    const patched = applyToString(report.executive_summary, "executive_summary");
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
            if (ANCHOR_KEYS.has(k)) continue;
            const patched = applyToString(arr[i][k], k);
            if (patched !== undefined) arr[i][k] = patched;
          }
        }
      }
    }
  }

  return counters;
}
