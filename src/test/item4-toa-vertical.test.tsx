// ITEM 4 — FIRST ToA FIX (CEO-directed, 2026-08-15; presentation only).
// Web sentinel: three authorities render as three separate rows, single column.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkeletonDocumentView } from "@/components/reports/SkeletonDocumentView";

const doc = {
  title: "Data Protection Impact Assessment",
  sections: [
    {
      id: "table_of_authorities",
      title: "Authorities Cited",
      paragraphs: [
        {
          kind: "rule",
          text: [
            "Regulations",
            "    GDPR Art. 5(1)(e)",
            "    GDPR Art. 6(1)(f)",
            "    GDPR Art. 35(7)(b)",
          ].join("\n"),
        },
      ],
    },
  ],
};

describe("item 4 — vertical Table of Authorities (web)", () => {
  it("renders one authority per row and never two citations on a line", () => {
    render(<SkeletonDocumentView doc={doc} />);
    const items = screen.getByTestId("toa-list").querySelectorAll("li");
    expect(items.length).toBe(4);
    const authorities = [...items].filter((li) => li.getAttribute("data-toa-heading") === "false");
    expect(authorities.map((li) => li.textContent)).toEqual([
      "GDPR Art. 5(1)(e)",
      "GDPR Art. 6(1)(f)",
      "GDPR Art. 35(7)(b)",
    ]);
    for (const li of items) {
      expect((li.textContent!.match(/GDPR Art\./g) ?? []).length).toBeLessThanOrEqual(1);
    }
  });
});
