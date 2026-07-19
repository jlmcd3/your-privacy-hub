import { describe, it, expect } from "vitest";
import { enumLabel, humanizeEnum, _labelMapForTest } from "@/lib/enumLabels";

describe("enumLabels", () => {
  it("maps known urgency values", () => {
    expect(enumLabel("urgency", "immediate")).toBe("Immediate action");
    expect(enumLabel("urgency", "this quarter")).toBe("This quarter");
    expect(enumLabel("urgency", "monitor")).toBe("Monitor");
  });

  it("maps run_status", () => {
    expect(enumLabel("run_status", "pending")).toBe("Pending");
    expect(enumLabel("run_status", "in_progress")).toBe("In progress");
    expect(enumLabel("run_status", "canceled")).toBe("Cancelled");
  });

  it("maps tool_type identifiers to catalog names", () => {
    expect(enumLabel("tool_type", "cppa_risk_assessment")).toBe("CPPA Risk Assessment");
    expect(enumLabel("tool_type", "dpia_framework")).toBe("DPIA");
    expect(enumLabel("tool_type", "li_assessment")).toBe("Legitimate Interest Assessment");
  });

  it("falls back to humanized form for unknown values", () => {
    expect(enumLabel("run_status", "quarantined")).toBe("Quarantined");
    expect(enumLabel("tool_type", "brand_new_tool")).toBe("Brand new tool");
    expect(enumLabel("assessment_status", "someCamelValue")).toBe("Some camel value");
  });

  it("handles null / undefined / empty deterministically", () => {
    expect(enumLabel("urgency", null)).toBe("");
    expect(enumLabel("urgency", undefined)).toBe("");
    expect(enumLabel("urgency", "")).toBe("");
    expect(enumLabel("urgency", "   ")).toBe("");
  });

  it("humanizeEnum handles snake, kebab, camel, and mixed", () => {
    expect(humanizeEnum("SNAKE_CASE")).toBe("Snake case");
    expect(humanizeEnum("kebab-case")).toBe("Kebab case");
    expect(humanizeEnum("camelCase")).toBe("Camel case");
    expect(humanizeEnum("dotted.value")).toBe("Dotted value");
    expect(humanizeEnum("")).toBe("");
  });

  it("does not mutate raw enum values (snapshot of registry)", () => {
    // Locks the label registry so copy drift trips CI.
    expect(_labelMapForTest("urgency")).toMatchInlineSnapshot(`
      {
        "immediate": "Immediate action",
        "monitor": "Monitor",
        "this quarter": "This quarter",
        "this-quarter": "This quarter",
      }
    `);
    expect(_labelMapForTest("subscription_tier")).toMatchInlineSnapshot(`
      {
        "annual": "Annual",
        "free": "Free",
        "intelligence_annual": "Intelligence — Annual",
        "intelligence_monthly": "Intelligence — Monthly",
        "monthly": "Monthly",
        "pro_annual": "Professional — Annual",
        "pro_monthly": "Professional — Monthly",
        "professional_annual": "Professional — Annual",
        "professional_monthly": "Professional — Monthly",
      }
    `);
  });
});
