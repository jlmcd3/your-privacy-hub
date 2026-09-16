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
  /**
   * Field key of the question the message refers to (see FieldShell). When
   * given, the summary offers a link that scrolls back to that question.
   */
  fieldKey?: string | null;
}

const ValidationErrorSummary = forwardRef<HTMLDivElement, Props>(
  ({ message, className = "", fieldKey = null }, forwardedRef) => {
    const localRef = useRef<HTMLDivElement | null>(null);
    // Consume the forwarded ref for the caller while still owning a local ref
    // for the auto-focus effect.
    const setRef = (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    useEffect(() => {
      // When the caller highlights the offending question, that question takes
      // focus instead — the alert role still announces this box. If the named
      // question has no data-field anchor in the DOM (an unanchored key), fall
      // back to focusing the summary so the failure is still announced and
      // reachable by keyboard.
      if (!message || !localRef.current) return;
      if (!fieldKey) { localRef.current.focus(); return; }
      if (typeof document === "undefined") return;
      const esc =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape
          : (s: string) => s.replace(/["\\]/g, "\\$&");
      const base = fieldKey.indexOf("[") === -1 ? fieldKey : fieldKey.slice(0, fieldKey.indexOf("["));
      const anchored =
        document.querySelector(`[data-field="${esc(fieldKey)}"]`) ??
        document.querySelector(`[data-field="${esc(base)}"]`);
      if (!anchored) localRef.current.focus();
    }, [message, fieldKey]);

    const jump = () => {
      if (!fieldKey || typeof document === "undefined") return;
      const esc =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape
          : (s: string) => s.replace(/["\\]/g, "\\$&");
      const el = document.querySelector<HTMLElement>(`[data-field="${esc(fieldKey)}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = el.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      (focusable ?? el).focus({ preventScroll: true });
    };

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
        <span>
          {message}
          {fieldKey ? (
            <>
              {" "}
              <button
                type="button"
                onClick={jump}
                className="underline underline-offset-2 font-medium hover:no-underline"
              >
                Go to the question
              </button>
            </>
          ) : null}
        </span>
      </div>
    );
  }
);

ValidationErrorSummary.displayName = "ValidationErrorSummary";

export default ValidationErrorSummary;
