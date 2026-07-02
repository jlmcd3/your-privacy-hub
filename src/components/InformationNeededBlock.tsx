import type { InfoNeededEntry } from "@/hooks/useRefineMode";

interface Props {
  items?: InfoNeededEntry[] | null;
}

/**
 * Renders the "Information needed for a complete determination" block on a
 * result page when the generator emitted information_needed entries.
 * Each entry is displayed as: dimensions — provision — enables.
 */
export default function InformationNeededBlock({ items }: Props) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <section className="mt-8 border-t border-brand-cloud pt-6">
      <h3 className="font-serif-text font-semibold text-brand-navy text-[18px] mb-3">
        Information needed for a complete determination
      </h3>
      <ul className="space-y-2 mb-4">
        {items.map((it, i) => {
          const dims = (it as any).dimensions ?? (it as any).field ?? "";
          const prov = (it as any).provision ?? "";
          const en = (it as any).enables ?? "";
          const parts = [dims, prov, en].filter(Boolean).join(" — ");
          return (
            <li key={i} className="text-body-small text-ink-soft leading-relaxed">
              {parts || JSON.stringify(it)}
            </li>
          );
        })}
      </ul>
      <p className="text-meta text-muted-foreground italic leading-relaxed">
        This report is a complete deliverable of the tool as provided; providing the items above enables a fuller determination in a revision run and is not a representation of any particular outcome.
      </p>
    </section>
  );
}
