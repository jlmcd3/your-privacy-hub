// ROPA-1 (2026-08-29, advance-ratification ledger) — the Article 30(2) scope
// statement on processor-role registers.
//
// The intake captures the processor role as a boolean only; Art. 30(2)(a)
// makes each controller's name and contact details a required column of the
// processor-format register, and no intake field carries them. The correct
// document therefore states the format boundary — composed conditionally in
// the assembler, OUTSIDE the byte-pinned docx paragraphs, so
// ROPA_SKELETON_CONTENT_HASH is untouched (pinned below).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ROPA_SKELETON_CONTENT_HASH,
  ROPA_SKELETON_PARAGRAPHS,
} from "../../../supabase/functions/generate-ropa-document/register/ropa.spine.ts";
import {
  assembleRopaRegister,
  checkRegister,
} from "../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const BASE: Bag = {
  organisationName: "Halden Data Services Ltd",
  legalEntityType: "private_limited",
  incorporationJurisdiction: "England and Wales",
  registrationNumber: "09912345",
  registeredAddress: "18 Copperfield Row, London EC1V 4PW",
  isController: true,
  isProcessor: false,
  dpoName: "Ingrid Halden",
  dpoEmail: "dpo@haldendata.example",
  dpoPhone: "",
  euRepName: "",
  euRepEmail: "",
  ukRepName: "",
  ukRepEmail: "",
  homeBase: "EU_EEA",
  employeeBand: "50-249",
  jurisdictionCodes: ["EU"],
  jurisdictionLabels: ["EU GDPR"],
  activities: [],
};

function textFor(over: Bag): string {
  const out = assembleRopaRegister({ ...BASE, ...over } as never) as unknown as Bag;
  return skeletonDocumentToText(out.document as never);
}

const SCOPE_CORE =
  "Article 30(2) prescribes a separate register format for a processor's activities carried out on behalf of each controller";

Deno.test("ROPA-1: a processor-also record carries the Art. 30(2) scope statement with 'also acts'", () => {
  const text = textFor({ isProcessor: true });
  assertStringIncludes(text, "The company has indicated that it also acts as a processor for other organisations.");
  assertStringIncludes(text, SCOPE_CORE);
  assertStringIncludes(text, "does not capture the controllers on whose behalf the company processes");
});

Deno.test("ROPA-1: a processor-only record carries the statement without 'also'", () => {
  const text = textFor({ isController: false, isProcessor: true });
  assertStringIncludes(text, "The company has indicated that it acts as a processor for other organisations.");
  assert(!text.includes("also acts as a processor"), "no 'also' when the company is not a controller");
});

Deno.test("ROPA-1: a controller-only record carries no Art. 30(2) statement", () => {
  const text = textFor({});
  assert(!text.includes("Article 30(2)"), "the scope statement never renders for a controller-only register");
});

Deno.test("ROPA-1: the statement passes the v3 register battery and conformance", () => {
  const out = assembleRopaRegister({ ...BASE, isProcessor: true } as never) as unknown as Bag;
  const text = skeletonDocumentToText(out.document as never);
  assertEquals(checkRegister(text), []);
  assertEquals((out.conformance as Bag).ok, true);
});

Deno.test("ROPA-1: the byte-pinned docx hash basis is untouched", async () => {
  // The scope statement is assembler-composed; the pinned 12 paragraphs and
  // their hash must be exactly what the ratified v3 docx carries.
  assertEquals(ROPA_SKELETON_PARAGRAPHS.length, 12);
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ROPA_SKELETON_PARAGRAPHS.join("\n")),
  );
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assertEquals(hex, ROPA_SKELETON_CONTENT_HASH);
  for (const p of ROPA_SKELETON_PARAGRAPHS) {
    assert(!p.includes("Article 30(2) prescribes"), "the scope statement must never enter the pinned paragraphs");
  }
});
