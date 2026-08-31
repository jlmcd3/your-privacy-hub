import { it } from "vitest";
import { SAMPLE_FIXTURES } from "@/lib/sampleFixtures";
import { readIdentity } from "@/lib/sampleDataPackages";
it("dump", () => {
  for (const f of SAMPLE_FIXTURES) {
    const id = readIdentity(f.fixture);
    if (!id.orgs.length) console.log("NO ORG:", f.tool_slug, f.variant, JSON.stringify(id));
  }
});
