// GOVERNANCE UPGRADE (product 5) — the generalised ICO-tracker findings walk
// and its remediation component.
//
// Presentation only. Every value is read from the report as generated; nothing
// is derived, re-scored, or defaulted in the client. Findings that the record
// could not support render as "Record insufficient" with the named question
// the customer still has to answer.
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Remediation = {
  finding_key: string;
  domain: string;
  accountable_owner: string;
  target_date: string;
  priority: string;
  validation_method: string;
  validation_method_source: "recorded" | "default";
  status: "analysed" | "record_insufficient";
  information_needed?: string;
};

type DomainFinding = {
  key: string;
  label: string;
  citation: string;
  standard: string;
  record_fact: string;
  application: string;
  verdict: string;
  status: "analysed" | "record_insufficient";
  information_needed?: string;
  domain: string;
  domain_label: string;
  regulator_expectation: string;
  control_question: string;
  customer_answer: string;
  evidence_reviewed: string;
  remediation?: Remediation;
};

const VERDICT_LABEL: Record<string, string> = {
  satisfied: "Satisfied",
  not_satisfied: "Not satisfied",
  partially_satisfied: "Partially satisfied",
  not_applicable: "Not applicable",
  record_insufficient: "Record insufficient",
};

const verdictClass = (v: string) => {
  switch (v) {
    case "satisfied":
      return "bg-emerald-100 text-emerald-900";
    case "not_satisfied":
      return "bg-red-100 text-red-800";
    case "partially_satisfied":
      return "bg-amber-100 text-amber-900";
    case "not_applicable":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

function RemediationBlock({ r }: { r: Remediation }) {
  return (
    <div className="mt-4 rounded-md border border-border bg-muted/40 p-4">
      <h4 className="font-body text-sm font-semibold mb-2">Remediation</h4>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Accountable owner</dt>
          <dd>{r.accountable_owner || <span className="text-muted-foreground">Not recorded</span>}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Target date</dt>
          <dd>{r.target_date || <span className="text-muted-foreground">Not recorded</span>}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Priority</dt>
          <dd>{r.priority === "unspecified" ? <span className="text-muted-foreground">Not recorded</span> : r.priority}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Validation method</dt>
          <dd>
            {r.validation_method}
            {r.validation_method_source === "default" && (
              <span className="ml-2 text-xs text-muted-foreground">(standard method applied — none recorded)</span>
            )}
          </dd>
        </div>
      </dl>
      {r.information_needed && (
        <p className="mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
          {r.information_needed}
        </p>
      )}
    </div>
  );
}

export default function GovernanceTrackerFindings({
  findings,
  remediationPlan,
}: {
  findings?: unknown;
  remediationPlan?: unknown;
}) {
  const rows: DomainFinding[] = Array.isArray(findings) ? (findings as DomainFinding[]) : [];
  if (rows.length === 0) return null;

  const plan: Remediation[] = Array.isArray(remediationPlan) ? (remediationPlan as Remediation[]) : [];

  const byDomain = rows.reduce<Record<string, DomainFinding[]>>((acc, f) => {
    (acc[f.domain] ||= []).push(f);
    return acc;
  }, {});

  return (
    <section className="bg-card border rounded-lg p-6">
      <h2 className="font-body text-display-card font-semibold mb-1">Control-by-control findings</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Each control is tested the same way: the standard as written, what your record says, how the standard applies
        to it, and the conclusion. Where the record cannot support a conclusion, the finding says so and names what is
        still needed.
      </p>

      <Accordion type="multiple">
        {Object.entries(byDomain).map(([domain, group]) => (
          <AccordionItem key={domain} value={domain} id={`tracker-${domain}`}>
            <AccordionTrigger>
              <div className="flex items-center gap-3 text-left">
                <span>{group[0].domain_label}</span>
                <span className="text-xs text-muted-foreground">{group.length} controls</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm italic text-muted-foreground mb-4">{group[0].regulator_expectation}</p>
              <div className="space-y-6">
                {group.map((f) => (
                  <article key={f.key} className="border-l-2 border-border pl-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-body text-sm font-semibold">{f.label}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded ${verdictClass(f.verdict)}`}>
                        {VERDICT_LABEL[f.verdict] ?? f.verdict}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{f.citation}</span>
                    </div>
                    <p className="text-sm mb-2"><strong>Control question:</strong> {f.control_question}</p>
                    <blockquote className="text-sm border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground">
                      {f.standard}
                    </blockquote>
                    <p className="text-sm mb-1"><strong>Your answer:</strong> {f.customer_answer}</p>
                    <p className="text-sm mb-1"><strong>What the record shows:</strong> {f.record_fact}</p>
                    <p className="text-sm mb-1"><strong>Application:</strong> {f.application}</p>
                    <p className="text-xs text-muted-foreground">{f.evidence_reviewed}</p>
                    {f.information_needed && (
                      <p className="mt-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
                        <strong>Still needed:</strong> {f.information_needed}
                      </p>
                    )}
                    {f.remediation && <RemediationBlock r={f.remediation} />}
                  </article>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {plan.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <h3 className="font-body text-sm font-semibold mb-2">Remediation plan</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3 font-medium">Finding</th>
                <th className="py-2 pr-3 font-medium">Owner</th>
                <th className="py-2 pr-3 font-medium">Target date</th>
                <th className="py-2 pr-3 font-medium">Priority</th>
                <th className="py-2 font-medium">Validation</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((r) => (
                <tr key={r.finding_key} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-3">{r.finding_key}</td>
                  <td className="py-2 pr-3">{r.accountable_owner || <span className="text-muted-foreground">Not recorded</span>}</td>
                  <td className="py-2 pr-3">{r.target_date || <span className="text-muted-foreground">Not recorded</span>}</td>
                  <td className="py-2 pr-3">{r.priority === "unspecified" ? <span className="text-muted-foreground">Not recorded</span> : r.priority}</td>
                  <td className="py-2">{r.validation_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
