// Fleet-wide intake field-error state.
//
// Holds the field keys flagged by the last failed step submission, exposes a
// predicate the JSX uses to paint a question red, clears a key as soon as the
// user touches that question, and scrolls/focuses the first flagged question.
//
// Pairs with src/lib/intakeValidation.ts (StepIssue) and
// src/components/intake/FieldShell.tsx (renders data-field + the red state).

import { useCallback, useRef, useState } from "react";

export interface FieldErrors {
  /** Currently flagged keys, in the order the check reported them. */
  fields: string[];
  /** True when this key is flagged. */
  isInvalid: (key: string) => boolean;
  /** Message to show under the flagged question. */
  message: string | null;
  /** Flag these keys, then scroll to and focus the first one. */
  show: (keys: string[], message: string) => void;
  /** Clear one key (call from a question's onChange/onFocus). */
  clear: (key: string) => void;
  /** Clear everything (step change, successful submit). */
  clearAll: () => void;
}

/** `recipient_rows[2].disclosure_purpose` -> `recipient_rows` (else the key). */
export function baseKey(key: string): string {
  const i = key.indexOf("[");
  return i === -1 ? key : key.slice(0, i);
}

function focusFieldKey(key: string) {
  if (typeof document === "undefined" || !key) return;
  const escape =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape
      : (s: string) => s.replace(/["\\]/g, "\\$&");
  const el =
    document.querySelector<HTMLElement>(`[data-field="${escape(key)}"]`) ??
    document.querySelector<HTMLElement>(`[data-field="${escape(baseKey(key))}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = el.querySelector<HTMLElement>(
    "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])",
  );
  (focusable ?? el).focus({ preventScroll: true });
}

export function useFieldErrors(): FieldErrors {
  const [fields, setFields] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const frame = useRef<number | null>(null);

  // A container key (`recipient_rows`) matches the row keys reported under it
  // (`recipient_rows[2].disclosure_purpose`), so a page that anchors only the
  // block still paints that block red.
  const isInvalid = useCallback(
    (key: string) => fields.some((f) => f === key || baseKey(f) === key),
    [fields],
  );

  const show = useCallback((keys: string[], msg: string) => {
    setFields(keys);
    setMessage(msg);
    if (!keys.length || typeof window === "undefined") return;
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    // One frame so the red state (and any newly rendered helper line) exists
    // in the DOM before we measure and scroll.
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      focusFieldKey(keys[0]);
    });
  }, []);

  const clear = useCallback((key: string) => {
    setFields((prev) => {
      const next = prev.filter((k) => k !== key && baseKey(k) !== key);
      return next.length === prev.length ? prev : next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFields([]);
    setMessage(null);
  }, []);

  return { fields, isInvalid, message, show, clear, clearAll };
}

export default useFieldErrors;
