// Certification tracking — CEO CERTIFICATION STANDARD (2026-07-24).
//
// A tool is CERTIFIED when it achieves THREE CONSECUTIVE waves, each satisfying:
//   (1) gate_v2 pass — every dimension >= 90 (persisted on the digest);
//   (2) ZERO critical and ZERO high findings surviving cross-grader agreement
//       (failing_checks[].cross_category ∈ {"agree","deterministic"});
//   (3) measured at N_docs >= 15, replicates >= 3 (A5 defaults);
//   (4) same instrument hash across all three waves (grader_context_version).
//
// Product improvements MAY deploy between waves — a build change does NOT
// reset the counter; only a FAILED wave or an INSTRUMENT CHANGE does.
// Rubrics are never loosened; this redefines the certification event, not
// the measurement.
//
// This module is pure. It takes normalized inputs (digest + linked run +
// derived replicates) and returns per-tool state. UI code and tests both
// consume it. Kept as a plain function so the vitest suite can exercise the
// consecutive-wave / instrument-hash logic without hitting Supabase.

export const CERTIFICATION_CONFIG = {
  MIN_N_DOCS: 15,
  MIN_REPLICATES: 3,
  REQUIRED_CONSECUTIVE_WAVES: 3,
  DIMENSION_FLOOR: 90,
} as const;

export type CrossCategory = "agree" | "deterministic" | "claude_only" | "gpt_only" | null;

export interface DigestFinding {
  severity: string | null;
  cross_category: CrossCategory | string | null;
}

export interface WaveInput {
  tool: string;
  wave_number: number;
  campaign_id: string;
  digest_id: string;
  gate_v2_pass: boolean | null;
  failing_checks: DigestFinding[];
  instrument_hash: string | null; // grader_context_version from linked run
  n_docs: number | null;          // batch_size from linked run
  replicates: number;             // count of sibling runs contributing to the wave
  created_at: string;
}

export interface WaveEvaluation {
  wave: WaveInput;
  qualifies: boolean;
  reasons: string[];
}

export interface ToolCertificationState {
  tool: string;
  waves: WaveEvaluation[];        // most-recent first
  streak: number;                 // consecutive qualifying waves at the top with same instrument
  streak_instrument_hash: string | null;
  certified: boolean;
  next_missing: string[];         // human-readable summary of what the top wave lacks
}

const CRIT_HIGH = new Set(["critical", "high"]);
const AGREEING = new Set(["agree", "deterministic"]);

export function evaluateWave(wave: WaveInput): WaveEvaluation {
  const reasons: string[] = [];

  if (wave.gate_v2_pass !== true) reasons.push("gate_v2 did not pass");

  const survivingCritHigh = (wave.failing_checks ?? []).filter(f =>
    AGREEING.has(String(f.cross_category ?? "").toLowerCase()) &&
    CRIT_HIGH.has(String(f.severity ?? "").toLowerCase())
  ).length;
  if (survivingCritHigh > 0) {
    reasons.push(`${survivingCritHigh} surviving critical/high finding(s)`);
  }

  const nDocs = wave.n_docs ?? 0;
  if (nDocs < CERTIFICATION_CONFIG.MIN_N_DOCS) {
    reasons.push(`N_docs ${nDocs} < ${CERTIFICATION_CONFIG.MIN_N_DOCS}`);
  }
  if (wave.replicates < CERTIFICATION_CONFIG.MIN_REPLICATES) {
    reasons.push(`replicates ${wave.replicates} < ${CERTIFICATION_CONFIG.MIN_REPLICATES}`);
  }
  if (!wave.instrument_hash) {
    reasons.push("instrument hash not recorded");
  }

  return { wave, qualifies: reasons.length === 0, reasons };
}

export function computeToolCertification(
  tool: string,
  wavesNewestFirst: WaveInput[],
): ToolCertificationState {
  const evaluations = wavesNewestFirst.map(evaluateWave);

  let streak = 0;
  let streakHash: string | null = null;
  for (const ev of evaluations) {
    if (!ev.qualifies) break;
    const hash = ev.wave.instrument_hash;
    if (streak === 0) {
      streakHash = hash;
      streak = 1;
    } else if (hash && hash === streakHash) {
      streak += 1;
    } else {
      // Instrument changed → window resets, this wave starts a new streak.
      streakHash = hash;
      streak = 1;
    }
  }

  const certified = streak >= CERTIFICATION_CONFIG.REQUIRED_CONSECUTIVE_WAVES;
  const next_missing = evaluations[0]?.reasons ?? ["no waves measured"];

  return {
    tool,
    waves: evaluations,
    streak,
    streak_instrument_hash: streakHash,
    certified,
    next_missing,
  };
}
