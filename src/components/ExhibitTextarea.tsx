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
  exhibitLabel = "Add an Exhibit for me and I will complete that separately",
  className,
  id,
  disabled,
  ...textareaProps
}: ExhibitTextareaProps) {
  const exhibit = isExhibit(value);
  // Preserve user-typed content while exhibit is selected, so deselect restores it.
  const stashedRef = React.useRef<string>(exhibit ? "" : value || "");
  React.useEffect(() => {
    if (!exhibit) stashedRef.current = value || "";
  }, [value, exhibit]);

  const radioId = React.useMemo(
    () => id || `exhibit-${Math.random().toString(36).slice(2, 9)}`,
    [id]
  );

  const toggle = () => {
    if (exhibit) {
      onChange(stashedRef.current || "");
    } else {
      onChange(EXHIBIT_SENTINEL);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        {...textareaProps}
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
        <span>{exhibitLabel}</span>
      </label>
    </div>
  );
}
