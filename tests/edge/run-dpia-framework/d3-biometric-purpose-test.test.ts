// ITEM D-3 (2026-08-28, doc 93 of the spine-vs-prompt comparison program) —
// ART. 9(1) BIOMETRIC PURPOSE TEST. GDPR Art. 9(1) treats biometric data as
// special-category only "for the purpose of uniquely identifying a natural
// person" — unlike health data, which is special-category unconditionally.
// Pins the fix: "Biometric data" is narrowed to special_category:false ONLY
// when the record's free text names a recognised non-identification purpose
// (monitoring/wellness/clinical/safety/ergonomic/performance) and names no
// identification purpose. Every other case — identification purpose named,
// or purpose simply unstated — keeps the pre-fix conservative default
// (special_category:true), and the company's own recorded Art. 9(2)
// condition always wins over the lexicon.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildProcessingInventory } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";

function intakeWith(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    organization_name: "Test Org Ltd",
    jurisdictions: ["EU (GDPR)"],
    data_categories: ["Biometric data"],
    article_9_condition: "",
    description: "",
    purpose: "",
    ...overrides,
  };
}

function biometricItem(intake: Record<string, unknown>) {
  const inv = buildProcessingInventory(intake);
  return inv.data_items.find((d) => d.item === "Biometric data");
}

Deno.test("D-3 — recorded non-identification purpose (wellness monitoring): narrowed to not special-category", () => {
  const item = biometricItem(intakeWith({
    purpose: "Monitoring employee heart rate and gait during shifts for workplace wellness and ergonomic safety.",
  }));
  assertEquals(item?.special_category, false);
  assertEquals(item?.status, "analysed");
  assertEquals(item?.information_needed, undefined);
});

Deno.test("D-3 — recorded identification purpose (facial-recognition login): stays special-category", () => {
  const item = biometricItem(intakeWith({
    purpose: "Facial recognition used for employee login access control at building entrances.",
  }));
  assertEquals(item?.special_category, true);
  assertEquals(item?.status, "record_insufficient");
});

Deno.test("D-3 — both signals present (identification named alongside wellness language): stays special-category", () => {
  const item = biometricItem(intakeWith({
    purpose: "Wellness monitoring of heart rate, and separately, fingerprint match for identity verification at login.",
  }));
  assertEquals(item?.special_category, true);
});

Deno.test("D-3 — purpose unstated: conservative default unchanged (special-category)", () => {
  const item = biometricItem(intakeWith({}));
  assertEquals(item?.special_category, true);
  assertEquals(item?.status, "record_insufficient");
});

Deno.test("D-3 — company's own Art. 9(2) condition always wins over the lexicon", () => {
  const item = biometricItem(intakeWith({
    purpose: "Monitoring gait and posture for ergonomic safety only.",
    article_9_condition: "Explicit consent (Art. 9(2)(a))",
  }));
  assertEquals(item?.special_category, true);
  assertEquals(item?.art9_condition_label, "Explicit consent (Art. 9(2)(a))");
  assertEquals(item?.status, "analysed");
});

Deno.test("D-3 — Health or medical data is unaffected: unconditional special-category regardless of purpose", () => {
  const inv = buildProcessingInventory(intakeWith({
    data_categories: ["Health or medical data"],
    purpose: "Monitoring for workplace wellness only, no identification purpose stated anywhere.",
  }));
  const health = inv.data_items.find((d) => d.item === "Health or medical data");
  assertEquals(health?.special_category, true);
});

Deno.test("D-3 — mixed record: health item stays special-category, narrowed biometric item does not", () => {
  const inv = buildProcessingInventory(intakeWith({
    data_categories: ["Health or medical data", "Biometric data"],
    purpose: "Wellness monitoring of heart rate and temperature during shifts, for ergonomic safety purposes only.",
  }));
  const health = inv.data_items.find((d) => d.item === "Health or medical data");
  const biometric = inv.data_items.find((d) => d.item === "Biometric data");
  assertEquals(health?.special_category, true);
  assertEquals(biometric?.special_category, false);
});
