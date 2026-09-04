// DOC 171 (2026-09-04) — web-twin guard for Syllabus & Record, DPIA. The
// renderer path itself (SyllabusRecordView) is fully generic and already
// covered by the doc170 suite; this test only confirms DPIA is gated in and
// that a persisted DPIA syllabus renders page one without error.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonDocumentView, type SkeletonDocument } from "@/components/reports/SkeletonDocumentView";
import { SR_PRODUCTS } from "@/lib/syllabus-record";

const DOC: SkeletonDocument = {
  title: "Data Protection Impact Assessment",
  syllabus: {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "DATA PROTECTION IMPACT ASSESSMENT · GDPR Art. 35",
    prepared_for: "Acme, Inc.",
    activity: "Shipment-tracking advertising profiles",
    subtitle: "Data protection impact assessment under GDPR Art. 35 · the “Processing”",
    disposition_label: "DETERMINATION",
    disposition: "Approved",
    disposition_tone: "ok",
    paragraph: "Given the noted risks and the mitigating measures, and after the analysis as set forth below, the processing being assessed may proceed as described: all identified residual risks are rated Low or Moderate.",
    rows: [["Risks reviewed", "two risks on the record"], ["Highest residual risk", "Moderate — after the recorded mitigating measures are taken into account"]],
    conditions_heading: "",
    conditions: [],
    key_dates: [],
    record_map: [["A", "Factor, Determination, and Authority Matrix", ""]],
    running_head: "DATA PROTECTION IMPACT ASSESSMENT · ACME, INC.",
  },
  sections: [
    { id: "executive_summary", title: "Executive Summary", paragraphs: [{ kind: "lead", text: "Given the noted risks and the mitigating measures, and after the analysis as set forth below, the processing being assessed may proceed as described: all identified residual risks are rated Low or Moderate." }] },
    { id: "table_of_authorities", title: "Appendix A — Factor, Determination, and Authority Matrix", paragraphs: [{ kind: "skeleton", text: "The table below identifies the factors analyzed." }] },
  ],
};

describe("DOC 171 — Syllabus & Record web twin, DPIA", () => {
  it("gates dpia on the shared product set", () => {
    expect(SR_PRODUCTS.has("dpia")).toBe(true);
  });

  it("renders page one from the DPIA projection without error", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="dpia" />);
    const text = container.textContent ?? "";
    expect(container.querySelector('[data-sr="1"]')).not.toBeNull();
    expect(text).toContain("Prepared for Acme, Inc.");
    expect(text).toContain("DETERMINATION");
    expect(text).toContain("Approved");
    expect(text).toContain("Supporting Assessment Record");
  });

  it("leaves a non-gated product on the existing renderer", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="li_assessment" />);
    expect(container.querySelector('[data-sr="1"]')).toBeNull();
  });
});
