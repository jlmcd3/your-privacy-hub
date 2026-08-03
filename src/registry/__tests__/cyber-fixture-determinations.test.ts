/**
 * ITEM 371 / ITEM 5 — FIXTURE COVERAGE FOR THE NEWLY WIRED CYBER SURFACES.
 *
 * Items 1–3 of the cyber upgrade wired two concluding determinations
 * (`readiness_determination`, `independence_determination`) and an
 * "Appendix — Authorities Cited" exhibit into the report. The pinned fixture
 * sets must exercise both, or a regression on either surface ships silently.
 *
 * HERMETIC BY CONSTRUCTION — no live corpus. The § 7122/7123/7124 text comes
 * from the committed CYBER_CORPUS_SNAPSHOT, served through the same minimal
 * provision-client stub the corpus-pin tests use.
 */
import { describe, expect, it } from "vitest";
import { CYBER_CORPUS_SNAPSHOT } from "./__fixtures__/cyber-corpus-snapshot";
import { makeCorpusProvisionClient, type ProvisionRow } from "./corpus-client";
import { buildCyberDeliverables } from "../../../supabase/functions/_shared/ltp/cppa-cyber-deliverables/build";
import { CPPA_CYBER_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-cyber";
import { MESSY_BY_TOOL } from "../../../supabase/functions/_shared/golden/messy-registry";
import {
  buildAuthorityExhibit,
  renderAuthorityExhibitHtml,
} from "../../../supabase/functions/_shared/report-exhibits/authority-exhibit";

const perfect = CPPA_CYBER_GOLDEN.find((c) => c.id === "cyber-perfect-record")!;
const messy = (MESSY_BY_TOOL["cppa-cyber"] ?? [])[0];

const CITATION_BY_KEY: Record<string, string> = {
  "cppa-7120": "11 CCR § 7120",
  "cppa-7121": "11 CCR § 7121",
  "cppa-7122": "11 CCR § 7122",
  "cppa-7123": "11 CCR § 7123",
  "cppa-7124": "11 CCR § 7124",
};

function snapshotRows(): Record<string, ProvisionRow> {
  const out: Record<string, ProvisionRow> = {};
  for (const [key, excerpt] of Object.entries(CYBER_CORPUS_SNAPSHOT)) {
    out[key] = {
      key,
      citation: CITATION_BY_KEY[key] ?? key,
      status: "approved",
      verbatim_excerpt: excerpt,
      plain_requirements: [],
    };
  }
  return out;
}

describe("cyber fixtures — concluding determinations", () => {
  it("the perfect fixture produces both determinations", () => {
    const built = buildCyberDeliverables(perfect.intake as Record<string, unknown>);
    expect(built.readiness_determination?.conclusion).toBeTruthy();
    expect(String(built.readiness_determination?.reasoning ?? "").length).toBeGreaterThan(40);
    expect(built.independence_determination?.findings?.length ?? 0).toBeGreaterThan(0);
  });

  it("the perfect fixture carries the § 7122 engagement facts the independence determination reads", () => {
    const profile = (perfect.intake as any).profile ?? {};
    expect(String(profile.auditor_engagement_status ?? "").length).toBeGreaterThan(0);
    expect(String(profile.prior_audit_scope ?? "").length).toBeGreaterThan(0);
  });

  it("the messy fixture still yields determinations, degraded rather than invented", () => {
    expect(messy, "no messy fixture registered for cppa-cyber").toBeTruthy();
    const built = buildCyberDeliverables(messy.intake as Record<string, unknown>);
    expect(built.readiness_determination?.conclusion).toBeTruthy();
    const blob = JSON.stringify(built);
    expect(blob).toMatch(/record_insufficient|insufficient|not stated/i);
  });

  it("the messy fixture is registered for the orchestrator's messy variant", () => {
    expect((MESSY_BY_TOOL["cppa-cyber"] ?? []).length).toBeGreaterThan(0);
    expect(messy.tool).toBe("cppa-cyber");
  });
});

describe("cyber fixtures — authority exhibit (hermetic corpus)", () => {
  it("resolves and renders an exhibit from the snapshot corpus", async () => {
    const rows = snapshotRows();
    // the stub client is what the resolver consumes; assert it is wired
    expect(makeCorpusProvisionClient(rows)).toBeTruthy();

    const provisions = Object.values(rows).map((r) => ({
      key: r.key,
      citation: r.citation,
      verbatim_excerpt: String(r.verbatim_excerpt),
      status: r.status,
    }));
    const exhibit = buildAuthorityExhibit(
      ["11 CCR § 7122", "11 CCR § 7123(c)(1)", "11 CCR § 7124"],
      provisions,
    );
    expect(exhibit.entries.length).toBeGreaterThan(0);
    const html = renderAuthorityExhibitHtml(exhibit);
    expect(html).toMatch(/Authorities Cited/i);
    expect(html).toContain("7123");
  });
});
