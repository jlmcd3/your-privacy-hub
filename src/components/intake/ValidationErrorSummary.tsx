// Focusable, live-announced validation error summary for intake wizards.
// PRIV-3 (PP-9 intake accessibility): render this above the primary CTA on a
// wizard step; when the user submits an incomplete step the parent should set
// the message string, and the summary auto-focuses so screen readers announce
// the failure and keyboard users can Tab back into the failing field.

import { forwardRef, useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  /** The validation message, or null when the step is valid. */
  message: string | null;
  /** Optional className override on the wrapper. */
  className?: string;
}

const ValidationErrorSummary = forwardRef<HTMLDivElement, Props>(
  ({ message, className = "" }, forwardedRef) => {
    const localRef = useRef<HTMLDivElement | null>(null);
    // Consume the forwarded ref for the caller while still owning a local ref
    // for the auto-focus effect.
    const setRef = (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    useEffect(() => {
      if (message && localRef.current) localRef.current.focus();
    }, [message]);

    if (!message) return null;

    return (
      <div
        ref={setRef}
        role="alert"
        aria-live="assertive"
        tabIndex={-1}
        className={`flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-sm text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/40 ${className}`}
      >
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
    );
  }
);

ValidationErrorSummary.displayName = "ValidationErrorSummary";

export default ValidationErrorSummary;
