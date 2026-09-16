import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const EXHIBIT_SENTINEL =
  "[See attached Exhibit — to be completed and attached to the report separately]";

export const isExhibit = (v: string | undefined | null): boolean =>
  !!v && v.trim() === EXHIBIT_SENTINEL;

type TextareaProps = React.ComponentPropsWithoutRef<typeof Textarea>;

export interface ExhibitTextareaProps extends Omit<TextareaProps, "value" | "onChange"> {
  value: string;
  onChange: (next: string) => void;
  /** Optional label shown next to the radio. */
  exhibitLabel?: string;
  /** Optional id used to scope the radio name. */
  id?: string;
  /**
   * ADMT F19 (2026-09-15): parent-owned stash of the narrative that the
   * exhibit sentinel replaced. When `onStash` is supplied the component
   * writes the narrative there on selection and restores from `stash` on
   * deselection, so the text survives unmounts and draft round-trips.
   */
  stash?: string;
  onStash?: (narrative: string) => void;
}

/**
 * Textarea + "Add an Exhibit for me" radio.
 *
 * Selecting the radio fills the underlying value with EXHIBIT_SENTINEL
 * (so the question is treated as answered downstream) and grays out
 * the textarea. Deselecting restores whatever the user had typed
 * before opting into the exhibit.
 */
export function ExhibitTextarea({
  value,
  onChange,
  // ADMT S15 (2026-09-15): the choice reserves a blank exhibit; it neither
  // uploads evidence nor completes the exhibit, and the label says so.
  exhibitLabel = "Add a blank exhibit for me to complete separately",
  className,
  id,
  disabled,
  stash,
  onStash,
  ...textareaProps
}: ExhibitTextareaProps) {
  const exhibit = isExhibit(value);
  // Preserve user-typed content while exhibit is selected, so deselect restores it.
  const stashedRef = React.useRef<string>(exhibit ? "" : value || "");
  React.useEffect(() => {
    if (!exhibit) stashedRef.current = value || "";
  }, [value, exhibit]);

  // DPIA master review (2026-09-15, F21): `id` names the TEXTAREA (so a
  // page Label's htmlFor reaches the control it describes); the radio gets a
  // derived id of its own.
  const radioId = React.useMemo(
    () => (id ? `${id}-exhibit` : `exhibit-${Math.random().toString(36).slice(2, 9)}`),
    [id]
  );

  const toggle = () => {
    if (exhibit) {
      onChange((onStash ? stash : stashedRef.current) || stashedRef.current || "");
    } else {
      if (onStash) onStash(value || "");
      onChange(EXHIBIT_SENTINEL);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        {...textareaProps}
        id={id}
        className={cn(className, exhibit && "opacity-50 cursor-not-allowed bg-muted")}
        value={exhibit ? "" : value}
        placeholder={
          exhibit
            ? "An Exhibit page will be added to the report for you to complete separately."
            : textareaProps.placeholder
        }
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || exhibit}
        aria-disabled={exhibit}
      />
      <label
        htmlFor={radioId}
        className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none"
      >
        <input
          id={radioId}
          type="radio"
          className="mt-0.5 cursor-pointer"
          checked={exhibit}
          onClick={toggle}
          onChange={() => { /* handled in onClick to allow deselect */ }}
        />
        <span>
          {exhibitLabel}
          <span className="block text-[11px] text-muted-foreground/90">
            This does not upload evidence or complete the exhibit; your typed text is kept and restored if you deselect this.
          </span>
        </span>
      </label>
    </div>
  );
}
