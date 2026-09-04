/**
 * DOC 166 (2026-09-04) — RoPA seven-audit / model-vs-law build, intake side.
 *
 * `generate-ropa-document` reads `special_category_basis`, `transfer_destination`
 * and `processor_platform` for every activity, but before doc 166 none of
 * ropa-questions/index.ts's 24 activity templates could ever produce
 * `special_category_basis` or `transfer_destination`, and 17 of 24 templates
 * could never produce `processor_platform` — a required (not "where
 * applicable") Article 30(1)(d) element per REQUIRED_ART30 in
 * ropa-skeleton-assemble.ts.
 *
 * DOC 168 (2026-09-04, CEO options-not-free-text rule) — every Article 30
 * element the law answers by category is now a closed list on EVERY template:
 * recipient categories (30(1)(d)), the third-country gate + country list +
 * mechanism (30(1)(e)), the Art. 9(2)/Art. 10 condition (30(5) limb 3) and the
 * processing regularity (30(5) limb 2). These asserts fail if any of that
 * regresses to free text or drops off a template.
 */
import { describe, it, expect } from "vitest";
import { ROPA_QUESTION_REGISTRY, getQuestionsForActivity } from "@/data/ropa-questions";
import { COUNTRY_NAMES, INTERNATIONAL_ORGANISATION_OPTION } from "@/data/countries";

const ALL_TEMPLATE_KEYS = Object.keys(ROPA_QUESTION_REGISTRY);

function keysFor(templateKey: string): string[] {
  return getQuestionsForActivity(templateKey).map((q) => q.key);
}
function questionOn(templateKey: string, key: string) {
  const q = getQuestionsForActivity(templateKey).find((x) => x.key === key);
  expect(q, `template "${templateKey}" is missing ${key}`).toBeDefined();
  return q!;
}
function optionValues(q: { options?: { value: string }[] }): string[] {
  return (q.options ?? []).map((o) => o.value);
}

const FREE_TEXT_TYPES = new Set(["text_short", "text_long"]);

describe("DOC 166 — every activity template can record every Article 30 required element", () => {
  it("every template asks recipient_categories (the Art. 30(1)(d) element) and its named-processor follow-up", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      expect(keysFor(key), `template "${key}" is missing recipient_categories`).toContain("recipient_categories");
      expect(keysFor(key), `template "${key}" is missing processor_platform`).toContain("processor_platform");
    }
  });

  it("no template asks recipient_categories / processor_platform twice, and the retired uses_processors gate is gone", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      const ks = keysFor(key);
      expect(ks.filter((k) => k === "recipient_categories").length, `template "${key}" duplicates recipient_categories`).toBe(1);
      expect(ks.filter((k) => k === "processor_platform").length, `template "${key}" duplicates processor_platform`).toBe(1);
      expect(ks, `template "${key}" still asks the retired uses_processors gate`).not.toContain("uses_processors");
    }
  });

  it("every template can record special_category_basis — the Art. 30(5) derogation note reads it for every activity", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      expect(keysFor(key), `template "${key}" is missing special_category_basis`).toContain("special_category_basis");
    }
  });
});

describe("DOC 168 — the CEO options rule: elements the law answers by category are closed lists, never free text", () => {
  it("special_category_basis is a required multi-select of Art. 9(2)(a)–(j), Art. 10 and 'none' on every template", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      const q = questionOn(key, "special_category_basis");
      expect(q.type, `template "${key}": special_category_basis must be multi_choice`).toBe("multi_choice");
      expect(q.isRequired, `template "${key}": special_category_basis must be required`).toBe(true);
      const vals = optionValues(q);
      expect(vals).toContain("none");
      for (const letter of "abcdefghij") expect(vals).toContain(`art9_2_${letter}`);
      expect(vals).toContain("art10");
    }
  });

  it("recipient_categories is a required multi-select with a 'none' option and a 'processors' option that gates the named-processor follow-up", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      const q = questionOn(key, "recipient_categories");
      expect(q.type).toBe("multi_choice");
      expect(q.isRequired).toBe(true);
      expect(optionValues(q)).toContain("none");
      expect(optionValues(q)).toContain("processors");
      const follow = questionOn(key, "processor_platform");
      expect(follow.showIf?.questionKey, `template "${key}": processor_platform must be gated on recipient_categories`).toBe("recipient_categories");
      expect(JSON.stringify(follow.showIf)).toContain("processors");
    }
  });

  it("the third-country gate, the country list, the international-organisation name and the mechanism are on every template, in Art. 30(1)(e) order", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      const qs = getQuestionsForActivity(key);
      const idx = (k: string) => qs.findIndex((q) => q.key === k);
      const gate = idx("transfers_third_country");
      const dest = idx("transfer_destination");
      const intl = idx("transfer_international_org");
      const mech = idx("transfer_mechanism");
      expect(gate, `template "${key}" lacks transfers_third_country`).toBeGreaterThanOrEqual(0);
      expect(dest, `template "${key}" lacks transfer_destination`).toBeGreaterThan(gate);
      expect(intl, `template "${key}" lacks transfer_international_org`).toBeGreaterThan(dest);
      expect(mech, `template "${key}" lacks transfer_mechanism`).toBeGreaterThan(intl);
      expect(qs[gate].type).toBe("yes_no");
      expect(qs[gate].isRequired).toBe(true);
    }
  });

  it("transfer_destination is a closed multi-select of every country name plus the international-organisation marker, gated on the third-country gate", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      const q = questionOn(key, "transfer_destination");
      expect(q.type).toBe("multi_choice");
      expect(q.isRequired).toBe(true);
      const vals = optionValues(q);
      expect(vals.length).toBeGreaterThan(150);
      for (const name of COUNTRY_NAMES) expect(vals).toContain(name);
      expect(vals).toContain(INTERNATIONAL_ORGANISATION_OPTION.value);
      expect(q.showIf?.questionKey).toBe("transfers_third_country");
      expect(JSON.stringify(q.showIf)).toContain("yes");
    }
  });

  it("transfer_international_org (the only free-text transfer field: a NAME the law requires) is gated on the marker option", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      const q = questionOn(key, "transfer_international_org");
      expect(q.showIf?.questionKey).toBe("transfer_destination");
      expect(JSON.stringify(q.showIf)).toContain(INTERNATIONAL_ORGANISATION_OPTION.value);
    }
  });

  it("transfer_mechanism is a required single-select (SCCs / adequacy / BCRs / Art. 49 derogation / none), gated on the third-country gate", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      const q = questionOn(key, "transfer_mechanism");
      expect(q.type).toBe("single_choice");
      expect(q.isRequired).toBe(true);
      expect(optionValues(q).sort()).toEqual(["adequacy", "bcrs", "derogations", "none", "sccs"]);
      expect(q.showIf?.questionKey).toBe("transfers_third_country");
    }
  });

  it("processing_regularity (Art. 30(5) 'not occasional' limb) is a required single-select on every template", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      const q = questionOn(key, "processing_regularity");
      expect(q.type).toBe("single_choice");
      expect(q.isRequired).toBe(true);
      expect(optionValues(q).sort()).toEqual(["occasional", "regular", "unsure"]);
    }
  });

  it("none of the category-answerable keys is ever a free-text question on any template", () => {
    const CLOSED = [
      "special_category_basis",
      "recipient_categories",
      "transfers_third_country",
      "transfer_destination",
      "transfer_mechanism",
      "processing_regularity",
    ];
    for (const key of ALL_TEMPLATE_KEYS) {
      for (const q of getQuestionsForActivity(key)) {
        if (CLOSED.includes(q.key)) {
          expect(FREE_TEXT_TYPES.has(q.type), `template "${key}": ${q.key} must not be free text (is ${q.type})`).toBe(false);
        }
      }
    }
  });
});
