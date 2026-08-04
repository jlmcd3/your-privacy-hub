// ITEM 369-IR LEG 2 — EDPB Article 33 notification template, field mapping.
//
// Renders the SAME content-owner element analysis re-keyed onto the regulator's
// template field structure. Nothing is invented here: a template field the
// record does not answer renders as an explicitly blank, labelled field.

interface TemplateField {
  field_id: string;
  label: string;
  template_section?: string;
  source_element?: string | null;
  owner?: string;
  value?: string;
  status?: "mapped" | "blank";
}

interface TemplateSection {
  id: string;
  heading: string;
  fields?: TemplateField[];
}

export interface EdpbTemplateData {
  version?: string;
  template_label?: string;
  note?: string;
  sections?: TemplateSection[];
  mapped_count?: number;
  blank_count?: number;
}

export default function EdpbArt33TemplateFields({
  template,
}: {
  template?: EdpbTemplateData | null;
}) {
  if (!template || !Array.isArray(template.sections) || template.sections.length === 0) return null;

  return (
    <div data-ir-edpb-template className="mt-5 border-t border-border/50 pt-4">
      <h4 className="font-serif text-base text-brand-navy mb-1">
        Article 33 notification template — field mapping
      </h4>
      {template.note && (
        <p className="text-meta text-muted-foreground mb-1">{template.note}</p>
      )}
      <p className="text-meta text-muted-foreground mb-4">
        Template structure: {template.template_label}.{" "}
        {template.mapped_count ?? 0} field(s) carried from this record;{" "}
        {template.blank_count ?? 0} field(s) left deliberately blank.
      </p>

      {template.sections.map((section) => (
        <div key={section.id} className="mb-4">
          <h5 className="text-sm font-semibold text-brand-navy mb-2">{section.heading}</h5>
          <div className="space-y-2">
            {(section.fields ?? []).map((field) => {
              const blank = field.status !== "mapped" || !String(field.value ?? "").trim();
              return (
                <div key={field.field_id} className="rounded-md border border-border/60 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </div>
                  {blank ? (
                    <div className="mt-1 border-b border-dashed border-border text-sm italic text-muted-foreground">
                      Blank — to be completed from the organisation&rsquo;s own record
                    </div>
                  ) : (
                    <div className="mt-1 text-sm">{field.value}</div>
                  )}
                  {field.owner && (
                    <div className="mt-1 text-[10px] text-muted-foreground">Owner: {field.owner}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
