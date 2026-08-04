// ITEM 369-IR (Master Spec §4.2) — ARTIFACT B renderer: the INCIDENT WORKSHEET.
//
// BLANK BY DESIGN. Every cell renders empty. This component must never be
// given a data path that could fill a cell: a worksheet that arrives with
// specimen entries invites a responder to leave the specimen in place, which
// is worse than supplying no form at all.

export interface WorksheetFormData {
  id: string;
  heading: string;
  instruction: string;
  columns?: string[];
  blank_rows?: number;
  prompts?: string[];
}

export interface IncidentWorksheetData {
  version?: string;
  artifact?: string;
  title?: string;
  blank_by_design?: boolean;
  forms?: WorksheetFormData[];
}

export default function IncidentWorksheetView({
  worksheet,
}: {
  worksheet?: IncidentWorksheetData | null;
}) {
  if (!worksheet || !Array.isArray(worksheet.forms) || worksheet.forms.length === 0) return null;

  return (
    <section data-ir-artifact="incident_worksheet" className="mt-10 border-t border-border pt-8">
      <h2 className="font-serif text-2xl text-brand-navy mb-1">
        {worksheet.title ?? "Incident Worksheet"}
      </h2>
      <p className="text-meta text-muted-foreground mb-6">
        Blank forms, completed during an incident. Nothing on these forms is pre-filled.
      </p>

      {worksheet.forms.map((form) => (
        <div key={form.id} className="mb-8">
          <h3 className="font-serif text-lg text-brand-navy mb-1">{form.heading}</h3>
          <p className="text-meta text-muted-foreground mb-3">{form.instruction}</p>

          {Array.isArray(form.prompts) && form.prompts.length > 0 ? (
            <ol className="space-y-4">
              {form.prompts.map((prompt, i) => (
                <li key={i} className="text-sm">
                  <span className="block mb-2">
                    {i + 1}. {prompt}
                  </span>
                  <span className="block h-10 border-b border-border" aria-hidden="true" />
                </li>
              ))}
            </ol>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    {(form.columns ?? []).map((c) => (
                      <th
                        key={c}
                        className="text-left font-semibold border border-border bg-muted/40 py-2 px-2"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: form.blank_rows ?? 0 }).map((_, r) => (
                    <tr key={r}>
                      {(form.columns ?? []).map((c) => (
                        <td key={c} className="border border-border h-8 px-2" />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
