// UPGRADE-2 — § 7152(a) STRUCTURED DELIVERABLES (screen renderer).
//
// Presentational twin of the deterministic deliverables built in
// supabase/functions/_shared/ltp/analytic-deliverables/build.ts. Renders the
// six deliverables in the enumerated order of 11 CCR § 7152(a):
//
//   (a)(2) necessity_analysis[]   — minimum-necessary, argued per element
//   (a)(4) benefits[]             — one record per beneficiary class
//   (a)(5) harm_causation[]       — data + actor + pathway → catalogued harm
//   (a)(6) safeguard_map[]        — safeguard → harms addressed → residual
//   (a)   weighing[]              — case for / case against / determination
//   (a)(7) consequence            — computed, with modifications tied to risk
//
// Nothing here invents content: every field is rendered as emitted, and a
// record the engine could not support renders its `information_needed`
// string rather than a blank.

const LABELS: Record<string, string> = {
  business: "The business",
  consumer: "Consumers",
  other_stakeholders: "Other stakeholders",
  public: "The public",
};

const VERDICTS: Record<string, string> = {
  supported_as_necessary: "Necessary on the record",
  minimisation_candidate: "Not shown necessary — minimisation candidate",
  undetermined_on_the_record: "Record insufficient",
};

const DECISIONS: Record<string, string> = {
  initiate: "Initiate the processing",
  initiate_with_modifications: "Initiate with modifications",
  restrict: "Restrict the processing",
  prohibit: "Do not initiate the processing",
  reserved_insufficient_record: "Reserved — the record is insufficient to decide",
};

const OUTWEIGH: Record<string, string> = {
  benefits_outweigh: "Benefits outweigh the negative impacts",
  impacts_outweigh: "Negative impacts outweigh the benefits",
  close_balance: "Close balance",
  undetermined_on_the_record: "Undetermined on the record",
};

function label(map: Record<string, string>, v: unknown) {
  const k = String(v ?? "");
  return map[k] ?? k.replace(/_/g, " ");
}

function Head({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h4 className="font-serif text-base mt-5 mb-2">
      <span className="text-muted-foreground text-xs mr-2">{n}</span>
      {children}
    </h4>
  );
}

function Insufficient({ note }: { note?: string }) {
  if (!note) return null;
  return <p className="text-xs text-muted-foreground italic mt-1">{note}</p>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border-l-2 border-border pl-3 py-1 mb-3 text-sm">{children}</div>;
}

function Field({ k, v }: { k: string; v: unknown }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <p className="mb-0.5">
      <span className="font-bold">{k}:</span> {String(v)}
    </p>
  );
}

export interface ActivityAnalyticsLike {
  activity_id?: string;
  activity_name?: string;
  activity_purpose?: string;
  is_primary?: boolean;
  necessity_analysis?: any[];
  benefits?: any[];
  harm_causation?: any[];
  safeguard_map?: any[];
  weighing?: any[];
  consequence?: any;
}

export function RiskAnalyticDeliverables({
  analytics,
}: {
  analytics: ActivityAnalyticsLike[] | undefined;
}) {
  const rows = Array.isArray(analytics) ? analytics : [];
  if (rows.length === 0) return null;

  return (
    <section data-section="activity_analytics" className="mt-6">
      <h3 className="font-serif text-lg border-b pb-1 mb-2">
        The § 7152(a) analysis, activity by activity
      </h3>
      {rows.map((a, i) => (
        <div key={a?.activity_id ?? i} className="mb-8" data-activity={a?.activity_id ?? i}>
          <h4 className="font-serif text-base mt-4">
            {a?.activity_name || `Activity ${i + 1}`}
            {a?.is_primary ? (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                primary activity
              </span>
            ) : null}
          </h4>
          {a?.activity_purpose && (
            <p className="text-sm mb-2">
              <span className="font-bold">Purpose:</span> {a.activity_purpose}
            </p>
          )}

          {/* (a)(2) */}
          {Array.isArray(a?.necessity_analysis) && a.necessity_analysis.length > 0 && (
            <>
              <Head n="§ 7152(a)(2)">Is each element of personal information necessary?</Head>
              {a.necessity_analysis.map((n: any, j: number) => (
                <Card key={j}>
                  <Field k="Element" v={n?.element} />
                  <Field k="Purpose served" v={n?.purpose_served} />
                  <Field k="Verdict" v={label(VERDICTS, n?.verdict)} />
                  <Field k="Why" v={n?.justification} />
                  <Insufficient note={n?.information_needed} />
                </Card>
              ))}
            </>
          )}

          {/* (a)(4) */}
          {Array.isArray(a?.benefits) && a.benefits.length > 0 && (
            <>
              <Head n="§ 7152(a)(4)">Benefits, by beneficiary</Head>
              {a.benefits.map((b: any, j: number) => (
                <Card key={j}>
                  <Field k="Beneficiary" v={label(LABELS, b?.beneficiary_class)} />
                  <Field k="Benefit" v={b?.benefit} />
                  <Field k="Supporting record fact" v={b?.supporting_record_fact} />
                  <Insufficient note={b?.information_needed} />
                </Card>
              ))}
            </>
          )}

          {/* (a)(5) */}
          {Array.isArray(a?.harm_causation) && a.harm_causation.length > 0 && (
            <>
              <Head n="§ 7152(a)(5)">Negative impacts: source, cause and pathway</Head>
              {a.harm_causation.map((h: any, j: number) => (
                <Card key={j}>
                  <Field k="Harm" v={`${h?.harm_label ?? ""} (${h?.harm_pinpoint ?? ""})`} />
                  {h?.harm_verbatim && (
                    <blockquote className="border-l-2 pl-3 my-1 text-xs text-muted-foreground">
                      {h.harm_verbatim}
                    </blockquote>
                  )}
                  <Field k="Data involved" v={h?.data_involved} />
                  <Field k="Actor" v={h?.actor} />
                  <Field k="Pathway" v={h?.pathway} />
                  <Field k="Source" v={h?.source} />
                  <Field k="Cause" v={h?.cause} />
                  <Insufficient note={h?.information_needed} />
                </Card>
              ))}
            </>
          )}

          {/* (a)(6) */}
          {Array.isArray(a?.safeguard_map) && a.safeguard_map.length > 0 && (
            <>
              <Head n="§ 7152(a)(6)">Safeguards and the risk that remains</Head>
              {a.safeguard_map.map((s: any, j: number) => (
                <Card key={j}>
                  <Field k="Safeguard" v={s?.safeguard} />
                  <Field
                    k="Impacts addressed"
                    v={Array.isArray(s?.harm_ids) ? s.harm_ids.join(", ") : s?.harm_id}
                  />
                  <Field k="Residual risk" v={s?.residual_statement} />
                  <Insufficient note={s?.information_needed} />
                </Card>
              ))}
            </>
          )}

          {/* (a) chapeau + § 7154(a) */}
          {Array.isArray(a?.weighing) && a.weighing.length > 0 && (
            <>
              <Head n="§ 7152(a) · § 7154(a)">The weighing</Head>
              {a.weighing.map((w: any, j: number) => (
                <Card key={j}>
                  <Field k="Beneficiary" v={label(LABELS, w?.beneficiary_class)} />
                  <Field k="The case for" v={w?.case_for} />
                  <Field k="The case against" v={w?.case_against} />
                  <Field k="Determination" v={label(OUTWEIGH, w?.outweigh_determination)} />
                  <Field k="Reasoning" v={w?.reasoning} />
                  <Insufficient note={w?.information_needed} />
                </Card>
              ))}
            </>
          )}

          {/* (a)(7) */}
          {a?.consequence && (
            <>
              <Head n="§ 7152(a)(7)">Consequence</Head>
              <Card>
                <Field k="Decision" v={label(DECISIONS, a.consequence?.decision)} />
                {Array.isArray(a.consequence?.reasons) && a.consequence.reasons.length > 0 && (
                  <ul className="list-disc ml-5 my-1">
                    {a.consequence.reasons.map((r: string, j: number) => (
                      <li key={j}>{r}</li>
                    ))}
                  </ul>
                )}
                {Array.isArray(a.consequence?.modifications) &&
                  a.consequence.modifications.length > 0 && (
                    <>
                      <p className="font-bold mt-1">Modifications</p>
                      <ul className="list-disc ml-5">
                        {a.consequence.modifications.map((m: any, j: number) => (
                          <li key={j}>
                            {m?.modification} — <span className="italic">addresses:</span>{" "}
                            {m?.addresses_risk}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                <Insufficient note={a.consequence?.information_needed} />
              </Card>
            </>
          )}
        </div>
      ))}
    </section>
  );
}

export interface AttestationLike {
  information_providers?: string[];
  legal_counsel_excluded?: boolean;
  review_date?: string;
  approval_date?: string;
  approvers?: { name?: string; position?: string }[];
  approval_authority_requirement?: string;
  citation?: string;
  information_needed?: string;
  text?: string;
}

export function RiskAttestationBlock({ block }: { block: AttestationLike | undefined }) {
  if (!block || typeof block !== "object") return null;
  const providers = Array.isArray(block.information_providers) ? block.information_providers : [];
  const approvers = Array.isArray(block.approvers) ? block.approvers : [];
  const hasAny =
    providers.length > 0 ||
    approvers.length > 0 ||
    block.review_date ||
    block.approval_date ||
    block.approval_authority_requirement ||
    block.text;
  if (!hasAny) return null;

  return (
    <section data-section="attestation_block" className="mt-6">
      <h3 className="font-serif text-lg border-b pb-1 mb-2">
        Who provided the information, and who reviewed and approved this assessment
      </h3>
      <div className="text-sm">
        <p className="mb-1">
          <span className="font-bold">Information providers (§ 7152(a)(8)):</span>{" "}
          {providers.length > 0 ? providers.join("; ") : "Not stated on the record"}
        </p>
        {block.legal_counsel_excluded && (
          <p className="text-xs text-muted-foreground mb-1">
            Legal counsel is excluded from this list, as § 7152(a)(8) requires.
          </p>
        )}
        <Field k="Date reviewed" v={block.review_date || "Not stated on the record"} />
        <Field k="Date approved" v={block.approval_date || "Not stated on the record"} />
        <p className="mb-1">
          <span className="font-bold">Approvers (§ 7152(a)(9)):</span>{" "}
          {approvers.length > 0
            ? approvers.map((a) => `${a?.name ?? ""} — ${a?.position ?? ""}`).join("; ")
            : "Not stated on the record"}
        </p>
        {block.approval_authority_requirement && (
          <p className="mt-2">{block.approval_authority_requirement}</p>
        )}
        {block.text && <p className="mt-2">{block.text}</p>}
        <Insufficient note={block.information_needed} />
      </div>
    </section>
  );
}

export default RiskAnalyticDeliverables;
