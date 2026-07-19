// WORD-PROMPTS-1 — fixture + content + staleness tests.
//
// These tests lock the guardrails that make the "Convert to Word" prompts
// safe to ship. If any of them fails, do not paper over — read the prompt
// spec in src/data/wordConversionPrompts.ts before editing.

import { describe, it, expect } from "vitest";
import {
  WORD_CONVERSION_PROMPTS,
  WORD_PROMPT_DISCLAIMER,
  getWordConversionPrompt,
  type WordPromptDocumentType,
} from "@/data/wordConversionPrompts";

// The full set of document types that currently expose a PDF download
// surface in the app. Adding a new download surface without a matching
// prompt entry MUST fail this test.
const DOWNLOAD_SURFACES: WordPromptDocumentType[] = [
  "dpa_generator",
  "ir_playbook",
  "dpia_framework",
  "li_assessment",
  "governance_assessment",
  "biometric_checker",
  "cppa_risk",
  "cppa_cybersecurity",
  "cppa_admt",
  "cppa_scope",
  "cppa_suite",
  "registration_assessment",
  "registration_document",
  "ropa_document",
  "us_notice",
  "eu_notice",
];

describe("Word conversion prompts — fixture coverage", () => {
  it("has an entry for every download surface", () => {
    for (const dt of DOWNLOAD_SURFACES) {
      expect(WORD_CONVERSION_PROMPTS[dt], `missing entry: ${dt}`).toBeDefined();
      expect(WORD_CONVERSION_PROMPTS[dt].documentType).toBe(dt);
      expect(WORD_CONVERSION_PROMPTS[dt].prompt.length).toBeGreaterThan(200);
      expect(WORD_CONVERSION_PROMPTS[dt].label.length).toBeGreaterThan(0);
    }
  });

  it("getWordConversionPrompt returns entries by key", () => {
    for (const dt of DOWNLOAD_SURFACES) {
      expect(getWordConversionPrompt(dt).documentType).toBe(dt);
    }
  });

  it("has no orphan entries not in the download-surface list", () => {
    const keys = Object.keys(WORD_CONVERSION_PROMPTS) as WordPromptDocumentType[];
    for (const k of keys) {
      expect(DOWNLOAD_SURFACES).toContain(k);
    }
  });
});

describe("Word conversion prompts — content guardrails", () => {
  const entries = Object.values(WORD_CONVERSION_PROMPTS);

  it.each(entries)("$documentType prompt requires VERBATIM preservation", (entry) => {
    expect(entry.prompt).toMatch(/VERBATIM/);
    expect(entry.prompt.toLowerCase()).toContain("paraphrase");
  });

  it.each(entries)("$documentType prompt requires [EXTRACTION GAP] marker", (entry) => {
    expect(entry.prompt).toContain("[EXTRACTION GAP]");
  });

  it.each(entries)("$documentType prompt requires Word styles / native tables", (entry) => {
    expect(entry.prompt).toMatch(/Heading 1/);
    expect(entry.prompt.toLowerCase()).toContain("word");
  });

  it.each(entries)("$documentType prompt ends with a self-check requirement", (entry) => {
    // The Self-check rule must appear near the end.
    expect(entry.prompt).toMatch(/Self-check/);
    const lastQuarter = entry.prompt.slice(Math.floor(entry.prompt.length * 0.6));
    expect(lastQuarter).toMatch(/Self-check/);
  });

  it.each(entries)("$documentType prompt forbids added content / legal advice", (entry) => {
    expect(entry.prompt.toLowerCase()).toContain("do not add");
    expect(entry.prompt.toLowerCase()).toContain("legal advice");
  });

  it.each(entries)("$documentType prompt forbids extra client-confidential material", (entry) => {
    expect(entry.prompt.toLowerCase()).toContain("confidential");
  });

  it("disclaimer carries the required verification sentence", () => {
    expect(WORD_PROMPT_DISCLAIMER).toContain("Verify citations after conversion.");
    expect(WORD_PROMPT_DISCLAIMER.toLowerCase()).toContain("your own ai tool");
    expect(WORD_PROMPT_DISCLAIMER.toLowerCase()).not.toContain("product deliverable");
  });
});

describe("Word conversion prompts — staleness guard", () => {
  // Each entry declares the structural anchors it targets. Those literal
  // labels MUST appear in the prompt body — so if a courier updates the
  // anchor list (e.g. because the underlying document structure changed),
  // any drift between the anchor list and the prompt body fails here.
  it.each(Object.values(WORD_CONVERSION_PROMPTS))(
    "$documentType anchors appear in prompt body",
    (entry) => {
      expect(entry.structureAnchors.length).toBeGreaterThan(0);
      for (const anchor of entry.structureAnchors) {
        expect(
          entry.prompt.includes(anchor),
          `${entry.documentType} prompt is missing anchor "${anchor}"`,
        ).toBe(true);
      }
    },
  );
});
