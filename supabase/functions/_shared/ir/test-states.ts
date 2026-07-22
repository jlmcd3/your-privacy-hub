// QB-P22 item 2 — shared IR TEST-STATES / DEADLINES enrichment.
// Extracted verbatim from generate-ir-playbook/index.ts so run-quality-batch
// can present the grader with the SAME enriched intake the generator receives.
// Previously the generator computed a DEADLINES block from the raw fixture and
// appended it to the model prompt, but the grader saw only the raw intake JSON
// persisted on ir_playbooks.intake_data — so the model's truthful reference to
// "the DEADLINES block in the intake" looked like a hallucination.

export type IrStateKind =
  | "RESOLVED_MET" | "RESOLVED_NOT_MET" | "RESOLVED_CHECK_REQUIRED"
  | "CANDIDATE" | "INDETERMINATE" | "JUDGMENT";

export interface IrTestState { id: string; label: string; state: IrStateKind; basis: string; }
export interface IrDeadlineRow { jurisdiction: string; statute: string; deadline: string; note: string; }

export interface IrBody {
  organizationName?: string;
  discoveryDateTime?: string;
  cause?: string;
  dataTypes?: string[];
  affectedCount?: string;
  jurisdictions?: string[];
  processorInvolved?: boolean;
  processorName?: string;
  contained?: string;
  organisationType?: string;
  [k: string]: unknown;
}

function normJurisdictions(j: string[] | undefined): Set<string> {
  return new Set((Array.isArray(j) ? j : []).map((x) => String(x).toLowerCase().trim()));
}
function hasCA(js: Set<string>): boolean {
  for (const j of js) {
    if (j === "california" || j === "us-ca" || j === "ca" || j === "us:ca" || j.includes("california") || j.endsWith("-ca")) return true;
  }
  return false;
}
function hasGdpr(js: Set<string>): boolean {
  const eu = ["united kingdom","ireland","france","germany","spain","italy","netherlands","belgium","sweden","denmark","poland","greece","portugal","austria","finland","norway","luxembourg"];
  for (const j of js) {
    if (j.includes("gdpr") || j.includes("eu ") || j === "eu" || j === "european union") return true;
    if (eu.some((c) => j === c || j.includes(c))) return true;
  }
  return false;
}
function hasJur(js: Set<string>, name: string): boolean {
  const n = name.toLowerCase();
  for (const j of js) if (j === n || j.includes(n)) return true;
  return false;
}
function parseCountApprox(s: string | undefined): number | null {
  if (!s) return null;
  const digits = String(s).replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}
function addDays(iso: string, days: number): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function addHours(iso: string, hours: number): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function computeIrTestStates(body: IrBody): { tests: IrTestState[]; deadlines: IrDeadlineRow[] } {
  const js = normJurisdictions(body.jurisdictions);
  const ca = hasCA(js);
  const gdpr = hasGdpr(js);
  const tx = hasJur(js, "texas");
  const ny = hasJur(js, "new york");
  const co = hasJur(js, "colorado");
  const or = hasJur(js, "oregon");
  const va = hasJur(js, "virginia");
  const count = parseCountApprox(body.affectedCount);
  const hasDisc = typeof body.discoveryDateTime === "string" && body.discoveryDateTime.trim().length > 0 && !isNaN(new Date(body.discoveryDateTime).getTime());
  const dts = Array.isArray(body.dataTypes) ? body.dataTypes : [];
  const sensitiveOverlap = dts.some((d) => /health|medical|biometric|children|financial|payment/i.test(String(d)));

  const tests: IrTestState[] = [
    { id: "M-CA", label: "California §1798.82 in scope", state: ca ? "RESOLVED_MET" : "RESOLVED_NOT_MET", basis: `intake.jurisdictions ${ca ? "includes" : "excludes"} California` },
    { id: "M-GDPR", label: "GDPR/UK GDPR Art. 33/34 in scope", state: gdpr ? "RESOLVED_MET" : "RESOLVED_NOT_MET", basis: `intake.jurisdictions ${gdpr ? "includes" : "excludes"} an EU/UK jurisdiction` },
    { id: "M-TX", label: "Texas §521.053 in scope", state: tx ? "RESOLVED_MET" : "RESOLVED_NOT_MET", basis: `intake.jurisdictions ${tx ? "includes" : "excludes"} Texas` },
    { id: "M-NY", label: "New York §899-aa in scope", state: ny ? "RESOLVED_MET" : "RESOLVED_NOT_MET", basis: `intake.jurisdictions ${ny ? "includes" : "excludes"} New York` },
    { id: "M-CO", label: "Colorado §6-1-716 in scope", state: co ? "RESOLVED_MET" : "RESOLVED_NOT_MET", basis: `intake.jurisdictions ${co ? "includes" : "excludes"} Colorado` },
    { id: "M-OR", label: "Oregon ORS 646A.604 in scope", state: or ? "RESOLVED_MET" : "RESOLVED_NOT_MET", basis: `intake.jurisdictions ${or ? "includes" : "excludes"} Oregon` },
    { id: "M-VA", label: "Virginia §18.2-186.6 in scope", state: va ? "RESOLVED_MET" : "RESOLVED_NOT_MET", basis: `intake.jurisdictions ${va ? "includes" : "excludes"} Virginia` },
    { id: "M-PROC", label: "Processor involvement", state: body.processorInvolved ? "RESOLVED_MET" : "RESOLVED_NOT_MET", basis: `intake.processorInvolved = ${body.processorInvolved}${body.processorInvolved && body.processorName ? `; name = ${body.processorName}` : ""}` },
    { id: "M-CONT", label: "Containment status supplied", state: (body.contained && String(body.contained).trim().length > 0) ? "RESOLVED_MET" : "INDETERMINATE", basis: `intake.contained = ${body.contained || "(empty)"}` },
    { id: "M-DISC", label: "Discovery timestamp supplied (PROVISIONAL anchor for deadline arithmetic pending confirmed controller-awareness timestamp)", state: hasDisc ? "RESOLVED_MET" : "INDETERMINATE", basis: `intake.discoveryDateTime = ${body.discoveryDateTime || "(empty)"}` },
    { id: "M-COUNT", label: "Approximate affected-individual count supplied (TOTAL — not per-state; see M-CA-SEG)", state: count !== null ? "RESOLVED_MET" : "INDETERMINATE", basis: `intake.affectedCount = ${body.affectedCount || "(empty)"}` },
    { id: "M-SENS", label: "Sensitive-category candidate under §1798.82(h)(1)(A)–(B) (coarse data-type overlap only — name-plus-element combination is not confirmed by intake)", state: sensitiveOverlap ? "CANDIDATE" : "RESOLVED_NOT_MET", basis: `intake.dataTypes overlap with {health, biometric, children, financial} = ${sensitiveOverlap}` },
    { id: "M-CA-H1C", label: "§1798.82(h)(1)(C) account/card-plus-access-code combination check", state: ca ? "RESOLVED_CHECK_REQUIRED" : "RESOLVED_NOT_MET", basis: ca ? "Permanent check per §1798.82(d)(2)(G) AND (h)(1)(C) DETERMINATIONS STAY OPEN rule — always instruct the user to confirm whether both elements were exposed, regardless of intake.dataTypes" : "California not in scope" },
    { id: "M-CA-SEG", label: "California per-state resident segmentation required for the 500+ AG-copy threshold", state: ca ? "RESOLVED_CHECK_REQUIRED" : "RESOLVED_NOT_MET", basis: ca ? "RESIDENT COUNT GATE — total affectedCount is not operative; segment for confirmed CA residents" : "California not in scope" },
    { id: "M-TX-SEG", label: "Texas per-state resident segmentation required for the 250+ AG-notice threshold", state: tx ? "RESOLVED_CHECK_REQUIRED" : "RESOLVED_NOT_MET", basis: tx ? "RESIDENT COUNT GATE — segment for confirmed TX residents" : "Texas not in scope" },
    { id: "M-VA-SEG", label: "Virginia per-state resident segmentation required for the 1,000+ CRA-notice threshold", state: va ? "RESOLVED_CHECK_REQUIRED" : "RESOLVED_NOT_MET", basis: va ? "RESIDENT COUNT GATE — segment for confirmed VA residents" : "Virginia not in scope" },
  ];

  const deadlines: IrDeadlineRow[] = [];
  if (hasDisc && body.discoveryDateTime) {
    const iso = body.discoveryDateTime;
    if (gdpr) {
      const dl = addHours(iso, 72);
      if (dl) deadlines.push({ jurisdiction: "EU/UK GDPR", statute: "Art. 33(1)", deadline: dl, note: "72 hours from CONTROLLER-AWARENESS TIMESTAMP; anchor here is the detection timestamp treated PROVISIONALLY as concurrent with awareness — recalculate on confirmation." });
    }
    if (ca) {
      const dl = addDays(iso, 30);
      if (dl) deadlines.push({ jurisdiction: "California — individuals", statute: "Cal. Civ. Code §1798.82 (as amended by SB 446, eff. 1 Jan 2026)", deadline: dl, note: "30 calendar days from discovery; law-enforcement and scope/integrity delay allowances RETAINED. AG sample-copy clock is +15 calendar days from consumer-notice date when >500 confirmed CA residents (see M-CA-SEG)." });
    }
    if (tx) {
      const indiv = addDays(iso, 60);
      const ag = addDays(iso, 30);
      if (indiv) deadlines.push({ jurisdiction: "Texas — individuals", statute: "Tex. Bus. & Com. Code §521.053(b)", deadline: indiv, note: "≤60 days after determination." });
      if (ag) deadlines.push({ jurisdiction: "Texas — AG", statute: "Tex. Bus. & Com. Code §521.053(i) (SB 768, eff. 1 Sep 2023)", deadline: ag, note: "≤30 days after determination if ≥250 confirmed TX residents (see M-TX-SEG)." });
    }
    if (ny) {
      const dl = addDays(iso, 30);
      if (dl) deadlines.push({ jurisdiction: "New York — individuals", statute: "N.Y. Gen. Bus. Law §899-aa (S2659B, eff. 21 Dec 2024)", deadline: dl, note: "30 calendar days from discovery; only the law-enforcement delay allowance survives. Regulator notice under §899-aa(8)(a) is triggered whenever any NY resident is notified." });
    }
    if (co) {
      const dl = addDays(iso, 30);
      if (dl) deadlines.push({ jurisdiction: "Colorado — individuals", statute: "C.R.S. §6-1-716(2)(a)", deadline: dl, note: "30 days from DETERMINATION (not discovery)." });
    }
    if (or) {
      const dl = addDays(iso, 45);
      if (dl) deadlines.push({ jurisdiction: "Oregon — individuals", statute: "ORS 646A.604(3)(a)", deadline: dl, note: "≤45 days from discovery or receipt of notification." });
    }
  }
  return { tests, deadlines };
}

export function renderIrTestStatesBlock(body: IrBody): string {
  const { tests, deadlines } = computeIrTestStates(body);
  const lines: string[] = [];
  lines.push("INCIDENT TEST-STATES (BINDING — see R1b2 rules 2a/2b in the system prompt)");
  for (const t of tests) {
    lines.push(`- ${t.id} [${t.state}] ${t.label} — ${t.basis}`);
  }
  lines.push("");
  lines.push("DEADLINES (PROVISIONAL — anchor is the detection timestamp treated as concurrent with awareness; recalculate on any confirmed controller-awareness timestamp per the PROVISIONAL DEADLINES rule)");
  if (deadlines.length === 0) {
    lines.push("- (no arithmetic performed — either the discovery timestamp is missing or no jurisdiction with deterministic courier arithmetic is in scope; compute inline per the rulebook and mark PROVISIONAL)");
  } else {
    for (const d of deadlines) {
      lines.push(`- ${d.jurisdiction}: ${d.deadline} — ${d.statute}. ${d.note}`);
    }
  }
  return lines.join("\n");
}
