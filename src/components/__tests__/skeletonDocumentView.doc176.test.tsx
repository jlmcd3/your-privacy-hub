// DOC 176 (2026-09-04) — web-twin guard for Syllabus & Record, Registration.
// The renderer path itself is fully generic and already covered by the
// doc170 suite; this test confirms "registration" is gated in, that a
// persisted Registration syllabus renders page one without error, and that
// the cover table it consumes (surface "registration_profile") doesn't
// repeat in the body.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonDocumentView, type SkeletonDocument } from "@/components/reports/SkeletonDocumentView";
import { SR_PRODUCTS } from "@/lib/syllabus-record";

const DOC: SkeletonDocument = {
  title: "Registration Assessment",
  syllabus: {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "REGISTRATION ASSESSMENT",
    prepared_for: "Acme, Inc.",
    activity: "Registration and Filing Duties",
    subtitle: "Registration and notification duties across the jurisdictions assessed",
    disposition_label: "OVERALL STATUS",
    disposition: "Engaged",
    disposition_tone: "ok",
    paragraph: "Based on the information supplied, one registration duty attaches to Acme, Inc.",
    rows: [["Jurisdictions assessed", "United States (California)"], ["Registration duties", "one duty attaches"]],
    conditions_heading: "",
    conditions: [],
    key_dates: [["Assessment date", "September 4, 2026"]],
    record_map: [],
    running_head: "REGISTRATION ASSESSMENT · ACME, INC.",
  },
  sections: [
    {
      id: "cover",
      title: "Assessment Profile",
      paragraphs: [
        { kind: "table", text: "", table: { surface: "registration_profile", title: "", hideHeader: true, columns: ["Field", "Value"], rows: [["Organization", "Acme, Inc."], ["Jurisdictions assessed", "United States (California)"]] } },
      ],
    },
    { id: "executive_summary", title: "Executive Summary", paragraphs: [{ kind: "lead", text: "Based on the information supplied, one registration duty attaches to Acme, Inc." }] },
  ],
};

describe("DOC 176 — Syllabus & Record web twin, Registration", () => {
  it("gates registration on the shared product set", () => {
    expect(SR_PRODUCTS.has("registration")).toBe(true);
  });

  it("renders page one from the Registration projection without error, and drops the cover table it now consumes", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="registration" />);
    const text = container.textContent ?? "";
    expect(container.querySelector('[data-sr="1"]')).not.toBeNull();
    expect(text).toContain("Prepared for Acme, Inc.");
    expect(text).toContain("OVERALL STATUS");
    // "Jurisdictions assessed" row value appears once (page one), not again
    // in a duplicated cover table.
    expect(text.split("United States (California)").length - 1).toBe(1);
  });

  it("leaves a non-gated product on the existing renderer", () => {
    // DOC 177 note: ir-playbook joined SR_PRODUCTS after this test was
    // written; biometric is permanently excluded (CEO scope).
    const { container } = render(<SkeletonDocumentView doc={DOC} product="biometric" />);
    expect(container.querySelector('[data-sr="1"]')).toBeNull();
  });
});
