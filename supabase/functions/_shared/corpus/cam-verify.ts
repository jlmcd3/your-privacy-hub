// Pure verification helpers over a CorpusMap. No I/O, no DB access — pin
// checks run against a committed SNAPSHOT fixture (doc 52 §1: local tests
// cannot reach Supabase; live re-verification is a T2 review concern).
//
// PHASE 2 (2026-08-22): invariants updated for the conscious widening of
// render_eligible (see cam-types.ts header). The rules below ARE the
// current render law — a map that violates them fails CI.
//
// PHASE A (2026-08-22, doc 53): PN-CORPUS-1 ratified (default-dark, CEO-
// curated carve-outs). The FC-on-S4 carve-out below is the machine-enforced
// form of that ruling — S4 FC rows are lawful ONLY inside a map carrying
// `s4_ratification`; every map without that stamp stays S0-only for FC,
// exactly as before ratification.
//
// WAVE C1 (2026-08-23, doc 62 §11 — the READER-VALUE LAW): two more
// invariants machine-enforce the ratified test. purpose_class-presence
// enforces §11.2 (a row that cannot name its purpose does not render).
// The display-consistency invariant enforces §11.5's citation-form law: a
// row that names a citation_source must actually name that source, by
// substring, in whatever free text renders it — a typo in ratified prose
// can never misname a case.

import type { CamRow, CorpusMap } from "./cam-types.ts";

export interface CorpusSnapshot {
  readonly captured_at: string;
  readonly rows: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** True iff row.pinned_excerpt is an exact contiguous substring of the
 * snapshot's text for row.source_row_id / row.excerpt_field. Rows with an
 * empty pinned_excerpt (AP/AOW — render from ratified annotations, not
 * corpus text) are vacuously pinned. */
export function excerptPinned(row: CamRow, snapshot: CorpusSnapshot): boolean {
  if (row.pinned_excerpt === "") return true;
  const fields = snapshot.rows[row.source_row_id];
  if (!fields) return false;
  const text = fields[row.excerpt_field];
  if (typeof text !== "string") return false;
  return text.includes(row.pinned_excerpt);
}

/** Schema invariants over a whole map. Returns a list of violation
 * messages; empty means the map is valid. */
export function mapInvariants(map: CorpusMap): string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();

  for (const row of map.rows) {
    if (seenIds.has(row.id)) {
      problems.push(`duplicate CamRow id: ${row.id}`);
    }
    seenIds.add(row.id);

    if (row.logic_bearing && !row.logic_disposition) {
      problems.push(`${row.id}: logic_bearing rows require logic_disposition`);
    }
    if (!row.logic_bearing && row.logic_disposition) {
      problems.push(`${row.id}: logic_disposition set on a non-logic_bearing row`);
    }

    // Pin discipline. AP/AOW rows render from ratified annotations and may
    // carry an empty pin; every other role must pin real corpus text.
    if (row.role === "AP" || row.role === "AOW") {
      // empty allowed; a non-empty pin is also fine (extra evidence).
    } else if (row.pinned_excerpt.length === 0) {
      problems.push(`${row.id}: pinned_excerpt is empty`);
    }
    // Size law: build-time-only rows stay compact (doc 34 §2 bundling);
    // render-eligible rows carry the full rendered text so the customer
    // bytes are what the pin verifies.
    const cap = row.render_eligible ? 2000 : 300;
    if (row.pinned_excerpt.length > cap) {
      problems.push(`${row.id}: pinned_excerpt exceeds ${cap} chars (${row.pinned_excerpt.length})`);
    }

    // Render-surface law (the phase-2 posture, machine-enforced).
    if (row.render_eligible) {
      if (!row.render_surface) {
        problems.push(`${row.id}: render_eligible without render_surface`);
      }
      if (row.role === "FC" && row.render_surface !== "S0") {
        const s4Ratified = row.render_surface === "S4" && !!map.s4_ratification;
        if (!s4Ratified) {
          problems.push(
            `${row.id}: FC rows may render only on S0, or on S4 inside a map carrying s4_ratification (PN-CORPUS-1 carve-out) — this map has neither`,
          );
        }
      }
      if (row.role === "FC" && row.render_surface === "S0" && !row.s0_field) {
        problems.push(`${row.id}: render-eligible S0 FC rows must name their s0_field`);
      }
      if (row.role === "AP") {
        if (row.render_surface !== "S5") problems.push(`${row.id}: AP rows render only on S5`);
        if (!row.display) problems.push(`${row.id}: render-eligible AP rows require display`);
        if (!row.render_when || row.render_when.length === 0) {
          problems.push(`${row.id}: render-eligible AP rows require render_when`);
        }
      }
      if (row.role === "AOW") {
        if (row.render_surface !== "S5") {
          problems.push(`${row.id}: AOW rows render only on S5 (placement: inside the persuasive-authority appendix)`);
        }
        if (!row.warning_text || !row.warning_text.trim()) {
          problems.push(`${row.id}: render-eligible AOW rows require warning_text`);
        }
        if (!row.render_when || row.render_when.length === 0) {
          problems.push(`${row.id}: render-eligible AOW rows require render_when`);
        }
      }
      if (row.role === "SB" || row.role === "AQ") {
        problems.push(`${row.id}: role ${row.role} has no proven render mechanism yet (SB deferred until after S5 ships)`);
      }
      // Reader-Value Law (doc 62 §11.2): every render_eligible row must
      // name a purpose class — a row that cannot is not fit to render.
      if (!row.purpose_class) {
        problems.push(`${row.id}: render_eligible rows require purpose_class (doc 62 §11.2)`);
      }
    } else {
      if (row.render_surface || row.display || row.warning_text || row.render_when || row.purpose_class) {
        problems.push(`${row.id}: render-only fields set on a render_eligible:false row`);
      }
    }

    // Display-consistency invariant (doc 62 §11.5): a row naming a
    // citation_source must actually name that source, by substring, in
    // whatever free text carries the citation to the reader.
    if (row.citation_source) {
      const cs = row.citation_source;
      const yearMatch = /^(\d{4})-\d{2}-\d{2}$/.exec(cs.decision_date);
      const year = yearMatch ? yearMatch[1] : null;
      const displayText = row.display?.authority_label ?? row.warning_text ?? row.curation_note ?? "";
      if (!displayText.includes(cs.regulator)) {
        problems.push(`${row.id}: citation_source.regulator "${cs.regulator}" not found in the rendered display text (display-consistency invariant)`);
      }
      if (!year) {
        problems.push(`${row.id}: citation_source.decision_date is not a valid ISO date ("${cs.decision_date}")`);
      } else if (!displayText.includes(year)) {
        problems.push(`${row.id}: citation_source decision year "${year}" not found in the rendered display text (display-consistency invariant)`);
      }
    }

    if (!row.curation_note.trim()) {
      problems.push(`${row.id}: curation_note is empty`);
    }
    if (!row.provenance.verified_on.trim()) {
      problems.push(`${row.id}: provenance.verified_on is empty`);
    }
  }

  return problems;
}
