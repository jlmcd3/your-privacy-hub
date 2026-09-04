// DOC 174 (2026-09-04) — web-twin guard for Syllabus & Record, ADMT v2. The
// renderer path itself is fully generic and already covered by the doc170
// suite; this test confirms cppa-admt-v2 is gated in, that a persisted ADMT
// v2 syllabus renders page one without error, and that the cover table the
// syllabus now consumes (surface "header") doesn't repeat in the body.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonDocumentView, type SkeletonDocument } from "@/components/reports/SkeletonDocumentView";
import { SR_PRODUCTS } from "@/lib/syllabus-record";

const DOC: SkeletonDocument = {
  title: "CPPA ADMT Compliance Assessment",
  syllabus: {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "CPPA ADMT COMPLIANCE ASSESSMENT · 11 CCR §§ 7001, 7220–7222",
    prepared_for: "Acme, Inc.",
    activity: "Applicant Scoring Model",
    subtitle: "ADMT compliance assessment under 11 CCR §§ 7001, 7220–7222",
    disposition_label: "OVERALL ASSESSMENT",
    disposition: "Gaps identified",
    disposition_tone: "hi",
    paragraph: "On the Company's reported facts, the System has gaps against the ADMT requirements addressed in this report.",
    rows: [["Record sufficiency", "Complete"], ["Conditions to proceed", "1 of one condition outstanding (Section 8)"]],
    conditions_heading: "CONDITIONS TO PROCEED — the assessment depends on these",
    conditions: [{ name: "Condition 1", text: "Provide the Pre-use Notice before the System is used for a significant decision." }],
    key_dates: [],
    record_map: [["A", "Factor, Determination, and Authority Matrix", ""]],
    running_head: "CPPA ADMT COMPLIANCE ASSESSMENT · ACME, INC.",
  },
  sections: [
    {
      id: "cover",
      title: "Assessment Profile",
      paragraphs: [
        { kind: "table", text: "", table: { surface: "header", title: "", hideHeader: true, columns: ["Report field", "Value"], rows: [["Organization", "Acme, Inc."], ["System reviewed", "Applicant Scoring Model"]] } },
        { kind: "skeleton", text: "Scope of Assessment: This report evaluates the Company's reported practices." },
      ],
    },
    { id: "executive_summary", title: "Executive Summary", paragraphs: [{ kind: "lead", text: "On the Company's reported facts, the System has gaps against the ADMT requirements addressed in this report." }] },
    { id: "appendix_a", title: "Appendix A — Factor, Determination, and Authority Matrix", paragraphs: [{ kind: "skeleton", text: "The table below identifies the factors analyzed." }] },
  ],
};

describe("DOC 174 — Syllabus & Record web twin, ADMT v2", () => {
  it("gates cppa-admt-v2 on the shared product set", () => {
    expect(SR_PRODUCTS.has("cppa-admt-v2")).toBe(true);
  });

  it("renders page one from the ADMT v2 projection without error, and drops the cover table it now consumes", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="cppa-admt-v2" />);
    const text = container.textContent ?? "";
    expect(container.querySelector('[data-sr="1"]')).not.toBeNull();
    expect(text).toContain("Prepared for Acme, Inc.");
    expect(text).toContain("OVERALL ASSESSMENT");
    expect(text).toContain("Gaps identified");
    expect(text).toContain("Supporting Assessment Record");
    // "System reviewed" appears once (page one's activity title), not again
    // in a duplicated cover table.
    expect(text.split("System reviewed").length - 1).toBe(0);
  });

  it("leaves a non-gated product on the existing renderer", () => {
    // DOC 175/177 note: cppa-cyber and ir-playbook joined SR_PRODUCTS after
    // this test was written; biometric is permanently excluded (CEO scope).
    const { container } = render(<SkeletonDocumentView doc={DOC} product="biometric" />);
    expect(container.querySelector('[data-sr="1"]')).toBeNull();
  });
});
