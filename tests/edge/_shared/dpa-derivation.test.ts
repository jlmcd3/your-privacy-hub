// FF-DPA Task 9 — regression suite. Runs the UK derivation matrix and the
// prior 11-case REBUILD-DPA set against the extracted derivation module.
// Deno test — invoke with:
//   deno test --allow-none supabase/functions/_shared/dpa-derivation.test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { detectDocType, frameworkFor } from "../../../supabase/functions/generate-dpa/_local/dpa-derivation.ts";

type Row = { name: string; ctrl: string; proc: string; explicit?: unknown; expected: string; expectedCtrlMapped?: boolean; expectedProcMapped?: boolean };

const UK_MATRIX: Row[] = [
  { name: "UK-only (both parties UK)", ctrl: "United Kingdom", proc: "United Kingdom", expected: "uk", expectedCtrlMapped: true, expectedProcMapped: true },
  { name: "UK + EU → gdpr (QL2-FIX-1 territorial block)", ctrl: "United Kingdom", proc: "Germany", expected: "gdpr" },
  { name: "EU + UK reversed", ctrl: "France", proc: "United Kingdom", expected: "gdpr" },
  { name: "UK + US → uk (cross-border module)", ctrl: "United Kingdom", proc: "California", expected: "uk" },
  { name: "US + UK reversed", ctrl: "Texas", proc: "United Kingdom", expected: "uk" },
  { name: "UK + CA → uk (cross-border module)", ctrl: "United Kingdom", proc: "Canada (federal / PIPEDA)", expected: "uk" },
  { name: "UK + unmapped → uk", ctrl: "United Kingdom", proc: "Atlantis", expected: "uk", expectedCtrlMapped: true, expectedProcMapped: false },
  { name: "UK alias 'uk' → uk", ctrl: "uk", proc: "Great Britain", expected: "uk" },
];

const REBUILD_11: Row[] = [
  { name: "R1  EU-only (DE/FR)",        ctrl: "Germany", proc: "France",                     expected: "gdpr" },
  { name: "R2  EU + US",                ctrl: "Ireland", proc: "California",                 expected: "dual-eu-us" },
  { name: "R3  EU + CA",                ctrl: "Netherlands", proc: "Quebec (Law 25)",        expected: "dual-eu-ca" },
  { name: "R4  US-state only",          ctrl: "California", proc: "Texas",                   expected: "us-state" },
  { name: "R5  Canada only",            ctrl: "Ontario (PHIPA)", proc: "Alberta (PIPA)",     expected: "canada" },
  { name: "R6  Federal US alias",       ctrl: "USA", proc: "New York",                       expected: "us-state" },
  { name: "R7  Canada alias",           ctrl: "canada", proc: "British Columbia",            expected: "canada" },
  { name: "R8  Explicit override wins", ctrl: "Germany", proc: "France", explicit: "us-state", expected: "us-state" },
  { name: "R9  Bad explicit ignored",   ctrl: "Germany", proc: "France", explicit: "foo",     expected: "gdpr" },
  { name: "R10 Non-string explicit ignored", ctrl: "Germany", proc: "France", explicit: 42,   expected: "gdpr" },
  { name: "R11 Both unmapped → gdpr fallback", ctrl: "Atlantis", proc: "Ruritania",           expected: "gdpr", expectedCtrlMapped: false, expectedProcMapped: false },
];

function run(label: string, rows: Row[]) {
  Deno.test(label, () => {
    const table: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      const d = detectDocType(r.ctrl, r.proc, r.explicit);
      table.push({
        case: r.name, ctrl: r.ctrl, proc: r.proc,
        explicit: r.explicit ?? "—",
        docType: d.docType, framework: frameworkFor(d.docType),
        ctrlMapped: d.ctrlMapped, procMapped: d.procMapped,
      });
      assertEquals(d.docType, r.expected, `${r.name}: expected ${r.expected}, got ${d.docType}`);
      if (typeof r.expectedCtrlMapped === "boolean") assertEquals(d.ctrlMapped, r.expectedCtrlMapped, `${r.name}: ctrlMapped`);
      if (typeof r.expectedProcMapped === "boolean") assertEquals(d.procMapped, r.expectedProcMapped, `${r.name}: procMapped`);
    }
    console.log(`\n=== ${label} — final derivation table ===`);
    console.table(table);
  });
}

run("FF-DPA nd6 — UK derivation matrix", UK_MATRIX);
run("REBUILD-DPA — prior 11-case set", REBUILD_11);
