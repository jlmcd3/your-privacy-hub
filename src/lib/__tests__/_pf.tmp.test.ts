import { it } from "vitest";
import { preflightFixtures } from "@/lib/sampleFixturePreflight";
it("report", () => {
  for (const r of preflightFixtures()) {
    if (!r.ok) console.log(r.label, JSON.stringify(r.issues));
  }
});
