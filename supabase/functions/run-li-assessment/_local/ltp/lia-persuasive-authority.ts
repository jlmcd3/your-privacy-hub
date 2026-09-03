// LIA L2 — THE PERSUASIVE AUTHORITY SECTION (the S5 surface, 2026-08-26).
//
// Composes the skeleton's new Persuasive Authority section from (a) the
// four doc-63 §6.1 release-1 AP rows now live in the CAM (their display
// blocks are the ratified bytes, transcribed verbatim), (b) the
// precedent-class posture's cited decisions where the posture fired
// (labels composed deterministically from the typed authority fields —
// the Factor-Bearing Law's trail), and (c) the doc-63 §6.2 adverse-outcome
// warning when the typed balancing verdict is likely_fails. Deduped by
// source row. Deterministic, pure; rendered ONLY on the deterministic
// path (the assembler gates the composition), so the legacy model path is
// byte-untouched.
//
// Every entry's authority_label is also returned as a ledger citation so
// the Table of Authorities lists it (iff-cited: the label string appears
// verbatim in this section's body).

import { LIA_CORPUS_MAP } from "../corpus/maps/lia-corpus-map.ts";
import { LIA_PRECEDENT_CLASS_RATIFIED } from "./lia-deliverables/precedent-classes.ts";

type Bag = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const bag = (v: unknown): Bag => (v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {});

export const LIA_PERSUASIVE_AUTHORITY_STAMP = "lia-persuasive-authority@l2-2026-08-26";

/** The section lead — ratified bytes (CEO-delegated, 2026-08-26 ledger). */
export const LIA_PERSUASIVE_AUTHORITY_LEAD =
  "This section collects enforcement decisions issued under the GDPR or UK GDPR that bear on factors assessed in this report. Each entry names the factor it bears on. They are enforcement context, persuasive rather than binding as to this processing, and none decides the outcome recorded above, which turns on this record's own facts.";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function humanDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

interface PersuasiveEntry {
  readonly source_row_id: string;
  readonly text: string;
  readonly label: string;
}

function apEntries(): PersuasiveEntry[] {
  return LIA_CORPUS_MAP.rows
    .filter((r) => r.role === "AP" && r.render_eligible && r.display)
    .map((r) => {
      const d = r.display!;
      return {
        source_row_id: r.source_row_id,
        label: d.authority_label,
        text: `${d.matter}. ${d.what_happened} Bears on ${r.factor_id.toLowerCase()}: ${d.bearing} (${d.authority_label}.)`,
      };
    });
}

function precedentEntries(report: Bag): PersuasiveEntry[] {
  if (!LIA_PRECEDENT_CLASS_RATIFIED) return [];
  const finding = bag(report.precedent_class_posture);
  if (s(finding.status) !== "analysed") return [];
  if (!s(finding.posture) || s(finding.posture) === "not_assessed") return [];
  const authorities = Array.isArray(finding.authorities) ? finding.authorities as Bag[] : [];
  const factors = Array.isArray(finding.factor_ids)
    ? (finding.factor_ids as string[]).join("; ").toLowerCase()
    : "";
  return authorities.map((a) => {
    const label = `${s(a.regulator)}, ${s(a.subject)}, decision of ${humanDate(s(a.decision_date))}${
      s(a.case_reference) ? `, ref. ${s(a.case_reference)}` : ""
    } — persuasive authority`;
    return {
      source_row_id: s(a.source_row_id),
      label,
      text: `${s(a.regulator)} — ${s(a.subject)} (${s(a.decision_date).slice(0, 4)}). ${
        s(a.what_happened)
      }${factors ? ` Bears on ${factors}.` : ""} (${label}.)`,
    };
  });
}

export interface LiaPersuasiveAuthorityResult {
  /** The composed section body ("" when nothing renders). */
  readonly body: string;
  /** Authority labels for the ToA ledger (iff-cited by the body). */
  readonly ledger: readonly string[];
  readonly entry_count: number;
  readonly aow_fired: boolean;
}

/**
 * `balancingFails` is the code-computed "balancing_fails" state (the typed
 * balancing verdict === "likely_fails") — the AOW's render_when, satisfied
 * per the render-readiness law only now that the verdict is typed.
 */
export function buildLiaPersuasiveAuthority(
  report: Bag,
  balancingFails: boolean,
): LiaPersuasiveAuthorityResult {
  const seen = new Set<string>();
  const entries: PersuasiveEntry[] = [];
  for (const e of [...apEntries(), ...precedentEntries(report)]) {
    if (seen.has(e.source_row_id)) continue;
    seen.add(e.source_row_id);
    entries.push(e);
  }
  if (entries.length === 0) return { body: "", ledger: [], entry_count: 0, aow_fired: false };

  const aow = LIA_CORPUS_MAP.rows.find((r) => r.role === "AOW" && r.render_eligible && r.warning_text);
  const aowFires = balancingFails && !!aow;

  const parts: string[] = [LIA_PERSUASIVE_AUTHORITY_LEAD, ...entries.map((e) => e.text)];
  if (aowFires && aow?.warning_text) parts.push(aow.warning_text);

  return {
    body: parts.join("\n\n"),
    ledger: entries.map((e) => e.label),
    entry_count: entries.length,
    aow_fired: aowFires,
  };
}
