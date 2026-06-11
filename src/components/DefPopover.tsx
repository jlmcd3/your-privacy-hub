import { InfoPopover } from "@/components/InfoPopover";
import { DEFINITIONS } from "@/lib/definitions";

export function DefPopover({ termKey }: { termKey: string }) {
  const d = DEFINITIONS[termKey];
  if (!d) return null;
  return (
    <InfoPopover term={d.term} cite={d.cite}>
      {d.definition}
      {d.ukNote && (
        <p className="mt-1.5 pt-1.5 border-t text-[11px] text-muted-foreground">{d.ukNote}</p>
      )}
    </InfoPopover>
  );
}
