// Fleet-wide intake question wrapper.
//
// Wrap a question block (label + control + helper text) in this. It always
// renders the `data-field` anchor used for scroll/focus; when the step check
// flags the key it paints the block red, marks it aria-invalid, and repeats the
// validation sentence directly under the question so the user never has to map
// the bottom-of-page summary back to a control by hand.
//
// Repeating blocks pass a row key, e.g. `recipient_rows[2].disclosure_purpose`.

import type { ReactNode } from "react";

interface Props {
  /** Key the step check reports; must match the key in stepValid(). */
  fieldKey: string;
  /** True when this key is currently flagged. */
  invalid?: boolean;
  /** The validation sentence to repeat under the question. */
  message?: string | null;
  /** Clears the flag as soon as the user engages with the question. */
  onInteract?: () => void;
  className?: string;
  children: ReactNode;
}

export function FieldShell({ fieldKey, invalid = false, message, onInteract, className = "", children }: Props) {
  return (
    <div
      data-field={fieldKey}
      aria-invalid={invalid || undefined}
      onFocusCapture={onInteract}
      onChange={onInteract}
      onClickCapture={onInteract}
      className={[
        "scroll-mt-28 rounded-lg transition-colors",
        invalid
          ? "border border-destructive/60 bg-destructive/5 p-3 [&_label]:text-destructive"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
      {invalid && message ? (
        <p className="mt-2 text-xs font-medium text-destructive">{message}</p>
      ) : null}
    </div>
  );
}

export default FieldShell;
