// /all-ptest fixture panel — VALIDATION GATE.
//
// Every panel must hold exactly PANEL_SIZE fixtures that (a) carry the
// metadata the page and the harness read, (b) pass the product's intake
// contract with ZERO violations (not just the harness's blocking subset —
// a "perfect" fixture answers every required field with verbatim options and
// carries no unknown key), (c) name distinct companies, and (d) for the three
// deterministic CPPA engines, generate a document offline without throwing.
//
// Run one product while authoring:
//   deno test --no-check --allow-read --allow-env tests/edge/ptest/panels.test.ts --filter "[cppa-risk]"

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  PANEL_BY_TOOL, PANEL_SIZE, PANEL_TOOL_GEO, PANEL_TOOLS, fixtureJobRows, pickFixtures, seededRandom, type PanelTool,
} from "../../../supabase/functions/_shared/review/panels/index.ts";
import { contractForStressTool, blockingContractViolations, dropBlankMultiValues } from "../../../supabase/functions/run-stress-job/_local/intake-gate.ts";
import { validateIntake } from "../../../supabase/functions/run-stress-job/_local/intake-contracts/validate.ts";
import { ROPA_ACTIVITY_ANSWER_KEYS } from "../../../supabase/functions/run-stress-job/_local/ropa-rows.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { gatherCitations } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-citations.ts";
import { vaRegistryAsProvisions } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-corpus.ts";
import { buildAuthorityExhibit } from "../../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { buildCyberComponentRecommendations, buildCyberNextSteps } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { reviewTextOf } from "../../../supabase/functions/_shared/review/determinism.ts";
import { lintDocument } from "../../../supabase/functions/_shared/review/lint.ts";
import { lintProfileFor } from "../../../supabase/functions/_shared/review/lint-profiles.ts";
import type { RenderedSkeletonDocument } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;
const DATE = "2026-09-14";

/** The intake key that carries the named entity, per tool (must equal fixture.company). */
const COMPANY_KEY: Record<PanelTool, string[]> = {
  "cppa-risk": ["entity_name"],
  "cppa-cyber": ["profile.company_name", "company_name", "entity_name"],
  "cppa-admt": ["organization_name"],
  "dpia": ["organization_name"],
  "lia": ["organization_name"],
  "governance": ["organization_name"],
  "ir-playbook": ["organizationName"],
  "biometric": ["orgName"],
  "dpa": ["entityName"],
  "ropa": ["org_name"],
  "us-notice": ["business_name"],
  "eu-notice": ["controller_name"],
  "registration": ["organization_name"],
};

function readPath(o: unknown, path: string): unknown {
  let cur: unknown = o;
  for (const p of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Bag)[p];
  }
  return cur;
}

async function generates(tool: PanelTool, intake: Bag): Promise<RenderedSkeletonDocument | null> {
  if (tool === "cppa-risk") {
    const gen = await generateCppaRiskReport(intake, { buildStamp: "panel-test", pass1: "deterministic", pass2rEnabled: false, refinementEnabled: false, euCorpus: [], reportDate: DATE });
    return gen.report.skeleton_document as RenderedSkeletonDocument;
  }
  if (tool === "cppa-admt") {
    const computed = computeAdmtV2(intake);
    const citations = gatherCitations(computed.allFindings.map((f) => f.authority).filter(Boolean));
    const exhibit = buildAuthorityExhibit(citations, vaRegistryAsProvisions());
    return assembleAdmtV2Document({ intake, computed, exhibit, organizationName: String(intake.organization_name ?? "").trim(), systemName: String(intake.system_name ?? "").trim() }) as unknown as RenderedSkeletonDocument;
  }
  if (tool === "cppa-cyber") {
    const d = buildCyberDeliverables(intake);
    const recs = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, [], DATE);
    const next = buildCyberNextSteps(recs, String(((intake.profile ?? {}) as Bag).remediation_owner ?? ""));
    const report: Bag = { ...(d as unknown as Bag), authority_exhibit: { entries: [] }, _meta: { internal: { cyber_recommendations: { recommendations: recs, next_steps: next } } } };
    return assembleCyberSkeletonDocumentV4(report, intake, "", DATE).document;
  }
  return null;
}

for (const tool of PANEL_TOOLS) {
  const panel = PANEL_BY_TOOL[tool];

  // AUTHORING GATE: a panel with no fixtures yet is reported, not failed —
  // the tree stays green while panels are being written; a panel with ANY
  // fixture must have exactly PANEL_SIZE and pass every check.
  const authored = panel.length > 0;
  const skip = () => console.log(`  [${tool}] panel not authored yet — 0 of ${PANEL_SIZE}`);

  Deno.test(`panel [${tool}] — exactly ${PANEL_SIZE} fixtures with complete metadata, unique ids, distinct companies, an allowed geo`, () => {
    if (!authored) return skip();
    assertEquals(panel.length, PANEL_SIZE, `${tool}: ${panel.length} fixture(s) authored`);
    const ids = new Set<string>();
    const companies = new Set<string>();
    panel.forEach((f, i) => {
      const nn = String(i + 1).padStart(2, "0");
      assert(f.id.startsWith(`${tool}-p${nn}-`), `${tool}[${i}]: id "${f.id}" must start with ${tool}-p${nn}-`);
      assert(/^[a-z0-9-]+$/.test(f.id), `${f.id}: lower-case slug id`);
      assert(!ids.has(f.id), `${f.id}: duplicate id`); ids.add(f.id);
      assertEquals(f.tool, tool, `${f.id}: tool`);
      assert(f.label.trim().length >= 12, `${f.id}: label`);
      assert(f.company.trim().length >= 4, `${f.id}: company`);
      assert(f.sector.trim().length >= 3, `${f.id}: sector`);
      assert(f.summary.trim().length >= 80, `${f.id}: summary should describe the scenario (≥ 80 chars)`);
      const allowed = PANEL_TOOL_GEO[tool];
      assert(allowed === "both" || allowed === f.geo, `${f.id}: geo ${f.geo} not allowed for ${tool} (${allowed})`);
      const key = companies.has(f.company.toLowerCase());
      assert(!key, `${f.id}: company "${f.company}" already used in this panel — fifteen distinct organisations`);
      companies.add(f.company.toLowerCase());
      assert(f.intake && typeof f.intake === "object" && Object.keys(f.intake).length > 0, `${f.id}: intake`);
      const named = COMPANY_KEY[tool].map((k) => readPath(f.intake, k)).find((v) => typeof v === "string" && v.trim());
      assertEquals(String(named ?? "").trim(), f.company, `${f.id}: the intake's entity name (${COMPANY_KEY[tool].join(" | ")}) must equal fixture.company`);
    });
  });

  Deno.test(`panel [${tool}] — every fixture passes the intake contract with zero violations`, () => {
    if (!authored) return skip();
    const contract = contractForStressTool(tool);
    for (const f of panel) {
      if (contract) {
        const r = validateIntake(contract, dropBlankMultiValues(contract, f.intake));
        assert(r.ok, `${f.id}: ${r.violations.length} contract violation(s):\n  ${r.violations.slice(0, 12).map((v) => `${v.key}: ${v.reason}${v.options ? ` (options: ${v.options.slice(0, 6).join(" | ")}${v.options.length > 6 ? " …" : ""})` : ""}`).join("\n  ")}`);
        assertEquals(blockingContractViolations(tool, f.intake), [], `${f.id}: blocking violations`);
      } else if (tool === "ropa") {
        // No contract: the persona shape run-stress-job's RoPA arm consumes.
        const p = f.intake as Bag;
        for (const k of ["org_name", "sector", "legal_entity_type", "employee_band", "dpo_name", "dpo_email", "rights_handling_process"]) {
          assert(typeof p[k] === "string" && (p[k] as string).trim(), `${f.id}: ropa persona.${k}`);
        }
        const jur = p.jurisdictions as Array<Bag> | undefined;
        assert(Array.isArray(jur) && jur.length >= 1 && jur.every((j) => typeof j.code === "string" && typeof j.name === "string" && typeof j.region === "string"), `${f.id}: jurisdictions [{code,name,region}]`);
        const acts = p.activities as Array<Bag> | undefined;
        assert(Array.isArray(acts) && acts.length >= 4, `${f.id}: at least four processing activities (${acts?.length ?? 0})`);
        for (const a of acts) {
          assert(typeof a.activity_name === "string" && a.activity_name.trim(), `${f.id}: activity_name`);
          assert(typeof a.category === "string" && a.category.trim(), `${f.id}: category`);
          for (const k of ROPA_ACTIVITY_ANSWER_KEYS) {
            const v = a[k];
            assert(v !== undefined && v !== null && !(typeof v === "string" && !v.trim()) && !(Array.isArray(v) && v.length === 0), `${f.id} · ${a.activity_name}: every Art. 30 answer present (${k})`);
          }
        }
      }
    }
  });

  if (tool === "cppa-risk" || tool === "cppa-admt" || tool === "cppa-cyber") {
    Deno.test(`panel [${tool}] — every fixture generates a document offline (deterministic engine) with no new lint defect`, async () => {
      if (!authored) return skip();
      const profile = lintProfileFor(tool)!;
      for (const f of panel) {
        const doc = await generates(tool, f.intake as Bag);
        assert(doc, `${f.id}: no document`);
        const text = reviewTextOf({ skeleton_document: doc }).text;
        assert(text.length > 5_000, `${f.id}: document is implausibly short (${text.length} chars)`);
        const lint = lintDocument(doc!, profile, f.intake as Bag);
        // The one pinned known defect (ADMT access#p2 lead-in) is tolerated; anything else is a fixture that trips a product defect — report it.
        const defects = lint.hits.filter((h) => h.severity === "defect" && !(tool === "cppa-admt" && h.rule === "L-LEADIN" && h.block_key === "access#p2"));
        assertEquals(defects.map((h) => `${h.rule}/${h.check}@${h.block_key}: ${h.quote.slice(0, 80)}`), [], `${f.id}: lint defects on the generated document`);
      }
    });
  }
}

Deno.test("panel — pickFixtures is uniform-ish, seedable and never repeats a fixture within a product", () => {
  if (!PANEL_BY_TOOL["cppa-risk"].length || !PANEL_BY_TOOL["dpia"].length) { console.log("  pick test waits for the cppa-risk and dpia panels"); return; }
  const seeded = pickFixtures(["cppa-risk", "dpia"], 3, seededRandom(42));
  const again = pickFixtures(["cppa-risk", "dpia"], 3, seededRandom(42));
  assertEquals(seeded.map((p) => p.fixture.id), again.map((p) => p.fixture.id));
  for (const tool of ["cppa-risk", "dpia"] as const) {
    const ids = seeded.filter((p) => p.tool === tool).map((p) => p.fixture.id);
    assertEquals(new Set(ids).size, ids.length, `${tool}: distinct picks`);
  }
  const rows = fixtureJobRows("b1", seeded);
  assert(rows.every((r) => r.status === "pending" && typeof r.company_id === "string" && r.fixture_data));
});
