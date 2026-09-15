// Fleet-wide intake validation shape.
//
// Every product wizard's step check used to return a bare message string, so
// the red summary at the bottom of the step could not say WHICH question was
// missing. A check now returns a StepIssue: the same message text, plus the
// field key(s) the message refers to. The keys are matched against the
// `data-field` attribute rendered by <FieldShell>, which is what gets the red
// outline and the scroll/focus treatment.
//
// Pure module: no React, no DOM. Safe to unit test directly.

export interface StepIssue {
  /** Unchanged, user-visible sentence shown in the summary box. */
  message: string;
  /** Field keys this message refers to, in display order. May be empty. */
  fields: string[];
}

/** Build a StepIssue. `fail("i6_vendors", "List the …")` */
export function fail(fields: string | string[], message: string): StepIssue {
  return { message, fields: Array.isArray(fields) ? fields.filter(Boolean) : fields ? [fields] : [] };
}

/** Key for one cell of a repeating block: `recipient_rows[2].disclosure_purpose`. */
export function rowKey(base: string, index: number, sub?: string): string {
  return `${base}[${index}]${sub ? `.${sub}` : ""}`;
}

/**
 * Index of the first row failing `pred`, or -1. Used so a repeating-block
 * message can point at the offending row rather than the whole block.
 */
export function firstBadRow<T>(rows: readonly T[], pred: (row: T) => boolean): number {
  return rows.findIndex(pred);
}

/**
 * Convenience for the common repeating-block case: if any row fails, return a
 * StepIssue keyed to the first failing row; otherwise null.
 */
export function rowFail<T>(
  rows: readonly T[],
  pred: (row: T) => boolean,
  base: string,
  sub: string,
  message: string,
): StepIssue | null {
  const i = firstBadRow(rows, pred);
  if (i < 0) return null;
  return fail(rowKey(base, i, sub), message);
}

/** Normalises legacy string returns so a half-converted page still works. */
export function toIssue(value: StepIssue | string | null | undefined): StepIssue | null {
  if (!value) return null;
  return typeof value === "string" ? { message: value, fields: [] } : value;
}
