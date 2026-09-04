// DOC 172 (2026-09-04) — web-twin guard for Syllabus & Record, LIA. The
// renderer path itself (SyllabusRecordView) is fully generic and already
// covered by the doc170 suite; this test only confirms LIA is gated in and
// that a persisted LIA syllabus renders page one without error.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonDocumentView, type SkeletonDocument } from "@/components/reports/SkeletonDocumentView";
import { SR_PRODUCTS } from "@/lib/syllabus-record";

const DOC: SkeletonDocument = {
  title: "Legitimate Interests Assessment",
  syllabus: {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "LEGITIMATE INTERESTS ASSESSMENT · Article 6(1)(f)",
    prepared_for: "Acme, Inc.",
    activity: "The Processing Under Assessment",
    subtitle: "Legitimate interests assessment under Article 6(1)(f)",
    disposition_label: "DETERMINATION",
    disposition: "Available",
    disposition_tone: "ok",
    paragraph: "Legitimate interests is available to Acme, Inc. for the processing described, on the facts the company has provided and subject to the conditions recorded below.",
    rows: [["Purpose test", "The identified interest qualifies as legitimate"], ["Necessity test", "The processing is necessary to the identified interest"], ["Balancing test", "Favours the interest pursued"]],
    conditions_heading: "",
    conditions: [],
    key_dates: [["DPO review", "2026-04-09"]],
    record_map: [],
    running_head: "LEGITIMATE INTERESTS ASSESSMENT · ACME, INC.",
  },
  sections: [
    { id: "executive_summary", title: "Executive Summary", paragraphs: [{ kind: "lead", text: "Legitimate interests is available to Acme, Inc. for the processing described, on the facts the company has provided and subject to the conditions recorded below." }] },
  ],
};

describe("DOC 172 — Syllabus & Record web twin, LIA", () => {
  it("gates lia on the shared product set", () => {
    expect(SR_PRODUCTS.has("lia")).toBe(true);
  });

  it("renders page one from the LIA projection without error", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="lia" />);
    const text = container.textContent ?? "";
    expect(container.querySelector('[data-sr="1"]')).not.toBeNull();
    expect(text).toContain("Prepared for Acme, Inc.");
    expect(text).toContain("DETERMINATION");
    expect(text).toContain("Available");
  });

  it("leaves a non-gated product on the existing renderer", () => {
    // DOC 173 note: governance joined SR_PRODUCTS after this test was
    // written; cppa-cyber remains outside the gate as of doc173.
    const { container } = render(<SkeletonDocumentView doc={DOC} product="cppa-cyber" />);
    expect(container.querySelector('[data-sr="1"]')).toBeNull();
  });
});
