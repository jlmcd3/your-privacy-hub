// LEDGER B5-6 — source-text overwrite guard. Pins all three rejection
// conditions plus the legitimate-replacement case.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BOT_CHECK_MARKERS,
  evaluateSourceTextReplacement,
  isBotGatedSourceHost,
  MIN_SOURCE_TEXT_CHARS,
} from "../../../supabase/functions/fetch-and-extract-primary-source/_local/text-guard.ts";

const longDoc = (n: number, seed = "Décision de la formation restreinte. ") =>
  seed.repeat(Math.ceil(n / seed.length)).slice(0, n);

Deno.test("(a) shorter than existing text is rejected", () => {
  const v = evaluateSourceTextReplacement(longDoc(5_000), longDoc(50_000));
  assertEquals(v.ok, false);
  assertEquals((v as { reason: string }).reason.startsWith("text_shorter_than_stored"), true);
});

Deno.test("(b) under 2,000 characters is rejected", () => {
  const v = evaluateSourceTextReplacement(longDoc(MIN_SOURCE_TEXT_CHARS - 1), "");
  assertEquals(v.ok, false);
  assertEquals((v as { reason: string }).reason.startsWith("text_too_short"), true);
});

Deno.test("(c) every bot-check / search-page marker is rejected even at full length", () => {
  for (const marker of BOT_CHECK_MARKERS) {
    const text = `${longDoc(90_000)} ${marker.toUpperCase()} ${longDoc(10_000)}`;
    const v = evaluateSourceTextReplacement(text, longDoc(1_000));
    assertEquals(v.ok, false, `marker not caught: ${marker}`);
    assertEquals((v as { reason: string }).reason.startsWith("bot_check_or_search_page"), true);
  }
});

Deno.test("the observed damage cases are all rejected", () => {
  // CNIL rows from Legifrance.
  assertEquals(
    evaluateSourceTextReplacement("Title: Just a moment... Performing security verification", longDoc(80_000)).ok,
    false,
  );
  // Bonne Terre.
  assertEquals(evaluateSourceTextReplacement("Comprueba que no eres un robot", longDoc(40_000)).ok, false);
  // Reddit BV — 37-char search page title.
  assertEquals(evaluateSourceTextReplacement("Rechtspraak.nl - Zoeken in uitspraken", longDoc(40_000)).ok, false);
});

Deno.test("a genuine longer document is accepted, first fetch included", () => {
  assertEquals(evaluateSourceTextReplacement(longDoc(300_000), longDoc(60_000)).ok, true);
  assertEquals(evaluateSourceTextReplacement(longDoc(9_000), null).ok, true);
  assertEquals(evaluateSourceTextReplacement(longDoc(9_000), longDoc(9_000)).ok, true);
});

Deno.test("legifrance is flagged as bot-gated; cnil.fr is not", () => {
  assertEquals(isBotGatedSourceHost("https://www.legifrance.gouv.fr/cnil/id/CNILTEXT000012"), true);
  assertEquals(isBotGatedSourceHost("https://www.cnil.fr/fr/deliberation-x"), false);
  assertEquals(isBotGatedSourceHost(null), false);
});
