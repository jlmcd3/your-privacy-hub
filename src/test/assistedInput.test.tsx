import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AssistedInput } from "@/components/AssistedInput";
import { EXHIBIT_SENTINEL } from "@/components/ExhibitTextarea";
import { SLOT_WARNING_TEXT, type AssistedInputPill } from "@/config/assistedInput";

const PILLS: AssistedInputPill[] = [
  { id: "a", label: "Alpha", snippet: "Alpha snippet" },
  { id: "b", label: "Beta", snippet: "Beta snippet" },
  { id: "c", label: "Slot", snippet: "Vendor: [N] rows" },
];

function Harness({
  initial = "",
  pills = PILLS,
  useExhibit = false,
  forceSlotWarning,
}: {
  initial?: string;
  pills?: AssistedInputPill[];
  useExhibit?: boolean;
  forceSlotWarning?: boolean;
}) {
  const [v, setV] = React.useState(initial);
  return (
    <AssistedInput
      value={v}
      onChange={setV}
      pills={pills}
      useExhibit={useExhibit}
      forceSlotWarning={forceSlotWarning}
      assertionSlot={<div data-testid="slot">SLOT</div>}
    />
  );
}

describe("AssistedInput — Doc U v2 sec 2.3 + v3.1 AM-2", () => {
  it("appends snippet on first pill tap; adds separator on second", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(ta.value).toBe("Alpha snippet");
    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(ta.value).toBe("Alpha snippet; Beta snippet");
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Beta" })).toHaveAttribute("aria-pressed", "true");
  });

  it("editing past a snippet silently deselects its pill; text kept", () => {
    render(<Harness initial="Alpha snippet" />);
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-pressed", "true");
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "Alpha SNIPP" } });
    expect(ta.value).toBe("Alpha SNIPP");
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-pressed", "false");
  });

  it("tapping a selected pill removes its snippet and tidies separators", () => {
    render(<Harness initial="Alpha snippet; Beta snippet" />);
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(ta.value).toBe("Beta snippet");
    // Remove the last remaining one -> empty.
    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(ta.value).toBe("");
  });

  it("composes with ExhibitTextarea: exhibit sentinel disables pills", () => {
    render(<Harness initial={EXHIBIT_SENTINEL} useExhibit />);
    const alpha = screen.getByRole("button", { name: "Alpha" }) as HTMLButtonElement;
    expect(alpha).toBeDisabled();
    fireEvent.click(alpha);
    // Value is still the sentinel; pill did nothing.
    expect(alpha).toHaveAttribute("aria-pressed", "false");
  });

  it("renders assertion slot below textarea", () => {
    render(<Harness />);
    const slot = screen.getByTestId("slot");
    const ta = screen.getByRole("textbox");
    // slot appears after textarea in document order
    expect(
      ta.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("AM-2(a): appending a slotted snippet focuses and selects the first [N] slot", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Slot" }));
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(ta.value).toBe("Vendor: [N] rows");
    // requestAnimationFrame -> flush.
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    const start = "Vendor: ".length;
    const end = start + "[N]".length;
    expect(ta.selectionStart).toBe(start);
    expect(ta.selectionEnd).toBe(end);
  });

  it("AM-2(b): unresolved [N] slot triggers inline warning on blur", () => {
    render(<Harness initial="Vendor: [N] rows" />);
    expect(screen.queryByRole("alert")).toBeNull();
    const ta = screen.getByRole("textbox");
    fireEvent.blur(ta);
    const warn = screen.getByRole("alert");
    expect(warn.textContent).toBe(SLOT_WARNING_TEXT);
  });

  it("AM-2(b): forceSlotWarning prop triggers warning without blur", () => {
    render(<Harness initial="Vendor: [N] rows" forceSlotWarning />);
    expect(screen.getByRole("alert").textContent).toBe(SLOT_WARNING_TEXT);
  });

  it("AM-2(b): warning does NOT appear once user replaces the slot", () => {
    render(<Harness initial="Vendor: [N] rows" forceSlotWarning />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "Vendor: Acme rows" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("max 6 rule: 7 pills render as 5 inline + More popover", () => {
    const many: AssistedInputPill[] = Array.from({ length: 7 }, (_, i) => ({
      id: `p${i}`,
      label: `Pill ${i}`,
      snippet: `S${i}`,
    }));
    render(<Harness pills={many} />);
    // 5 inline pills
    for (let i = 0; i < 5; i++) {
      expect(screen.getByRole("button", { name: `Pill ${i}` })).toBeInTheDocument();
    }
    // Overflow pills are inside a closed popover, not in DOM yet.
    expect(screen.queryByRole("button", { name: "Pill 5" })).toBeNull();
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });
});
