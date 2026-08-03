import { describe, it, expect } from "vitest";
import { resolveCyberAuthorities, CYBER_COMPONENT_LABELS } from "/dev-server/supabase/functions/run-cppa-cybersecurity/_local/registry/cyber-verified-authorities.ts";
import { makeCorpusProvisionClient, loadCyberProvisionRows } from "/dev-server/src/registry/__tests__/corpus-client";
describe("hydration proof", () => {
  it("resolves live", async () => {
    const rows = await loadCyberProvisionRows();
    expect(rows).toBeTruthy();
    const src = await resolveCyberAuthorities(makeCorpusProvisionClient(rows!) as never);
    console.log("ROWS", Object.keys(src.registry).length, "COMPONENTS", src.components.length, "DEGRADED", src.degraded, "UNRESOLVED", src.unresolved);
    console.log("CITATIONS", JSON.stringify(src.componentCitations, null, 1));
    console.log("SAMPLE", JSON.stringify(src.registry["cyber_c17_incident_response"], null, 1));
    expect(src.degraded).toBe(false);
    expect(CYBER_COMPONENT_LABELS.length).toBe(18);
  }, 60000);
});
