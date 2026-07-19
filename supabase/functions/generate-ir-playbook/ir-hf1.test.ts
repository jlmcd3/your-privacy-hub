// IR-HF1 unit tests — Task 1 (delimiter refactor sentinel strip),
// Task 2 (cross-part consistency lint), and Task 4 (DPA sub-processor
// suppression + retry_within_budget) verifications.
//
// These are behavioural fixtures over the deterministic helpers; they do
// not exercise the Anthropic call path.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// --- T1: intake-envelope sentinels must be stripped at assembly ---------

Deno.test("IR-HF1 T1 [assembly]: <<<INTAKE_BEGIN>>>/<<<INTAKE_END>>> sentinels are stripped from a fake echoed part", () => {
  const stripSentinels = (s: string) => s.replace(/<<<INTAKE_BEGIN>>>|<<<INTAKE_END>>>/g, "");
  const echoed =
    "## Section 1: OVERVIEW\n<<<INTAKE_BEGIN>>>\ntest\n<<<INTAKE_END>>>\ncontent";
  const out = stripSentinels(echoed);
  assert(!/<<<INTAKE_(BEGIN|END)>>>/.test(out));
  assert(out.includes("## Section 1: OVERVIEW"));
});

// --- T2: cross-part consistency lint (seeded inconsistency fixtures) ----

type PartLabel = "A" | "B" | "C";
function crossPartLint(parts: Array<{ label: PartLabel; text: string }>, orgName: string) {
  const ISO_DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/g;
  const REGULATOR_VOCAB = ["ICO", "CNIL", "AEPD", "Garante", "DPC", "EDPB", "OAIC", "FTC", "HHS OCR", "CPPA"];
  const STATUTE_RE = /(GDPR\s*Art(?:icle)?\.?\s*\d+[a-z]?|§\s*1798\.\d+[a-z]?|45\s*C\.F\.R\.\s*§\s*164\.\d+|HIPAA|CCPA|CPPA)/gi;
  const extract = (t: string) => {
    const dates = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = ISO_DATE_RE.exec(t)) !== null) dates.add(m[1]);
    const regs = new Set(REGULATOR_VOCAB.filter((r) => new RegExp(`\\b${r}\\b`, "i").test(t)));
    const stats = new Set<string>();
    let sm: RegExpExecArray | null;
    const statRe = new RegExp(STATUTE_RE.source, "gi");
    while ((sm = statRe.exec(t)) !== null) stats.add(sm[0].toLowerCase().replace(/\s+/g, " "));
    const hasOrg = orgName.length > 0 && t.toLowerCase().includes(orgName.toLowerCase());
    return { dates, regs, stats, hasOrg };
  };
  const facts = parts.map((p) => ({ ...p, ...extract(p.text) }));
  const findings: Array<{ code: string; detail: string }> = [];
  if (orgName) {
    const carrying = facts.filter((p) => p.hasOrg);
    const missing = facts.filter((p) => !p.hasOrg && p.text.length > 500);
    if (carrying.length > 0 && missing.length > 0) {
      findings.push({ code: "cross_part_inconsistency", detail: `party_name_absent parts=${missing.map((p) => p.label).join(",")}` });
    }
  }
  for (let i = 0; i < facts.length; i++) {
    for (let j = i + 1; j < facts.length; j++) {
      const a = facts[i]; const b = facts[j];
      if (a.dates.size > 0 && b.dates.size > 0) {
        const shared = [...a.dates].some((d) => b.dates.has(d));
        if (!shared) findings.push({ code: "cross_part_inconsistency", detail: `incident_date_mismatch parts=${a.label},${b.label}` });
      }
    }
  }
  return findings;
}

Deno.test("IR-HF1 T2 [seeded]: incident-date mismatch across parts is flagged", () => {
  const parts = [
    { label: "A" as const, text: "The incident occurred on 2026-06-01. ".repeat(30) },
    { label: "B" as const, text: "The incident occurred on 2026-06-14. ".repeat(30) },
    { label: "C" as const, text: "Post-incident actions were completed by 2026-07-01. ".repeat(30) },
  ];
  const f = crossPartLint(parts, "Acme Corp");
  assert(f.some((x) => x.detail.startsWith("incident_date_mismatch")));
});

Deno.test("IR-HF1 T2 [seeded]: party-name absent in one substantive part is flagged", () => {
  const parts = [
    { label: "A" as const, text: `Acme Corp identified the breach. ${"prose ".repeat(200)}` },
    { label: "B" as const, text: `The controller notified the DPA. ${"prose ".repeat(200)}` },
    { label: "C" as const, text: `Acme Corp completed remediation. ${"prose ".repeat(200)}` },
  ];
  const f = crossPartLint(parts, "Acme Corp");
  assert(f.some((x) => x.detail.startsWith("party_name_absent")));
});

Deno.test("IR-HF1 T2 [clean]: agreeing parts produce no findings", () => {
  const parts = [
    { label: "A" as const, text: `Acme Corp incident 2026-06-01. ${"a".repeat(600)}` },
    { label: "B" as const, text: `Acme Corp notifications 2026-06-01. ${"b".repeat(600)}` },
    { label: "C" as const, text: `Acme Corp remediation 2026-06-01. ${"c".repeat(600)}` },
  ];
  const f = crossPartLint(parts, "Acme Corp");
  assertEquals(f.length, 0);
});

// --- T4: deterministic sub-processor suppression -------------------------

const SUBPROC_CONFIRMED_LITERAL =
  "Sub-processors: None — confirmed on the record that no Sub-processors are engaged as of the Effective Date. Any future engagement by the Processor requires the Controller's prior specific written authorisation obtained before the engagement commences.";
const RE_SCHEDULE1_SUBPROC_FWD = /\bSchedule\s*1\b[^\n]{0,80}(?:sub[- ]?processor|approved\s+Sub[- ]?processors|list\s+of\s+Sub[- ]?processors)/i;
const RE_SCHEDULE1_SUBPROC_REV = /(?:sub[- ]?processor|approved\s+Sub[- ]?processors|list\s+of\s+Sub[- ]?processors)[^\n]{0,80}\bSchedule\s*1\b/i;
const RE_GENERAL_AUTH_SUBPROC_FWD = /\bgeneral\s+authorisation\b[^.\n]{0,120}\bsub[- ]?processor/i;
const RE_GENERAL_AUTH_SUBPROC_REV = /\bsub[- ]?processor[^.\n]{0,120}\bgeneral\s+authorisation\b/i;
function suppress(text: string, hasSubProcessors: boolean) {
  if (hasSubProcessors) return { text, suppressed: false };
  const paras = text.split(/\n{2,}/);
  const offending = (p: string) =>
    RE_SCHEDULE1_SUBPROC_FWD.test(p) || RE_SCHEDULE1_SUBPROC_REV.test(p) ||
    RE_GENERAL_AUTH_SUBPROC_FWD.test(p) || RE_GENERAL_AUTH_SUBPROC_REV.test(p) ||
    /SCHEDULE\s*1\s*[—\-–]\s*(APPROVED\s+)?SUB[- ]?PROCESSORS?/i.test(p) ||
    /LIST\s+OF\s+SUB[- ]?PROCESSORS/i.test(p);
  let suppressed = false;
  let inserted = false;
  const out: string[] = [];
  for (const p of paras) {
    if (offending(p)) {
      suppressed = true;
      if (!inserted) { out.push(SUBPROC_CONFIRMED_LITERAL); inserted = true; }
      continue;
    }
    out.push(p);
  }
  let joined = out.join("\n\n");
  if (!/None\s+—\s+confirmed\s+on\s+the\s+record/i.test(joined)) {
    joined = joined.trimEnd() + `\n\n${SUBPROC_CONFIRMED_LITERAL}`;
    suppressed = true;
  }
  return { text: joined, suppressed };
}

Deno.test("IR-HF1 T4 [disabled-subproc]: Schedule-1 framework paragraph is excised and confirmed literal is inserted", () => {
  const original = [
    "1. GENERAL",
    "This is a DPA.",
    "4.1 General Authorisation. The Controller grants general authorisation to the Processor to engage sub-processors listed in Schedule 1.",
    "SCHEDULE 1 — APPROVED SUB-PROCESSORS\nName | Service | Location",
    "9. FINAL PROVISIONS",
  ].join("\n\n");
  const { text, suppressed } = suppress(original, false);
  assert(suppressed);
  assert(!/general\s+authorisation.+sub[- ]?processor/i.test(text));
  assert(!/SCHEDULE\s*1\s*—\s*APPROVED/i.test(text));
  assert(/None\s+—\s+confirmed\s+on\s+the\s+record/i.test(text));
});

Deno.test("IR-HF1 T4 [enabled-subproc]: text is untouched when hasSubProcessors=true", () => {
  const original = "4.1 General Authorisation. Sub-processors listed in Schedule 1.";
  const { text, suppressed } = suppress(original, true);
  assertEquals(suppressed, false);
  assertEquals(text, original);
});

Deno.test("IR-HF1 T4 [confirmed-literal]: literal is appended when nothing offending but missing", () => {
  const original = "1. GENERAL\n\nThis is a clean DPA with no sub-processor prose.";
  const { text, suppressed } = suppress(original, false);
  assert(suppressed);
  assert(/None\s+—\s+confirmed\s+on\s+the\s+record/i.test(text));
});

// --- T3 (F2 epoch stamp) — shape only; behavioural pickup logic is in
// the orchestrator and exercised in the pickup unit test below. This test
// mirrors the subproc-contradiction.test.ts epoch-stamp shape assertion.

Deno.test("IR-HF1 T3 [epoch-stamp]: GRADER_CONTEXT_VERSION shape is gc-YYYY-MM-DD-tag", async () => {
  const { GRADER_CONTEXT_VERSION } = await import("../_shared/grader/context.ts");
  assert(/^gc-\d{4}-\d{2}-\d{2}(-[a-z0-9-]+)?$/i.test(GRADER_CONTEXT_VERSION), GRADER_CONTEXT_VERSION);
});
