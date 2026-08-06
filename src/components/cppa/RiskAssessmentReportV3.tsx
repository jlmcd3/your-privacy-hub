// v3 Part A / Part B renderer for the CPPA Risk Assessment report.
// Section-by-section with inline guidance, validator pills, harm-vs-safeguard
// linkage, gating banner, and a § 7157 Annual Submission Worksheet pane.
//
// Design contract (locked):
// - Never reference "corpus" or any internal source store.
// - Never cite enforcement records.
// - § 8 decision is user-confirmed; AI presents a recommendation only.
// - High-residual-risk harms with no linked § 7 safeguard block sign-off.

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Flag } from 'lucide-react';

type Harm = {
  category: string;
  source?: string;
  likelihood?: string;
  magnitude?: string;
  residual_after_safeguards?: string;
  user_guidance?: string;
};
type Safeguard = { name: string; description?: string; linked_harms?: string[] };

type PartA = {
  cover?: any;
  sec_1_trigger?: any;
  sec_2_purpose?: any;
  sec_3_pi_inventory?: any;
  sec_4_operations?: any;
  sec_5_benefits?: any;
  sec_6_harms?: { statute?: string; harms?: Harm[] };
  sec_7_safeguards?: {
    statute?: string;
    technical?: Safeguard[];
    organizational?: Safeguard[];
    consumer_facing?: Safeguard[];
    contractual?: Safeguard[];
  };
  sec_8_decision?: any;
  sec_9_stakeholders?: any;
  sec_10_governance?: any;
  appendices?: any;
};

type Report = {
  part_a?: PartA;
  part_b?: any;
  gating?: { ready_for_signoff?: boolean; blockers?: string[] };
};

const tone = (s?: string) => {
  const x = (s || "").toLowerCase();
  if (x === "high") return "bg-brand-navy/10 text-brand-navy border-brand-navy/30";
  if (x === "medium") return "bg-brand-slate-teal/10 text-brand-slate-teal border-brand-slate-teal/30";
  if (x === "low") return "bg-brand-teal/10 text-brand-teal-text border-brand-teal/30";
  return "bg-muted text-foreground border-border";
};

const validatorPill = (v?: { status?: string; note?: string | null }) => {
  if (!v?.status) return null;
  const tones: Record<string, string> = {
    pass: "bg-brand-teal/10 text-brand-teal-text border-brand-teal/30",
    warn: "bg-brand-slate-teal/10 text-brand-slate-teal border-brand-slate-teal/30",
    fail: "bg-brand-navy/10 text-brand-navy border-brand-navy/30",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] rounded border ${tones[v.status] ?? "bg-muted"}`}>
      Validator: {v.status === "pass" ? "Passes specificity check" : v.status === "warn" ? "Needs more detail" : "Non-compliant language"}
      {v.note ? ` — ${v.note}` : ""}
    </span>
  );
};

const SectionShell = ({
  num, title, statute, children, fill,
}: { num: string; title: string; statute?: string; children: React.ReactNode; fill?: boolean }) => (
  <section className={`border rounded-lg p-5 ${fill ? "bg-brand-slate-teal/5 dark:bg-brand-slate-teal/40" : "bg-card"}`}>
    <header className="flex items-baseline gap-3 flex-wrap mb-3">
      <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-navy text-white">{num}</span>
      <h3 className="font-body text-display-card font-semibold">{title}</h3>
      {statute && <span className="text-[11px] text-muted-foreground font-mono">{statute}</span>}
    </header>
    <div className="space-y-3 text-sm">{children}</div>
  </section>
);

const FillIn = ({ value, label }: { value?: string; label: string }) => {
  const empty = !value || /\[FILL IN/i.test(value);
  if (empty) {
    return (
      <p className="italic text-brand-slate-teal dark:text-brand-light-teal">
        <Flag aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {label} — fill in before sign-off.
      </p>
    );
  }
  return <p className="whitespace-pre-wrap">{value}</p>;
};

const Guidance = ({ text }: { text?: string }) =>
  text ? <p className="text-xs text-muted-foreground border-l-2 border-brand-teal pl-3 italic">Guidance: {text}</p> : null;

export default function RiskAssessmentReportV3({ report }: { report: Report }) {
  const a = report?.part_a ?? {};
  const gating = report?.gating ?? { ready_for_signoff: false, blockers: [] };

  return (
    <div className="space-y-6 font-serif-text">
      {/* Top: sign-off gating banner */}
      <div
        className={`rounded-lg border-l-4 p-4 ${
          gating.ready_for_signoff
            ? "border-brand-teal bg-brand-teal/5 dark:bg-brand-teal/40"
            : "border-brand-slate-teal bg-brand-slate-teal/5 dark:bg-brand-slate-teal/40"
        }`}
      >
        <p className="font-semibold">
          {gating.ready_for_signoff
            ? " Ready for executive sign-off."
            : "⏳ Not yet ready for executive sign-off."}
        </p>
        {!gating.ready_for_signoff && (gating.blockers?.length ?? 0) > 0 && (
          <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
            {gating.blockers!.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          The certifying executive signs under penalty of perjury per Cal. Code Regs. tit. 11 § 7157(b)(5).
        </p>
      </div>

      {/* § 0 Cover */}
      <SectionShell num="§ 0" title="Cover & Identification">
        <p><strong>Business:</strong> <FillIn value={a.cover?.business_legal_name} label="Business legal name" /></p>
        <p><strong>Activity:</strong> {a.cover?.activity_name ?? "—"}</p>
        <p><strong>Scope:</strong> {a.cover?.scope_statement ?? "—"}</p>
        <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>Version: {a.cover?.version ?? "1.0"}</span>
          <span>Effective: {a.cover?.effective_date ?? "—"}</span>
          <span>Next review: {a.cover?.next_review_date ?? "—"}</span>
          <span>
            Certifying executive: {a.cover?.certifying_executive?.name || "[FILL IN]"} —{" "}
            {a.cover?.certifying_executive?.title || "[FILL IN]"}
          </span>
        </div>
      </SectionShell>

      {/* § 1 Trigger */}
      <SectionShell num="§ 1" title="Regulatory Trigger" statute={a.sec_1_trigger?.statute}>
        <p>{a.sec_1_trigger?.narrative ?? "—"}</p>
        {Array.isArray(a.sec_1_trigger?.triggers_selected) && a.sec_1_trigger.triggers_selected.length > 0 && (
          <ul className="list-disc pl-5">
            {a.sec_1_trigger.triggers_selected.map((t: string, i: number) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </SectionShell>

      {/* § 2 Purpose */}
      <SectionShell num="§ 2" title="Processing Purpose" statute={a.sec_2_purpose?.statute}>
        <FillIn value={a.sec_2_purpose?.purpose_statement} label="Specific processing purpose" />
        {validatorPill(a.sec_2_purpose?.validator)}
        <Guidance text={a.sec_2_purpose?.user_guidance} />
      </SectionShell>

      {/* § 3 PI Inventory */}
      <SectionShell num="§ 3" title="Personal Information Inventory" statute={a.sec_3_pi_inventory?.statute}>
        {Array.isArray(a.sec_3_pi_inventory?.pi_categories) && a.sec_3_pi_inventory.pi_categories.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left bg-muted/40">
                <tr><th className="p-2">PI category</th><th className="p-2">Sensitive PI?</th></tr>
              </thead>
              <tbody>
                {a.sec_3_pi_inventory.pi_categories.map((c: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{c.category}</td>
                    <td className="p-2">{c.is_spi ? "Yes — § 7001(ccc)" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p><strong>Minimum-necessary justification:</strong></p>
        <FillIn value={a.sec_3_pi_inventory?.minimum_necessary_justification} label="Minimum-necessary justification" />
        <Guidance text={a.sec_3_pi_inventory?.user_guidance} />
      </SectionShell>

      {/* § 4 Operations */}
      <SectionShell num="§ 4" title="Operational Description" statute={a.sec_4_operations?.statute}>
        <Accordion type="multiple">
          {[
            ["A — Collection sources & methods", a.sec_4_operations?.a_sources],
            ["B — Retention period & criteria", a.sec_4_operations?.b_retention],
            ["C — Consumer interaction with the activity", a.sec_4_operations?.c_consumer_interaction],
            ["D — Approximate number of consumers", a.sec_4_operations?.d_consumer_count],
            ["E — Disclosures to consumers (mapped to § 7003)", a.sec_4_operations?.e_disclosures],
            ["F — Service providers / contractors / third parties", a.sec_4_operations?.f_service_providers],
          ].map(([label, val], i) => (
            <AccordionItem key={i} value={`op-${i}`}>
              <AccordionTrigger>{label as string}</AccordionTrigger>
              <AccordionContent>
                <FillIn value={val as string} label={label as string} />
              </AccordionContent>
            </AccordionItem>
          ))}
          {a.sec_4_operations?.g_admt && (
            <AccordionItem value="op-g">
              <AccordionTrigger>G — ADMT logic & outputs</AccordionTrigger>
              <AccordionContent>
                {(() => {
                  const admtLabels: Record<string, string> = { logic: "Logic", training: "Training", fairness: "Fairness", humanReview: "Human review", human_review: "Human review" };
                  return (
                    <dl className="text-sm space-y-2">
                      {Object.entries(a.sec_4_operations.g_admt).map(([k, v]) => (
                        <div key={k}>
                          <dt className="font-semibold">{admtLabels[k] ?? k}:</dt>
                          <dd className="ml-2 whitespace-pre-wrap">{typeof v === "string" ? v : JSON.stringify(v, null, 2)}</dd>
                        </div>
                      ))}
                    </dl>
                  );
                })()}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </SectionShell>

      {/* § 5 Benefits */}
      <SectionShell num="§ 5" title="Benefits Analysis" statute={a.sec_5_benefits?.statute}>
        <p><strong>To the business:</strong></p><FillIn value={a.sec_5_benefits?.to_business} label="Benefit to the business" />
        <p><strong>To the consumer:</strong></p><FillIn value={a.sec_5_benefits?.to_consumer} label="Benefit to the consumer" />
        <p><strong>To the public:</strong></p><FillIn value={a.sec_5_benefits?.to_public} label="Benefit to the public" />
        {validatorPill(a.sec_5_benefits?.validator)}
        <Guidance text={a.sec_5_benefits?.user_guidance} />
      </SectionShell>

      {/* § 6 Harms */}
      <SectionShell num="§ 6" title="Negative Impacts" statute={a.sec_6_harms?.statute}>
        <p className="text-xs text-muted-foreground">All eight statutory harm categories per § 7152(a)(5)(A)–(H).</p>
        <div className="space-y-2">
          {(a.sec_6_harms?.harms ?? []).map((h, i) => (
            <details key={i} className="border rounded p-3 group">
              <summary className="cursor-pointer flex flex-wrap items-center gap-2">
                <strong>{h.category}</strong>
                <span className={`px-2 py-0.5 text-[11px] rounded border ${tone(h.likelihood)}`}>Likelihood: {h.likelihood ?? "—"}</span>
                <span className={`px-2 py-0.5 text-[11px] rounded border ${tone(h.magnitude)}`}>Magnitude: {h.magnitude ?? "—"}</span>
                <span className={`px-2 py-0.5 text-[11px] rounded border ${tone(h.residual_after_safeguards)}`}>Residual: {h.residual_after_safeguards ?? "—"}</span>
              </summary>
              <div className="mt-2 text-sm space-y-1">
                {h.source && <p><strong>Source / cause:</strong> {h.source}</p>}
                {h.user_guidance && <Guidance text={h.user_guidance} />}
              </div>
            </details>
          ))}
        </div>
      </SectionShell>

      {/* § 7 Safeguards */}
      <SectionShell num="§ 7" title="Safeguards" statute={a.sec_7_safeguards?.statute}>
        {(["technical", "organizational", "consumer_facing", "contractual"] as const).map((group) => {
          const arr = (a.sec_7_safeguards as any)?.[group] ?? [];
          const label = group.replace("_", "-");
          return (
            <div key={group}>
              <h4 className="font-semibold capitalize text-sm mt-2">{label}</h4>
              {arr.length === 0 ? (
                <p className="italic text-brand-slate-teal dark:text-brand-light-teal text-sm"><Flag aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> No {label} safeguards listed — fill in before sign-off.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm">
                  {arr.map((s: Safeguard, i: number) => (
                    <li key={i}>
                      <strong>{s.name}</strong>
                      {s.description ? ` — ${s.description}` : ""}
                      {s.linked_harms?.length ? (
                        <span className="ml-2 text-xs text-muted-foreground">Linked harms: {s.linked_harms.join(", ")}</span>
                      ) : (
                        <span className="ml-2 text-xs text-brand-slate-teal"><Flag aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> No linked harm — add a § 6 link.</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </SectionShell>

      {/* § 8 Decision */}
      <SectionShell num="§ 8" title="Risk-Benefit Balancing & Decision" statute={a.sec_8_decision?.statute} fill>
        <p>{a.sec_8_decision?.analysis ?? "—"}</p>
        <div className="rounded border bg-muted/40 p-3 text-sm">
          <p>
            Record your decision in the section below. The analysis above is provided for your consideration only — this tool does not produce a recommendation on whether processing should proceed.
          </p>
        </div>
        <div className="rounded border-2 border-dashed border-brand-slate-teal/40 p-3 bg-brand-slate-teal/5 dark:bg-brand-slate-teal/40">
          <p className="font-semibold text-brand-slate-teal dark:text-brand-light-teal">
            <Flag aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Executive decision required (§ 7152(a)(7))
          </p>
          <p className="text-sm">
            The certifying executive must record one of: <strong>Proceed</strong>, <strong>Proceed with conditions</strong> (list the conditions), or <strong>Do not proceed</strong>. This tool does not select the decision.
          </p>
          <p className="text-xs mt-1 italic text-muted-foreground">
            Current value: <code>{a.sec_8_decision?.user_decision ?? "null"}</code>
          </p>
        </div>
        <Guidance text={a.sec_8_decision?.user_guidance} />
      </SectionShell>

      {/* § 9 Stakeholders */}
      <SectionShell num="§ 9" title="Stakeholder Involvement" statute={a.sec_9_stakeholders?.statute}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm">Internal contributors</h4>
            <ul className="list-disc pl-5 text-sm">
              {(a.sec_9_stakeholders?.internal_contributors ?? []).map((c: any, i: number) => (
                <li key={i}>{c.role} — {c.name || "[FILL IN]"}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm">External consultees</h4>
            <ul className="list-disc pl-5 text-sm">
              {(a.sec_9_stakeholders?.external_consultees ?? []).map((c: any, i: number) => (
                <li key={i}>{c.role} — {c.name || "[FILL IN]"}</li>
              ))}
            </ul>
          </div>
        </div>
      </SectionShell>

      {/* § 10 Governance */}
      <SectionShell num="§ 10" title="Review, Approval & Governance" statute={a.sec_10_governance?.statute}>
        <ul className="text-sm space-y-1">
          <li><strong>Triennial review date:</strong> {a.sec_10_governance?.triennial_review_date ?? "—"}</li>
          <li>{a.sec_10_governance?.material_change_commitment}</li>
          <li>{a.sec_10_governance?.retention_commitment}</li>
          <li>{a.sec_10_governance?.production_commitment}</li>
        </ul>
        <div className="rounded border bg-muted/30 p-3 mt-2 text-sm">
          <p><strong>Approver:</strong> {a.sec_10_governance?.approver?.name || "[FILL IN]"} — {a.sec_10_governance?.approver?.title || "[FILL IN]"}</p>
          <p><strong>Date signed:</strong> {a.sec_10_governance?.approver?.date || "[FILL IN]"}</p>
        </div>
      </SectionShell>

      {/* Appendices */}
      {a.appendices && (
        <SectionShell num="Appx" title="Appendices">
          <Accordion type="multiple">
            {a.appendices.a_data_flow && (
              <AccordionItem value="a"><AccordionTrigger>A — Data flow</AccordionTrigger>
                <AccordionContent><pre className="text-xs whitespace-pre-wrap">{a.appendices.a_data_flow}</pre></AccordionContent>
              </AccordionItem>
            )}
            {Array.isArray(a.appendices.b_vendor_register) && a.appendices.b_vendor_register.length > 0 && (
              <AccordionItem value="b"><AccordionTrigger>B — Vendor / service-provider register</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 text-sm">
                    {a.appendices.b_vendor_register.map((v: any, i: number) => (
                      <li key={i}>{v.vendor} — {v.role}{Array.isArray(v.pi_categories) ? ` (${v.pi_categories.join(", ")})` : ""}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
            {a.appendices.c_admt_note && (
              <AccordionItem value="c"><AccordionTrigger>C — ADMT note</AccordionTrigger>
                <AccordionContent><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(a.appendices.c_admt_note, null, 2)}</pre></AccordionContent>
              </AccordionItem>
            )}
            {a.appendices.d_spi_note && (
              <AccordionItem value="d"><AccordionTrigger>D — Sensitive PI handling note (§ 7001(ccc))</AccordionTrigger>
                <AccordionContent><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(a.appendices.d_spi_note, null, 2)}</pre></AccordionContent>
              </AccordionItem>
            )}
            {a.appendices.e_dpia_gap_fill && (
              <AccordionItem value="e"><AccordionTrigger>E — Cross-jurisdiction gap-fill (§ 7156(b))</AccordionTrigger>
                <AccordionContent><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(a.appendices.e_dpia_gap_fill, null, 2)}</pre></AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </SectionShell>
      )}

      {/* Part B Worksheet */}
      {report?.part_b && (
        <section className="border-2 rounded-lg p-5 bg-brand-cloud/30">
          <header className="flex items-baseline gap-3 mb-3 flex-wrap">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-teal-deep text-white">Part B</span>
            <h3 className="font-body text-display-card font-semibold">§ 7157 Annual Submission Worksheet</h3>
            <span className="text-[11px] font-mono text-muted-foreground">{report.part_b.statute}</span>
          </header>
          <ul className="text-sm space-y-1">
            <li><strong>Business legal name:</strong> {report.part_b.business_legal_name || "[FILL IN]"}</li>
            {(() => {
              const poc = report.part_b.point_of_contact;
              if (poc && typeof poc === "object") {
                return (
                  <>
                    <li><strong>Point of contact:</strong> {poc.name || "[FILL IN]"}, {poc.title || "[FILL IN]"}</li>
                    <li><strong>Phone:</strong> {poc.phone || "[FILL IN]"}</li>
                    <li><strong>Email:</strong> {poc.email || "[FILL IN]"}</li>
                  </>
                );
              }
              return <li><strong>Point of contact:</strong> {poc || "[FILL IN]"}</li>;
            })()}
            <li><strong>Assessments conducted in period:</strong> {report.part_b.assessment_count_in_period ?? 1}</li>
            <li><strong>PI categories (aggregated):</strong> {(report.part_b.pi_categories_aggregated ?? []).join(", ")}</li>
            <li><strong>Sensitive PI flagged:</strong> {(report.part_b.spi_flagged ?? []).join(", ") || "None"}</li>
          </ul>
          <div className="mt-3 p-3 border rounded bg-card text-sm">
            <p className="font-semibold">Penalty-of-perjury attestation (§ 7157(b)(5))</p>
            <p className="whitespace-pre-wrap mt-1">{report.part_b.perjury_attestation_block}</p>
          </div>
          <p className="mt-3 text-xs italic text-brand-slate-teal dark:text-brand-light-teal">
            {report.part_b.submission_banner}
          </p>
        </section>
      )}
    </div>
  );
}
