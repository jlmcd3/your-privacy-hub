// DOC 170 (2026-09-04) — Syllabus & Record, the fleet presentation system:
// the web-side mirror of supabase/functions/_shared/prose/syllabus.ts (the
// account view cannot import an edge module). Keep the product gate, the
// projection type and the state lexicon byte-equivalent with that file — the
// doc170 Deno suite pins the two SR_PRODUCTS lists to each other.

export type SyllabusTone = "ok" | "hold" | "hi" | "neutral";

export interface SyllabusCondition {
  readonly name: string;
  readonly text: string;
}

export interface SyllabusProjection {
  readonly _typed: "syllabus@sr-2026-09-04";
  readonly instrument_line: string;
  readonly prepared_for: string;
  readonly activity: string;
  readonly subtitle: string;
  readonly disposition_label: string;
  readonly disposition: string;
  readonly disposition_tone: SyllabusTone;
  readonly paragraph: string;
  readonly rows: ReadonlyArray<readonly [string, string]>;
  readonly conditions_heading: string;
  readonly conditions: readonly SyllabusCondition[];
  readonly key_dates: ReadonlyArray<readonly [string, string]>;
  readonly record_map: ReadonlyArray<readonly [string, string, string]>;
  readonly running_head: string;
}

/** The render gate — mirror of SR_PRODUCTS in the edge module. */
export const SR_PRODUCTS: ReadonlySet<string> = new Set<string>([
  "cppa-risk",
  "dpia",
  "lia",
  "governance",
  "cppa-admt-v2",
  "cppa-cyber",
  "registration",
  "ir-playbook",
]);

export function isSyllabusRecordProduct(product: string | undefined | null): boolean {
  return !!product && SR_PRODUCTS.has(product);
}

export const SR_STATE_TONES: ReadonlyArray<readonly [RegExp, SyllabusTone]> = [
  [/^(Engaged|Credited|Addressed|Recorded|Confirmed|Yes|Low|Proceed|Necessary to the stated purpose|Implemented and tested|Complete|Approved|Available|Evidenced|Meets on reported facts|Ready for the independent audit on the Company's answers|Ready)$/i, "ok"],
  [/^(Additional Information Required|Determination pending|Timeliness pending|Open|Partial|Open in part|Moderate|Unsure|Unconfirmed|Partly outside|Proceed with Conditions|Implemented, not tested|Planned, not yet implemented|Not stated — see the Follow-Ups in § 4\.D|Conditionally Approved|Partly evidenced|Not yet determinable|Pathway-dependent|Qualified — follow-up needed|Unable to assess — scope cannot be determined on the current record|Ready subject to the named remediation|No readiness conclusion on the information provided)$/i, "hold"],
  [/^(High|Critical|Do Not Proceed|Collected but not necessary to the stated purpose|Collected but not necessary|Prior Consultation Required|Not Available|Not evidenced|Gaps identified|Record conflict — resolve before a determination can be reached|Not yet ready — blocking items named in this report|Not Ready)$/i, "hi"],
  [/^(Not engaged|Not established|Not applicable|Not assessed|No|Neutral|No Processing Decision Required|Not recorded|No Determination Recorded|Out of scope on reported facts)$/i, "neutral"],
];

export function toneForState(value: string): SyllabusTone | null {
  const v = value.trim();
  for (const [re, tone] of SR_STATE_TONES) if (re.test(v)) return tone;
  return null;
}

export function readSyllabus(doc: unknown): SyllabusProjection | null {
  const s = (doc as { syllabus?: unknown } | null | undefined)?.syllabus as SyllabusProjection | undefined;
  if (!s || typeof s !== "object" || s._typed !== "syllabus@sr-2026-09-04") return null;
  return s;
}

/** Tailwind text classes for the four tones (text only — never a filled chip). */
export const SR_TONE_CLASS: Record<SyllabusTone, string> = {
  ok: "text-[#28503a] dark:text-emerald-300",
  hold: "text-[#6e5518] dark:text-amber-300",
  hi: "text-[#6e2323] dark:text-red-300",
  neutral: "text-[#41505c] dark:text-slate-300",
};
