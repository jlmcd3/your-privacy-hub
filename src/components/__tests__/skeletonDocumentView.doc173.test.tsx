// DOC 173 (2026-09-04) — web-twin guard for Syllabus & Record, Governance.
// The renderer path itself is fully generic and already covered by the
// doc170 suite; this test confirms Governance is gated in, that a persisted
// Governance syllabus renders page one without error, and that the
// programme-scoreboard table the syllabus now consumes doesn't repeat in
// the section body (the mirror of the PDF renderer's identical fix).

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonDocumentView, type SkeletonDocument } from "@/components/reports/SkeletonDocumentView";
import { SR_PRODUCTS } from "@/lib/syllabus-record";

const DOC: SkeletonDocument = {
  title: "GDPR Accountability Assessment",
  syllabus: {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "GDPR ACCOUNTABILITY ASSESSMENT · Articles 5(2) and 24(1)",
    prepared_for: "Acme, Inc.",
    activity: "The Accountability Programme",
    subtitle: "Accountability assessment under GDPR Articles 5(2) and 24(1)",
    disposition_label: "DETERMINATION",
    disposition: "Evidenced",
    disposition_tone: "ok",
    paragraph: "Assessed against Articles 5(2) and 24(1), accountability is evidenced on the information provided: Acme, Inc. can demonstrate the compliance those provisions require.",
    rows: [["Duties with an identified supporting artifact", "8 of 8"], ["Article 30(1) elements evidenced", "6 of 7"]],
    conditions_heading: "",
    conditions: [],
    key_dates: [],
    record_map: [],
    running_head: "GDPR ACCOUNTABILITY ASSESSMENT · ACME, INC.",
  },
  sections: [
    {
      id: "executive_summary",
      title: "Executive Summary",
      paragraphs: [
        { kind: "lead", text: "Assessed against Articles 5(2) and 24(1), accountability is evidenced on the information provided: Acme, Inc. can demonstrate the compliance those provisions require." },
        { kind: "skeleton", text: "Article 5(2) of the GDPR makes a controller responsible not only for complying with the data protection principles but for being able to demonstrate that compliance." },
        {
          kind: "table",
          text: "",
          table: { surface: "art30_element_findings+demonstrability_findings+domain_element_findings+remediation_plan", title: "Programme scoreboard", columns: ["Measure", "Count"], hideHeader: true, rows: [["Duties with an identified supporting artifact", "8 of 8"]] },
        },
      ],
    },
  ],
};

describe("DOC 173 — Syllabus & Record web twin, Governance", () => {
  it("gates governance on the shared product set", () => {
    expect(SR_PRODUCTS.has("governance")).toBe(true);
  });

  it("renders page one from the Governance projection without error, and drops the scoreboard table it now consumes", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="governance" />);
    const text = container.textContent ?? "";
    expect(container.querySelector('[data-sr="1"]')).not.toBeNull();
    expect(text).toContain("Prepared for Acme, Inc.");
    expect(text).toContain("DETERMINATION");
    expect(text).toContain("Evidenced");
    // The scoreboard row text appears once (page one), not twice.
    expect(text.split("Duties with an identified supporting artifact").length - 1).toBe(1);
  });

  it("leaves a non-gated product on the existing renderer", () => {
    // DOC 175 note: cppa-cyber joined SR_PRODUCTS after this test was
    // written; ir-playbook remains outside the gate.
    const { container } = render(<SkeletonDocumentView doc={DOC} product="ir-playbook" />);
    expect(container.querySelector('[data-sr="1"]')).toBeNull();
  });
});
