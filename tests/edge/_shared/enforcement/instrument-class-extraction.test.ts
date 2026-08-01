// Cached verification sweep — extraction-schema extension tests.
// Covers: instrument_class controlled vocabulary, evidence-quote grounding,
// and the extended disposition vocabulary, all on the SAME model call.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { constrainedExtract } from "../../../../supabase/functions/_shared/constrained-extraction.ts";

const DOC = [
  "DECISION OF THE SUPERVISORY AUTHORITY",
  "The Authority hereby imposes an administrative fine of EUR 50000 on Acme Ltd",
  "for infringement of artículo 6.1.f) del RGPD.",
  "This decision concludes the proceeding and is a final enforcement decision.",
].join("\n");

function mockAnthropic(payload: Record<string, unknown>) {
  const original = globalThis.fetch;
  globalThis.fetch = ((): Promise<Response> =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          content: [{ text: JSON.stringify(payload) }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
        { status: 200 },
      ),
    )) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

const BASE = {
  apiKey: "test",
  doc: DOC,
  regulator: "AEPD",
  subject: "Acme Ltd",
  decisionDate: "2025-01-01",
  law: "GDPR",
};

Deno.test("instrument_class is accepted when in vocabulary and quote-grounded", async () => {
  const restore = mockAnthropic({
    statutory_provisions: [],
    disposition_type: "administrative_fine",
    disposition_evidence_quote: "imposes an administrative fine of EUR 50000",
    instrument_class: "final_enforcement_decision",
    instrument_class_evidence_quote: "is a final enforcement decision",
    appeal_status: "unknown",
  });
  try {
    const r = await constrainedExtract(BASE);
    assertEquals(r.instrument_class, "final_enforcement_decision");
    assertEquals(r.disposition_type, "administrative_fine");
    assertEquals(
      r.evidence_quotes["instrument_class"],
      "is a final enforcement decision",
    );
  } finally {
    restore();
  }
});

Deno.test("instrument_class is rejected when the evidence quote is not in the document", async () => {
  const restore = mockAnthropic({
    statutory_provisions: [],
    instrument_class: "open_investigation",
    instrument_class_evidence_quote: "the authority has opened an inquiry",
    appeal_status: "unknown",
  });
  try {
    const r = await constrainedExtract(BASE);
    assertEquals(r.instrument_class, null);
  } finally {
    restore();
  }
});

Deno.test("instrument_class is rejected when outside the controlled vocabulary", async () => {
  const restore = mockAnthropic({
    statutory_provisions: [],
    instrument_class: "final decision (freeform)",
    instrument_class_evidence_quote: "is a final enforcement decision",
    appeal_status: "unknown",
  });
  try {
    const r = await constrainedExtract(BASE);
    assertEquals(r.instrument_class, null);
  } finally {
    restore();
  }
});

Deno.test("extended disposition vocabulary accepts court_decision", async () => {
  const restore = mockAnthropic({
    statutory_provisions: [],
    disposition_type: "court_decision",
    disposition_evidence_quote: "DECISION OF THE SUPERVISORY AUTHORITY",
    appeal_status: "unknown",
  });
  try {
    const r = await constrainedExtract(BASE);
    assertEquals(r.disposition_type, "court_decision");
  } finally {
    restore();
  }
});

Deno.test("a non-parseable model response still returns instrument_class: null", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = ((): Promise<Response> =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          content: [{ text: "not json at all" }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
        { status: 200 },
      ),
    )) as typeof fetch;
  try {
    const r = await constrainedExtract(BASE);
    assertEquals(r.instrument_class, null);
    assertEquals(typeof r.parse_error, "string");
  } finally {
    globalThis.fetch = original;
  }
});
