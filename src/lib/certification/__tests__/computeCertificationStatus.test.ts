// Tests for CEO CERTIFICATION STANDARD (2026-07-24).
import { describe, it, expect } from "vitest";
import {
  CERTIFICATION_CONFIG,
  computeToolCertification,
  evaluateWave,
  type WaveInput,
} from "../computeCertificationStatus";

function wave(over: Partial<WaveInput> = {}): WaveInput {
  return {
    tool: "cppa-admt",
    wave_number: 9,
    campaign_id: "camp-1",
    digest_id: "d1",
    gate_v2_pass: true,
    failing_checks: [],
    instrument_hash: "gc-A",
    n_docs: 15,
    replicates: 3,
    created_at: "2026-07-24T08:00:00Z",
    ...over,
  };
}

describe("evaluateWave", () => {
  it("qualifies at the A5 minimums with no surviving crit/high", () => {
    const r = evaluateWave(wave());
    expect(r.qualifies).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("fails when gate_v2 is false", () => {
    const r = evaluateWave(wave({ gate_v2_pass: false }));
    expect(r.qualifies).toBe(false);
    expect(r.reasons.join(" ")).toContain("gate_v2");
  });

  it("ignores non-agreeing crit/high (gpt_only, claude_only)", () => {
    const r = evaluateWave(wave({
      failing_checks: [
        { severity: "critical", cross_category: "gpt_only" },
        { severity: "high", cross_category: "claude_only" },
      ],
    }));
    expect(r.qualifies).toBe(true);
  });

  it("fails on any surviving crit/high (agree or deterministic)", () => {
    const r = evaluateWave(wave({
      failing_checks: [{ severity: "high", cross_category: "agree" }],
    }));
    expect(r.qualifies).toBe(false);
    expect(r.reasons.join(" ")).toContain("surviving critical/high");
  });

  it("fails when N_docs or replicates below A5 floors", () => {
    const r1 = evaluateWave(wave({ n_docs: 10 }));
    expect(r1.qualifies).toBe(false);
    expect(r1.reasons.join(" ")).toContain("N_docs 10");
    const r2 = evaluateWave(wave({ replicates: 2 }));
    expect(r2.qualifies).toBe(false);
    expect(r2.reasons.join(" ")).toContain("replicates 2");
  });

  it("fails when instrument hash not recorded", () => {
    const r = evaluateWave(wave({ instrument_hash: null }));
    expect(r.qualifies).toBe(false);
    expect(r.reasons.join(" ")).toContain("instrument hash");
  });
});

describe("computeToolCertification", () => {
  it("certifies on three consecutive qualifying waves with the same instrument", () => {
    const state = computeToolCertification("cppa-admt", [
      wave({ wave_number: 11, instrument_hash: "gc-A" }),
      wave({ wave_number: 10, instrument_hash: "gc-A" }),
      wave({ wave_number: 9, instrument_hash: "gc-A" }),
      wave({ wave_number: 8, instrument_hash: "gc-A", gate_v2_pass: false }),
    ]);
    expect(state.streak).toBe(3);
    expect(state.streak_instrument_hash).toBe("gc-A");
    expect(state.certified).toBe(true);
  });

  it("resets streak when instrument hash changes mid-window", () => {
    const state = computeToolCertification("cppa-admt", [
      wave({ wave_number: 11, instrument_hash: "gc-B" }),
      wave({ wave_number: 10, instrument_hash: "gc-A" }),
      wave({ wave_number: 9, instrument_hash: "gc-A" }),
    ]);
    // Top wave qualifies but starts fresh under gc-B → streak = 1.
    expect(state.streak).toBe(1);
    expect(state.streak_instrument_hash).toBe("gc-B");
    expect(state.certified).toBe(false);
  });

  it("breaks streak on the first failed wave", () => {
    const state = computeToolCertification("cppa-admt", [
      wave({ wave_number: 10, instrument_hash: "gc-A" }),
      wave({
        wave_number: 9,
        instrument_hash: "gc-A",
        failing_checks: [{ severity: "critical", cross_category: "agree" }],
      }),
      wave({ wave_number: 8, instrument_hash: "gc-A" }),
    ]);
    expect(state.streak).toBe(1);
    expect(state.certified).toBe(false);
  });

  it("reports zero streak for a first-in-list failure", () => {
    const state = computeToolCertification("cppa-admt", [
      wave({ wave_number: 9, gate_v2_pass: false }),
      wave({ wave_number: 8 }),
    ]);
    expect(state.streak).toBe(0);
    expect(state.certified).toBe(false);
    expect(state.next_missing.join(" ")).toContain("gate_v2");
  });

  it("returns sensible defaults when tool has no waves", () => {
    const state = computeToolCertification("cppa-admt", []);
    expect(state.streak).toBe(0);
    expect(state.certified).toBe(false);
    expect(state.next_missing).toEqual(["no waves measured"]);
  });

  it("exposes A5 config: N_docs>=15, replicates>=3, 3 consecutive waves", () => {
    expect(CERTIFICATION_CONFIG.MIN_N_DOCS).toBe(15);
    expect(CERTIFICATION_CONFIG.MIN_REPLICATES).toBe(3);
    expect(CERTIFICATION_CONFIG.REQUIRED_CONSECUTIVE_WAVES).toBe(3);
  });
});
