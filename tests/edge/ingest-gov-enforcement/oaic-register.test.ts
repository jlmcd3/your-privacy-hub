import {
  parseRegisterDeterminations,
  normalizeEntity,
  datesWithin,
} from "../../../supabase/functions/ingest-gov-enforcement/oaic-register.ts";

const FIXTURE = `
Decision

Commissioner Initiated Investigation into Monash IVF Pty Ltd (Privacy) [2026] AICmr 40 (11 June 2026)

Decision year

11 June 2026

Status

Finalised

[View on Austlii - external site](https://classic.austlii.edu.au/au/cases/cth/AICmr/2026/40.html)

Decision

Commissioner Initiated Investigation into Medmate Australia Pty Ltd (Privacy) [2026] AICmr 41 (11 June 2026)

Decision year

11 June 2026

[View on Austlii - external site](https://classic.austlii.edu.au/au/cases/cth/AICmr/2026/41.html)

Decision

Commissioner Initiated Investigation into Singtel Optus Pty Ltd (Privacy) [2026] AICmr 22 (20 March 2026)

Decision year

20 March 2026

[View on Austlii - external site](https://classic.austlii.edu.au/au/cases/cth/AICmr/2026/22.html)

Decision

Commissioner Initiated Investigation into IRE Pty Ltd (Privacy) [2026] AICmr 24 (1 April 2026)

Decision year

1 April 2026

[View on Austlii - external site](https://classic.austlii.edu.au/au/cases/cth/AICmr/2026/24.html)

Decision

'AXF' and 'AXG' (Privacy) [2025] AICmr 121

Decision year

27 June 2025

[View on AustLii - external site](https://classic.austlii.edu.au/au/cases/cth/AICmr/2025/121.html)
`;

Deno.test("register parser: yields 5 rows with correct citations", () => {
  const rows = parseRegisterDeterminations(FIXTURE);
  if (rows.length !== 5) throw new Error("expected 5, got " + rows.length);
  const cits = rows.map((r) => r.citation);
  const expected = ["[2026] AICmr 40", "[2026] AICmr 41", "[2026] AICmr 22", "[2026] AICmr 24", "[2025] AICmr 121"];
  for (const c of expected) if (!cits.includes(c)) throw new Error("missing " + c);
});

Deno.test("register parser: Monash IVF subject", () => {
  const rows = parseRegisterDeterminations(FIXTURE);
  const monash = rows.find((r) => r.citation === "[2026] AICmr 40")!;
  if (monash.subject !== "Monash IVF Pty Ltd") throw new Error("got: " + monash.subject);
  if (monash.decisionDate !== "2026-06-11") throw new Error("date: " + monash.decisionDate);
  if (!monash.austliiUrl.endsWith("/2026/40.html")) throw new Error("url: " + monash.austliiUrl);
});

Deno.test("register parser: Singtel Optus subject preserved (distinct from White Pages)", () => {
  const rows = parseRegisterDeterminations(FIXTURE);
  const s = rows.find((r) => r.citation === "[2026] AICmr 22")!;
  if (s.subject !== "Singtel Optus Pty Ltd") throw new Error("got: " + s.subject);
});

Deno.test("register parser: anonymised 'AXF' returns subject=null", () => {
  const rows = parseRegisterDeterminations(FIXTURE);
  const a = rows.find((r) => r.citation === "[2025] AICmr 121")!;
  if (a.subject !== null) throw new Error("got: " + a.subject);
});

Deno.test("dedup: Optus 20-Mar vs Optus 15-Jun → NOT same matter (>30 days)", () => {
  // Media row: "Optus" @ 2026-06-15 (White Pages).
  // Register row: "Singtel Optus Pty Ltd" @ 2026-03-20 (AICmr 22).
  // Normalised names both collapse to "singtel optus" vs "optus" — different.
  // Even if we relax to loose match, dates 87d apart > 30d threshold. Distinct.
  const near = datesWithin("2026-03-20", "2026-06-15", 30);
  if (near) throw new Error("must not match: 87 days > 30");
});

Deno.test("dedup: same-day media coverage of a register row IS matched", () => {
  const near = datesWithin("2026-06-11", "2026-06-11", 30);
  if (!near) throw new Error("must match: same day");
});

Deno.test("dedup: entity normalisation strips corporate suffixes", () => {
  if (normalizeEntity("Monash IVF Pty Ltd") !== "monash ivf") throw new Error("Monash");
  if (normalizeEntity("Medmate Australia Pty Ltd") !== "medmate") throw new Error("Medmate: " + normalizeEntity("Medmate Australia Pty Ltd"));
  if (normalizeEntity("American Express Australia Limited") !== "american express") throw new Error("AmEx: " + normalizeEntity("American Express Australia Limited"));
});
