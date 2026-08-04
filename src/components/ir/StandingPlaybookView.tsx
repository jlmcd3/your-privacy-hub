// ITEM 369-IR (Master Spec §4.2) — ARTIFACT A renderer: the STANDING PLAYBOOK.
//
// Presentation only. Every value shown here is produced by
// _shared/ltp/ir-playbook-deliverables/standing-playbook.ts; this component
// invents nothing, re-words nothing, and re-orders nothing — the builder's
// `section_order` is the contract and sections render in the order supplied.
//
// Checklists and rosters render as TABLES, never as prose. Findings render in
// the SHAPE-LAW order: standard → record fact → application → verdict. A
// section that degraded renders its named information_needed instead of
// silently disappearing.

export interface PlaybookSectionData {
  kind: "table" | "note" | "finding" | "pointer";
  id: string;
  heading: string;
  status?: string;
  information_needed?: string;
  columns?: string[];
  rows?: string[][];
  note?: string;
  scope_note?: string;
  body?: string[];
  standard?: string;
  standard_citation?: string;
  record_fact?: string;
  application?: string;
  verdict?: string;
  report_keys?: string[];
}

export interface StandingPlaybookData {
  version?: string;
  artifact?: string;
  title?: string;
  template_note?: string;
  section_order?: string[];
  sections?: PlaybookSectionData[];
  information_needed?: string[];
  status?: string;
}

function Insufficient({ text }: { text: string }) {
  return (
    <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
      Not recorded. {text}
    </p>
  );
}

function SectionBody({ section }: { section: PlaybookSectionData }) {
  if (section.information_needed) {
    return <Insufficient text={section.information_needed} />;
  }

  if (section.kind === "table") {
    const cols = section.columns ?? [];
    const rows = section.rows ?? [];
    if (rows.length === 0) return <Insufficient text="No rows were recorded for this table." />;
    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="text-left font-semibold border-b border-border py-2 pr-4 align-bottom"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="align-top">
                  {r.map((cell, j) => (
                    <td key={j} className="border-b border-border/50 py-2 pr-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {section.note && <p className="mt-2 text-meta text-muted-foreground">{section.note}</p>}
      </>
    );
  }

  if (section.kind === "note") {
    return (
      <>
        {section.scope_note && (
          <p className="mb-2 text-meta text-muted-foreground italic">{section.scope_note}</p>
        )}
        {(section.body ?? []).map((p, i) => (
          <p key={i} className="text-sm leading-relaxed mb-2">
            {p}
          </p>
        ))}
      </>
    );
  }

  if (section.kind === "finding") {
    return (
      <dl className="text-sm space-y-2">
        <div>
          <dt className="font-semibold">Standard</dt>
          <dd>
            {section.standard}
            {section.standard_citation && (
              <span className="text-muted-foreground"> — {section.standard_citation}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Record fact</dt>
          <dd>{section.record_fact}</dd>
        </div>
        <div>
          <dt className="font-semibold">Application</dt>
          <dd>{section.application}</dd>
        </div>
        <div>
          <dt className="font-semibold">Verdict</dt>
          <dd>{section.verdict}</dd>
        </div>
      </dl>
    );
  }

  // pointer
  return <p className="text-sm leading-relaxed">{section.note}</p>;
}

export default function StandingPlaybookView({
  playbook,
}: {
  playbook?: StandingPlaybookData | null;
}) {
  if (!playbook || !Array.isArray(playbook.sections) || playbook.sections.length === 0) return null;

  const byId = new Map(playbook.sections.map((s) => [s.id, s]));
  const ordered =
    Array.isArray(playbook.section_order) && playbook.section_order.length > 0
      ? [
          ...playbook.section_order.map((id) => byId.get(id)).filter(Boolean),
          // Any section the builder emitted outside the declared order still renders.
          ...playbook.sections.filter((s) => !(playbook.section_order ?? []).includes(s.id)),
        ]
      : playbook.sections;

  return (
    <section data-ir-artifact="standing_playbook" className="mt-8">
      <h2 className="font-serif text-2xl text-brand-navy mb-1">
        {playbook.title ?? "Incident Response Playbook"}
      </h2>
      <p className="text-meta text-muted-foreground mb-6">
        Standing playbook — the pre-incident reference. {playbook.template_note}
      </p>

      {(ordered as PlaybookSectionData[]).map((section, i) => (
        <div key={section.id} className="mb-6">
          <h3 className="font-serif text-lg text-brand-navy mb-2">
            {i + 1}. {section.heading}
          </h3>
          <SectionBody section={section} />
        </div>
      ))}
    </section>
  );
}
