// Pin: engagement-map C1 status derivation fix (Art. 35(3)(b) records).
// Surfaced by CSC detect mode: "Genetic data" in data_categories triggers M1 =
// resolved_met (→ Art. 35(3)(b) in the report body) but the text-pattern check
// in buildDpiaEngagementMap had no looksGenetic fallback, so the engagement map
// returned "not_engaged" for that label — a map/body contradiction.
// Fix: direct label-set check (mirrors DPIA_SPECIAL_CAT_LABELS) as the primary
// gate alongside the retained text-pattern fallbacks.

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildDpiaEngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";

function findEntry(map: ReturnType<typeof buildDpiaEngagementMap>, ruleId: string) {
  return map.entries.find((e) => e.rule_id === ruleId);
}

const LARGE_SCALE_VOLUME = "10,000,000 users nationwide";

Deno.test("Art.35(3)(b) — Genetic data label → engaged (the C1 gap case)", () => {
  const intake = {
    data_categories: ["Genetic data"],
    volume_frequency: LARGE_SCALE_VOLUME,
    article_9_condition: "",   // empty — the gap case
  };
  const map = buildDpiaEngagementMap(intake as any, null);
  const entry = findEntry(map, "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES");
  assertEquals(entry?.status, "engaged", "Genetic data at large scale must be engaged");
});

Deno.test("Art.35(3)(b) — Health / medical data label → engaged", () => {
  const intake = {
    data_categories: ["Health / medical data"],
    volume_frequency: LARGE_SCALE_VOLUME,
    article_9_condition: "",
  };
  const map = buildDpiaEngagementMap(intake as any, null);
  assertEquals(findEntry(map, "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES")?.status, "engaged");
});

Deno.test("Art.35(3)(b) — Biometric data label → engaged", () => {
  const intake = {
    data_categories: ["Biometric data"],
    volume_frequency: LARGE_SCALE_VOLUME,
    article_9_condition: "",
  };
  const map = buildDpiaEngagementMap(intake as any, null);
  assertEquals(findEntry(map, "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES")?.status, "engaged");
});

Deno.test("Art.35(3)(b) — article_9_condition set, no special-cat label → engaged", () => {
  const intake = {
    data_categories: ["Contact details"],
    volume_frequency: LARGE_SCALE_VOLUME,
    article_9_condition: "Article 9(2)(b) — employment law obligation",
    description: "",
    purpose: "",
  };
  const map = buildDpiaEngagementMap(intake as any, null);
  assertEquals(findEntry(map, "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES")?.status, "engaged");
});

Deno.test("Art.35(3)(b) — no special-cat label, no art9, not large scale → not_engaged", () => {
  const intake = {
    data_categories: ["Contact details", "Purchase history"],
    volume_frequency: "approx 500 customers",
    article_9_condition: "",
    description: "Loyalty programme for a small retailer.",
    purpose: "Personalise offers.",
  };
  const map = buildDpiaEngagementMap(intake as any, null);
  assertEquals(findEntry(map, "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES")?.status, "not_engaged");
});

Deno.test("Art.35(3)(b) — special-cat label present but NOT large scale → not_engaged", () => {
  const intake = {
    data_categories: ["Genetic data"],
    volume_frequency: "single patient",
    article_9_condition: "",
    description: "One-off genetic test for a single individual.",
    purpose: "Medical diagnosis.",
  };
  const map = buildDpiaEngagementMap(intake as any, null);
  assertEquals(findEntry(map, "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES")?.status, "not_engaged");
});
