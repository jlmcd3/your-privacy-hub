// Sprint 2 #1 — Auditor Independence Advisor (CPPA Cybersecurity Audit, § 7122(b))
// Pure client-side interactive checklist. No backend changes. Customer can answer
// six § 7122(b) questions about a candidate auditor (internal or external) and
// generate a short memo to attach to the engagement letter / board record.
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Answer = "yes" | "no" | "unsure" | "";

type Criterion = {
  id: string;
  label: string;
  citation: string;
  // "yes" = independence problem; "no" = no problem. Reverse for criteria where
  // a "yes" answer is what we want (we phrase those as risk-positive instead).
  helpText: string;
};

const CRITERIA: Criterion[] = [
  {
    id: "scope_of_work",
    label:
      "Has the candidate auditor — or its firm — designed, implemented, operated, or made management decisions about any of the cybersecurity controls that would be in scope of this audit, within the last three years?",
    citation: "11 CCR § 7122(b)(2)–(3)",
    helpText:
      "Auditing your own work is the canonical conflict. FSOR is explicit that a firm cannot both design and assess the same control set.",
  },
  {
    id: "reporting_line",
    label:
      "For an internal auditor: does the auditor have a functional reporting line to the person, team, or executive responsible for the cybersecurity programme being audited (e.g., CISO, head of IT, head of engineering)?",
    citation: "11 CCR § 7122(b)(4)",
    helpText:
      "Internal auditor must report directly to the board (or board-equivalent governing body), not to the function being audited.",
  },
  {
    id: "contingent_fee",
    label:
      "Is any portion of the auditor's compensation contingent on the audit's findings, outcome, or whether the business is certified compliant?",
    citation: "11 CCR § 7122(b)(5)",
    helpText:
      "Contingent fees create a direct financial interest in a favourable outcome and are categorically disallowed.",
  },
  {
    id: "non_audit_services",
    label:
      "Is the auditor (or the auditor's firm) currently providing — or will it provide during the audit period — non-audit services that touch the cybersecurity programme (e.g., MSSP, SOC operations, vCISO, IR retainer, control remediation)?",
    citation: "11 CCR § 7122(b)(2)",
    helpText:
      "Concurrent non-audit services create the appearance and substance of self-review. FSOR rejected industry comments asking for a carve-out.",
  },
  {
    id: "financial_interest",
    label:
      "Does the auditor — or any individual on the audit team — hold a financial interest in the business, its parent, or any affiliate (equity, debt, profit-share, board seat, employment offer under negotiation)?",
    citation: "11 CCR § 7122(b)(1)",
    helpText:
      "Direct or indirect financial interest disqualifies an auditor regardless of materiality.",
  },
  {
    id: "objective_authority",
    label:
      "Does the auditor have written authority — in the engagement letter or internal charter — to access all systems, personnel, and records in scope without filtering by management?",
    citation: "11 CCR § 7122(b)(6)",
    helpText:
      "Independence requires more than the absence of conflicts — the auditor must have the affirmative authority to do the work. A 'yes' here is what you want.",
  },
];

// For each criterion, the answer that signals a problem:
const PROBLEM_ANSWER: Record<string, Answer> = {
  scope_of_work: "yes",
  reporting_line: "yes",
  contingent_fee: "yes",
  non_audit_services: "yes",
  financial_interest: "yes",
  objective_authority: "no",
};

type Verdict = "independent" | "conditional" | "not_independent" | "incomplete";

const verdictMeta: Record<Verdict, { label: string; tone: string; explanation: string }> = {
  independent: {
    label: "Independent — no § 7122(b) conflicts identified",
    tone: "bg-green-100 text-green-900 border-green-300",
    explanation:
      "On the answers provided, the candidate auditor satisfies the § 7122(b) independence criteria. Document this assessment, attach the answers to the engagement letter, and re-run the check if scope or staffing changes.",
  },
  conditional: {
    label: "Conditional — at least one item is unresolved",
    tone: "bg-amber-100 text-amber-900 border-amber-300",
    explanation:
      "One or more answers are 'Unsure'. Independence cannot be confirmed on this record. Obtain written confirmation from the candidate auditor on the unresolved items before signing the engagement letter.",
  },
  not_independent: {
    label: "Not independent — § 7122(b) violation flagged",
    tone: "bg-red-100 text-red-900 border-red-300",
    explanation:
      "At least one answer indicates a substantive conflict with § 7122(b). The candidate auditor is not eligible to perform this audit. Either remediate the conflict (e.g., remove the team member, terminate the non-audit engagement, restructure the reporting line) or select a different auditor.",
  },
  incomplete: {
    label: "Incomplete",
    tone: "bg-muted text-foreground border-border",
    explanation: "Answer all six items to receive an independence determination.",
  },
};

export default function AuditorIndependenceAdvisor() {
  const [auditorName, setAuditorName] = useState("");
  const [auditorType, setAuditorType] = useState<"internal" | "external" | "">("");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [showMemo, setShowMemo] = useState(false);

  const verdict: Verdict = useMemo(() => {
    const allAnswered = CRITERIA.every((c) => answers[c.id]);
    if (!allAnswered) return "incomplete";
    const problems = CRITERIA.filter((c) => answers[c.id] === PROBLEM_ANSWER[c.id]);
    if (problems.length > 0) return "not_independent";
    const unsure = CRITERIA.filter((c) => answers[c.id] === "unsure");
    if (unsure.length > 0) return "conditional";
    return "independent";
  }, [answers]);

  const meta = verdictMeta[verdict];
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const flaggedItems = CRITERIA.filter((c) => answers[c.id] === PROBLEM_ANSWER[c.id]);
  const unsureItems = CRITERIA.filter((c) => answers[c.id] === "unsure");

  return (
    <section className="bg-card border rounded-lg p-6">
      <h2 className="mb-1">Auditor Independence Advisor</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Six-question check against the auditor independence requirements at 11 CCR § 7122(b). Answer for the
        candidate auditor (internal team or external firm) you are considering for the audit. Output is a short
        memo you can attach to the engagement letter or board record. This is a compliance-readiness aid, not
        legal advice — review with counsel before signing.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label className="text-xs">Candidate auditor name</Label>
          <Input
            value={auditorName}
            onChange={(e) => setAuditorName(e.target.value)}
            placeholder="e.g. Acme Assurance LLP"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Auditor type</Label>
          <select
            value={auditorType}
            onChange={(e) => setAuditorType(e.target.value as "internal" | "external" | "")}
            className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">Select…</option>
            <option value="external">External firm</option>
            <option value="internal">Internal auditor</option>
          </select>
        </div>
      </div>

      <ol className="space-y-4">
        {CRITERIA.map((c, i) => {
          const a = answers[c.id] || "";
          const isProblem = a === PROBLEM_ANSWER[c.id];
          const isUnsure = a === "unsure";
          return (
            <li key={c.id} className="border-t pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground font-mono">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-sm font-medium">{c.label}</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 ml-6">
                <span className="font-mono">{c.citation}</span> — {c.helpText}
              </p>
              <div className="mt-2 ml-6 flex flex-wrap gap-2">
                {(["yes", "no", "unsure"] as Answer[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswers((s) => ({ ...s, [c.id]: opt }))}
                    className={`px-3 py-1 text-xs rounded border ${
                      a === opt
                        ? isProblem
                          ? "bg-red-100 border-red-400 text-red-900"
                          : isUnsure
                          ? "bg-amber-100 border-amber-400 text-amber-900"
                          : "bg-green-100 border-green-400 text-green-900"
                        : "bg-background border-input text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {opt === "yes" ? "Yes" : opt === "no" ? "No" : "Unsure"}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      <div className={`mt-6 p-4 rounded border ${meta.tone}`}>
        <p className="text-sm font-semibold">{meta.label}</p>
        <p className="text-xs mt-1">{meta.explanation}</p>
      </div>

      {verdict !== "incomplete" && (
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMemo((s) => !s)}>
            {showMemo ? "Hide memo" : "Generate engagement-letter memo"}
          </Button>
        </div>
      )}

      {showMemo && verdict !== "incomplete" && (
        <div className="mt-4 bg-muted/30 border rounded p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap">
{`AUDITOR INDEPENDENCE DETERMINATION
CPPA Cybersecurity Audit — 11 CCR § 7122(b)

Date:               ${today}
Candidate auditor:  ${auditorName || "[name]"}
Auditor type:       ${auditorType ? (auditorType === "external" ? "External firm" : "Internal auditor") : "[not specified]"}
Determination:      ${meta.label}

Findings:
${CRITERIA.map((c, i) => {
  const a = answers[c.id];
  const status =
    a === PROBLEM_ANSWER[c.id]
      ? "CONFLICT"
      : a === "unsure"
      ? "UNRESOLVED"
      : "OK";
  return `  ${String(i + 1).padStart(2, "0")}. [${status}] ${c.citation} — Answer: ${a ? a.toUpperCase() : "—"}`;
}).join("\n")}

${
  flaggedItems.length > 0
    ? `Items requiring resolution before engagement:\n${flaggedItems
        .map((c, i) => `  - ${c.citation}: ${c.label}`)
        .join("\n")}\n`
    : ""
}${
  unsureItems.length > 0
    ? `Items awaiting written confirmation from candidate auditor:\n${unsureItems
        .map((c) => `  - ${c.citation}: ${c.label}`)
        .join("\n")}\n`
    : ""
}
Basis: This determination relies on the answers recorded above. Independence
must be re-verified if (a) the audit scope changes, (b) any individual on the
audit team changes, (c) the auditor or its affiliates commence any non-audit
engagement with the business, or (d) any compensation term changes.

Reviewed by: ______________________________________   Date: ______________
Title:       ______________________________________
`}
        </div>
      )}
    </section>
  );
}
