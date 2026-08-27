// S-P2 (doc 80, 2026-08-27) — the Article 30(5) informational note.
// The note never suppresses the register; it states the derogation's shape,
// determines the special-category exception from the register's own
// special_category_basis answers, and is honest about the facts the
// register does not record (headcount, regularity).

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  art305NoteHtml,
  buildArt305Note,
  specialCategoryActivities,
} from "../../../supabase/functions/generate-ropa-document/register/art305-note.ts";

const ACTS = [
  { id: "a1", display_name: "Payroll" },
  { id: "a2", display_name: "Occupational health records" },
];

const esc = (s: unknown) => String(s ?? "");

Deno.test("S-P2 — a special-category basis on any activity makes the obligation determinate regardless of size", () => {
  const note = buildArt305Note(ACTS, {
    a1: { special_category_basis: "" },
    a2: { special_category_basis: "Art. 9(2)(b) employment law" },
  });
  assertStringIncludes(note.body, "does not turn on headcount alone");
  assertStringIncludes(note.body, "Occupational health records");
  assertStringIncludes(note.body, "regardless of its size");
});

Deno.test("S-P2 — with no special-category basis the note states the derogation honestly, without guessing headcount", () => {
  const note = buildArt305Note(ACTS, {
    a1: { special_category_basis: "None" },
    a2: { special_category_basis: "—" },
  });
  assertStringIncludes(note.body, "fewer than 250 persons");
  assertStringIncludes(note.body, "which this register does not record");
  assertStringIncludes(note.body, "good practice");
  assert(!note.body.includes("regardless of its size"));
});

Deno.test("S-P2 — negation-style answers never count as a special-category basis", () => {
  const hits = specialCategoryActivities(ACTS, {
    a1: { special_category_basis: "Not applicable" },
    a2: { special_category_basis: "n/a" },
  });
  assert(hits.length === 0);
});

Deno.test("S-P2 — the HTML wrapper carries the heading and body", () => {
  const html = art305NoteHtml(ACTS, { a2: { special_category_basis: "Art. 9(2)(h)" } }, esc);
  assertStringIncludes(html, "Article 30(5) note");
  assertStringIncludes(html, "art305-note");
});
