// Doc Q NEGATIVE-CASE PROOF (binding, in addition to Step 2b):
// a re-run whose only prior-report delta is strengthen-item content
// produces ZERO highlights.

import { describe, it, expect } from "vitest";
import { deriveResolveFields } from "@/lib/rerunHighlighting";

describe("Doc Q re-run highlighting -- P3/D5 negative case", () => {
  it("strengthen-only report produces ZERO highlights", () => {
    const report = {
      strengthen_items: [
        { item_id: "S-1", field_ids: ["i2_retention_period"], recorded_basis: "standard_template" },
        { item_id: "S-2", field_ids: ["i6_vendors"], recorded_basis: "written_policy" },
        { item_id: "S-3", field_ids: ["q19_admt_description"], recorded_basis: "standard_practice" },
      ],
      // NO inconsistency_flags, NO information_needed
    };
    const out = deriveResolveFields(report as any);
    expect(out.count).toBe(0);
    expect(out.fieldOrder).toEqual([]);
    expect(out.fields).toEqual({});
  });

  it("empty/null report is safe", () => {
    expect(deriveResolveFields(null).count).toBe(0);
    expect(deriveResolveFields(undefined).count).toBe(0);
    expect(deriveResolveFields({}).count).toBe(0);
  });

  it("inconsistency + information_needed produce expected map (positive control)", () => {
    const report = {
      inconsistency_flags: [
        { id: "C-1", source_fields: ["q18_something", "i5_admt_logic"] },
      ],
      information_needed: [
        { id: "N-1", field: "i2_retention_period" },
      ],
      strengthen_items: [
        { item_id: "S-1", field_ids: ["i6_vendors"] }, // MUST NOT appear
      ],
    };
    const out = deriveResolveFields(report as any);
    expect(out.count).toBe(3);
    expect(out.fieldOrder).toEqual(["q18_something", "i5_admt_logic", "i2_retention_period"]);
    expect(out.fields["i6_vendors"]).toBeUndefined();
    expect(out.fields["q18_something"]).toEqual(["C-1"]);
    expect(out.fields["i2_retention_period"]).toEqual(["N-1"]);
  });
});
