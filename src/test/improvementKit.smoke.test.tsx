/**
 * Doc N Step 3 — Vitest smoke suite for the Improvement Kit scaffolding.
 *
 * Purpose (scaffolding-only):
 *  1. Flag defaults OFF — production risk assessment renders unchanged.
 *  2. Designated field list is non-empty, unique, and all ids are strings
 *     matching intake-key shape (snake_case, no whitespace).
 *  3. AssertionLevel three-segment control renders the three states and
 *     reveals the four basis chips when "Believed" is selected.
 *  4. AssertionEntry writeback contracts hold (RC-Cleanup2: "unknown" retired):
 *       Confirmed  -> { state:"confirmed", basis:null }
 *       Believed   -> { state:"believed",  basis:null } until a chip is picked
 *       Believed+basis -> { state:"believed", basis:"standard_template"|... }
 *       Believed+Skip  -> { state:"believed", basis:null }
 *       Re-click selected state -> undefined (widget cleared).
 *
 * Non-goals: rendering the full CPPA Risk page, database writes, grader calls.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  IMPROVEMENT_KIT_ENABLED,
  IMPROVEMENT_KIT_DESIGNATED_FIELDS,
  type AssertionEntry,
} from "@/config/improvementKit";
import { AssertionLevel } from "@/components/cppa/AssertionLevel";

describe("Improvement Kit — flag + designated list invariants", () => {
  it("flag defaults OFF (Doc N R6: scaffolding-only deploy)", () => {
    expect(IMPROVEMENT_KIT_ENABLED).toBe(false);
  });

  it("designated field list is non-empty and unique", () => {
    expect(IMPROVEMENT_KIT_DESIGNATED_FIELDS.length).toBeGreaterThan(0);
    const set = new Set(IMPROVEMENT_KIT_DESIGNATED_FIELDS);
    expect(set.size).toBe(IMPROVEMENT_KIT_DESIGNATED_FIELDS.length);
  });

  it("designated ids are snake_case intake-key shape", () => {
    for (const id of IMPROVEMENT_KIT_DESIGNATED_FIELDS) {
      expect(typeof id).toBe("string");
      expect(id).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it("EVIDENCE_MAP key set equality with IMPROVEMENT_KIT_DESIGNATED_FIELDS (Doc P Step 2)", async () => {
    // Import via dynamic path so vitest's Vite resolver picks up the
    // supabase/functions .ts file as plain TypeScript. The file has no
    // Deno-only imports (pure data + a console.warn helper).
    const mod = await import("../../supabase/functions/generate-improvement-kit/evidence-map");
    const mapKeys = Object.keys(mod.EVIDENCE_MAP);
    const designated = [...IMPROVEMENT_KIT_DESIGNATED_FIELDS];
    // Both directions: designated ⊆ map keys AND map keys ⊆ designated.
    for (const id of designated) {
      expect(mapKeys, `designated id ${id} missing from EVIDENCE_MAP`).toContain(id);
    }
    for (const k of mapKeys) {
      expect(designated, `EVIDENCE_MAP key ${k} not in designated list`).toContain(k);
    }
    expect(mapKeys.length).toBe(designated.length);
  });
});

describe("Improvement Kit — AssertionLevel control", () => {
  const setup = (initial?: AssertionEntry) => {
    const onChange = vi.fn();
    render(<AssertionLevel fieldId="i2_retention_period" value={initial} onChange={onChange} />);
    return { onChange };
  };

  it("renders the two state radios and tags the field id (RC-Cleanup2: Unknown retired)", () => {
    setup();
    expect(screen.getByRole("radio", { name: /Confirmed/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Believed/i })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Unknown/i })).toBeNull();
    expect(document.querySelector('[data-assertion-field="i2_retention_period"]')).toBeTruthy();
  });

  it("Confirmed writes { confirmed, null }", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("radio", { name: /Confirmed/i }));
    expect(onChange).toHaveBeenCalledWith({ state: "confirmed", basis: null });
  });

  it("Re-clicking the selected state clears the assertion (widget cleared → backend no-op)", () => {
    const { onChange } = setup({ state: "confirmed", basis: null });
    fireEvent.click(screen.getByRole("radio", { name: /Confirmed/i }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("Believed writes { believed, null } and reveals basis chips", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("radio", { name: /Believed/i }));
    expect(onChange).toHaveBeenCalledWith({ state: "believed", basis: null });
  });

  it("Believed + basis chip writes selected basis", () => {
    const { onChange } = setup({ state: "believed", basis: null });
    fireEvent.click(screen.getByRole("button", { name: /Standard template/i }));
    expect(onChange).toHaveBeenCalledWith({ state: "believed", basis: "standard_template" });

    fireEvent.click(screen.getByRole("button", { name: /Written policy/i }));
    expect(onChange).toHaveBeenCalledWith({ state: "believed", basis: "written_policy" });

    fireEvent.click(screen.getByRole("button", { name: /Standard practice/i }));
    expect(onChange).toHaveBeenCalledWith({ state: "believed", basis: "standard_practice" });
  });

  it("Believed + Skip clears basis back to null", () => {
    const { onChange } = setup({ state: "believed", basis: "written_policy" });
    fireEvent.click(screen.getByRole("button", { name: /^Skip$/i }));
    expect(onChange).toHaveBeenCalledWith({ state: "believed", basis: null });
  });
});
