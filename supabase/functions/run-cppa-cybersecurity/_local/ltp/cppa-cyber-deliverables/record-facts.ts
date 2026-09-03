// DOC 159 (2026-09-03) — ONE RESOLVER for two profile facts that several
// composers used to splice raw (audit A.5, doc 154 Part A): the framework
// answer ("None / informal" and "Other" are not framework names) and the
// prior-audit answer ("Never" is not a date). Pure. Imported by build.ts and
// cyber-factors.ts so the derived surfaces cannot disagree with each other.

/** The maturity value that records the Company's § 7123(b)(2) position. */
export const NOT_APPLICABLE_MATURITY = "Not applicable to our information system";

/** The framework answer meaning "no published framework". */
export const NO_FRAMEWORK_OPTION = "None / informal";

/** The framework answer meaning "a framework outside the listed set". */
export const OTHER_FRAMEWORK_OPTION = "Other";

/** The last-audit answer meaning "no independent audit has been performed". */
export const NEVER_AUDITED_OPTION = "Never";

export interface FrameworkFact {
  readonly kind: "named" | "informal" | "other" | "blank";
  /** The verbatim answer ("" when blank). */
  readonly answer: string;
  /** Noun phrase for an "organized around …" sentence; "" when blank. */
  readonly phrase: string;
}

export function frameworkFact(answer: unknown): FrameworkFact {
  const a = typeof answer === "string" ? answer.trim() : "";
  if (!a) return { kind: "blank", answer: "", phrase: "" };
  if (a === NO_FRAMEWORK_OPTION) return { kind: "informal", answer: a, phrase: "no published framework" };
  if (a === OTHER_FRAMEWORK_OPTION) return { kind: "other", answer: a, phrase: "a framework outside the listed set" };
  return { kind: "named", answer: a, phrase: a };
}

export interface PriorAuditFact {
  /** true when the Company records a prior independent audit. */
  readonly recorded: boolean;
  /** true when the answer is "Never": an explicit negative, not a blank. */
  readonly never: boolean;
  readonly lastAudit: string;
  /** The prior audit's described coverage; "" when none, or when "Never". */
  readonly scope: string;
}

export function priorAuditFact(lastAudit: unknown, priorScope: unknown): PriorAuditFact {
  const la = typeof lastAudit === "string" ? lastAudit.trim() : "";
  const sc = typeof priorScope === "string" ? priorScope.trim() : "";
  const never = la === NEVER_AUDITED_OPTION;
  return { recorded: !!la && !never, never, lastAudit: la, scope: never ? "" : sc };
}

/** The incident-count answer as prose ("1" is one incident, not "1 incidents"). */
export function incidentPhrase(count: unknown): string {
  const c = typeof count === "string" ? count.trim() : "";
  if (c === "1") return "one security incident";
  if (c === "2–5") return "two to five security incidents";
  if (c === "More than 5") return "more than five security incidents";
  return c ? `${c} security incidents` : "";
}

/** Counts under ten print as words (the fleet register rule); ten and above as digits. */
export function countWord(n: number): string {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  return Number.isInteger(n) && n >= 0 && n < 10 ? words[n] : String(n);
}
