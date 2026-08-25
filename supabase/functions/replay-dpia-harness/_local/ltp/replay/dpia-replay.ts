/**
 * DPIA REPLAY — pure, deterministic replay of the DPIA document chain.
 *
 * Clone of the CPPA replay-harness pattern (ITEM 255 / ITEM 287) for the DPIA
 * product, with ONE structural difference: the DPIA chain replayed here is the
 * DETERMINISTIC PHASE ONLY — builders → attestation → skeleton assembler. There
 * is NO model call anywhere in this module, by construction: it imports nothing
 * that can reach a provider.
 *
 * The module NEVER writes to the source row. `report_data` is deep-cloned and
 * the builders run over the clone, exactly as they do on the live path
 * (run-dpia-framework: attachDpiaDeliverables → attachDpiaAttestation →
 * assembleDpiaSkeletonDocument).
 */
import { attachDpiaDeliverables } from "../../../../_shared/ltp/dpia-deliverables/build.ts";
import { attachDpiaAttestation } from "../../../../_shared/ltp/dpia-deliverables/attestation.ts";
import {
  assembleDpiaSkeletonDocument,
  DPIA_SKELETON_ASSEMBLER_STAMP,
} from "../../../../_shared/ltp/dpia-skeleton-assemble.ts";

export const DPIA_REPLAY_STAMP = "dpia-replay@so-harness-2026-08-17";

// deno-lint-ignore no-explicit-any
type Bag = Record<string, any>;

export interface DpiaReplayDoc {
  id: string;
  intake_data: Bag;
  report_data: Bag | null;
}

export interface DpiaSideBySideBlock {
  index: number;
  kind: string;
  changed: boolean;
  stored_text: string;
  replayed_text: string;
}

export interface DpiaSideBySideSection {
  id: string;
  title: string;
  changed: boolean;
  blocks: DpiaSideBySideBlock[];
}

export interface DpiaSideBySide {
  doc_id: string;
  stored_document_present: boolean;
  summary: {
    sections_total: number;
    sections_changed: number;
    blocks_total: number;
    blocks_changed: number;
    byte_identical: boolean;
  };
  sections: DpiaSideBySideSection[];
}

export interface DpiaPerDocResult {
  doc_id: string;
  tool: "dpia";
  provider_kind: "deterministic";
  replay_stamp: string;
  assembler_stamp: string;
  builders: {
    deliverables: Bag | null;
    attestation: Bag | null;
  };
  determination: string | null;
  band_counts: Record<string, number>;
  gap_ledger_size: number;
  surfaces_present: string[];
  surfaces_absent: string[];
  conformance_findings: number;
  register_findings: string[];
  sections: number;
  hard_failures: string[];
}

export interface DpiaReplayOutcome {
  perDoc: DpiaPerDocResult;
  sideBySide: DpiaSideBySide | null;
  /** The replayed skeleton document — persisted for the CEO read surface. */
  assembledReport: Bag | null;
}

/** Surfaces the deterministic chain MUST have produced. Absence is a hard failure. */
export const REQUIRED_DPIA_SURFACES = [
  "necessity_findings",
  "proportionality",
  "risk_register",
  "art36_consultation",
  "legal_basis",
  "decision",
  "gap_ledger",
  "processing_inventory",
  "section2_coverage",
  "skeleton_document",
] as const;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

/**
 * PROMPT 11.1 item 3 — CANONICAL SERIALIZATION. A stored jsonb round-trip may
 * reorder object keys, which made an identical table compare as changed. Both
 * sides are serialized with recursively SORTED keys.
 */
export function canonicalJson(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        out[k] = norm((v as Record<string, unknown>)[k]);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(norm(value));
}

function blockText(p: Bag): string {
  if (p && typeof p === "object" && p.table) {
    // Tables compare on their full serialized shape, not their (empty) text.
    return canonicalJson(p.table);
  }
  return String(p?.text ?? "");
}


/** Per-section, per-block comparison of the stored vs replayed skeleton. */
export function compareSkeletonDocuments(
  docId: string,
  stored: Bag | null,
  replayed: Bag | null,
): DpiaSideBySide {
  const storedSections: Bag[] = Array.isArray(stored?.sections) ? stored!.sections : [];
  const replaySections: Bag[] = Array.isArray(replayed?.sections) ? replayed!.sections : [];
  const ids: string[] = [];
  for (const s of [...storedSections, ...replaySections]) {
    const id = String(s?.id ?? "");
    if (!ids.includes(id)) ids.push(id);
  }

  let blocksTotal = 0;
  let blocksChanged = 0;
  let sectionsChanged = 0;
  const sections: DpiaSideBySideSection[] = [];

  for (const id of ids) {
    const a = storedSections.find((s) => String(s?.id ?? "") === id) ?? null;
    const b = replaySections.find((s) => String(s?.id ?? "") === id) ?? null;
    const ap: Bag[] = Array.isArray(a?.paragraphs) ? a!.paragraphs : [];
    const bp: Bag[] = Array.isArray(b?.paragraphs) ? b!.paragraphs : [];
    const n = Math.max(ap.length, bp.length);
    const blocks: DpiaSideBySideBlock[] = [];
    let secChanged = false;
    for (let i = 0; i < n; i++) {
      const storedText = ap[i] ? blockText(ap[i]) : "";
      const replayedText = bp[i] ? blockText(bp[i]) : "";
      const changed = storedText !== replayedText;
      blocksTotal++;
      if (changed) {
        blocksChanged++;
        secChanged = true;
      }
      blocks.push({
        index: i,
        kind: String(bp[i]?.kind ?? ap[i]?.kind ?? ""),
        changed,
        stored_text: storedText,
        replayed_text: replayedText,
      });
    }
    if (secChanged) sectionsChanged++;
    sections.push({
      id,
      title: String(b?.title ?? a?.title ?? ""),
      changed: secChanged,
      blocks,
    });
  }

  return {
    doc_id: docId,
    stored_document_present: !!stored && Array.isArray(stored.sections),
    summary: {
      sections_total: sections.length,
      sections_changed: sectionsChanged,
      blocks_total: blocksTotal,
      blocks_changed: blocksChanged,
      byte_identical: blocksChanged === 0 && !!stored && Array.isArray(stored.sections),
    },
    sections,
  };
}

/**
 * Replay ONE document. NEVER throws: any throw is caught into
 * `hard_failures: ["harness_error:<msg>"]` and the batch continues.
 */
export function replayDpiaDoc(
  doc: DpiaReplayDoc,
  opts?: { unitsMinimal?: boolean },
): DpiaReplayOutcome {
  const hard: string[] = [];
  const perDoc: DpiaPerDocResult = {
    doc_id: doc.id,
    tool: "dpia",
    provider_kind: "deterministic",
    replay_stamp: DPIA_REPLAY_STAMP,
    assembler_stamp: DPIA_SKELETON_ASSEMBLER_STAMP,
    builders: { deliverables: null, attestation: null },
    determination: null,
    band_counts: {},
    gap_ledger_size: 0,
    surfaces_present: [],
    surfaces_absent: [],
    conformance_findings: 0,
    register_findings: [],
    sections: 0,
    hard_failures: hard,
  };

  let replayedDocument: Bag | null = null;
  let sideBySide: DpiaSideBySide | null = null;

  try {
    const intake = (doc.intake_data ?? {}) as Bag;
    const storedReport = (doc.report_data ?? {}) as Bag;
    const storedSkeleton = (storedReport.skeleton_document ?? null) as Bag | null;

    // Deep clone: the source row is never mutated, directly or transitively.
    const report = clone(storedReport) as Bag;
    delete report.skeleton_document;

    perDoc.builders.deliverables = attachDpiaDeliverables(report, intake, {
      unitsMinimal: opts?.unitsMinimal ?? true,
    });
    perDoc.builders.attestation = attachDpiaAttestation(report, intake);

    const sk = assembleDpiaSkeletonDocument(report, intake);
    report.skeleton_document = sk.document;
    replayedDocument = sk.document as unknown as Bag;
    perDoc.conformance_findings = Array.isArray(sk.conformance) ? sk.conformance.length : 0;
    perDoc.register_findings = Array.isArray(sk.register_findings) ? sk.register_findings : [];
    perDoc.sections = Array.isArray(sk.document?.sections) ? sk.document.sections.length : 0;

    // Determination + band counts + gap ledger size.
    perDoc.determination = report.decision?.determination
      ? String(report.decision.determination)
      : null;
    const register: Bag[] = Array.isArray(report.risk_register) ? report.risk_register : [];
    for (const r of register) {
      const band = String(r?.residual_band ?? "unbanded");
      perDoc.band_counts[band] = (perDoc.band_counts[band] ?? 0) + 1;
    }
    const ledger: Bag[] = Array.isArray(report.gap_ledger) ? report.gap_ledger : [];
    perDoc.gap_ledger_size = ledger.length;

    // Surface presence.
    for (const key of REQUIRED_DPIA_SURFACES) {
      const v = report[key];
      const present = v !== undefined && v !== null;
      if (present) perDoc.surfaces_present.push(key);
      else {
        perDoc.surfaces_absent.push(key);
        hard.push(`harness_error:surface_absent:${key}`);
      }
    }

    // INVARIANT (types.ts:268): a gap entry with empty `dimensions` or empty
    // `field` is never emitted. Here that invariant is a HARD FAILURE.
    ledger.forEach((e, i) => {
      if (!String(e?.dimensions ?? "").trim()) {
        hard.push(`harness_error:gap_ledger_empty_dimensions:${i}`);
      }
      if (!String(e?.field ?? "").trim()) {
        hard.push(`harness_error:gap_ledger_empty_field:${i}`);
      }
    });

    sideBySide = compareSkeletonDocuments(doc.id, storedSkeleton, replayedDocument);
  } catch (e) {
    hard.push(`harness_error:${(e as Error)?.message ?? String(e)}`);
  }

  return { perDoc, sideBySide, assembledReport: replayedDocument };
}
