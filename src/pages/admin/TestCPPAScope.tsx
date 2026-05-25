// Frontend-only test for CPPA Scope Checker determination logic.
// Replicates the logic in src/pages/CPPAScopeChecker.tsx (not exported).
import { useMemo } from "react";
import Navbar from "@/components/Navbar";

type Answers = {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  q7: string;
  q8: string;
};

function determine(a: Answers) {
  const inScope =
    (a.q1 === "Yes" || a.q1 === "Unsure") &&
    (["$25M–$100M", "$100M–$500M", "Over $500M"].includes(a.q2) ||
      a.q2 === "Unsure" ||
      ["100,000–1 million", "Over 1 million"].includes(a.q3) ||
      a.q3 === "Unsure" ||
      [
        "Yes — we sell PI",
        "Yes — we share for targeted/behavioural advertising",
        "Both",
      ].includes(a.q4) ||
      a.q5 === "Yes");

  const cyberAuditRequired = ["$100M–$500M", "Over $500M"].includes(a.q2);
  const admtRequired = ["Yes", "In evaluation", "Unsure"].includes(a.q7);
  const sensitiveRequired = a.q6 === "Yes" || a.q6 === "Unsure";
  const dataBrokerRequired =
    a.q8 === "No — we buy or sell PI without a direct consumer relationship";
  const riskAssessmentRequired = inScope;
  const hasUnsure = [a.q1, a.q2, a.q3, a.q4, a.q5, a.q6, a.q7].includes("Unsure");
  const isGeoOut = !inScope && a.q1 === "No";
  const isThresholdOut = !inScope && a.q1 !== "No";

  return {
    inScope,
    cyberAuditRequired,
    admtRequired,
    sensitiveRequired,
    dataBrokerRequired,
    riskAssessmentRequired,
    hasUnsure,
    isGeoOut,
    isThresholdOut,
  };
}

type Scenario = {
  name: string;
  input: Answers;
  expect: (r: ReturnType<typeof determine>) => { passed: boolean; details: string[] };
};

const SCENARIOS: Scenario[] = [
  {
    name: "1 — Large enterprise, all in scope",
    input: {
      q1: "Yes",
      q2: "Over $500M",
      q3: "Over 1 million",
      q4: "Both",
      q5: "No",
      q6: "Yes",
      q7: "Yes",
      q8: "No — we don't buy or sell PI",
    },
    expect: (r) => {
      const checks = [
        ["IN SCOPE", r.inScope === true],
        ["Risk Assessment Required", r.riskAssessmentRequired === true],
        ["Cybersecurity Audit Required (revenue > $100M)", r.cyberAuditRequired === true],
        ["ADMT Required", r.admtRequired === true],
      ] as const;
      return {
        passed: checks.every(([, ok]) => ok),
        details: checks.map(([l, ok]) => `${ok ? "✅" : "❌"} ${l}`),
      };
    },
  },
  {
    name: "2 — Small business, out of scope",
    input: {
      q1: "Yes",
      q2: "Under $25 million",
      q3: "Fewer than 100,000",
      q4: "No",
      q5: "No",
      q6: "No",
      q7: "No",
      q8: "No — we don't buy or sell PI",
    },
    expect: (r) => {
      const checks = [
        ["OUT OF SCOPE", r.inScope === false],
        ["Reason: thresholds (not geo)", r.isThresholdOut === true && r.isGeoOut === false],
      ] as const;
      return {
        passed: checks.every(([, ok]) => ok),
        details: checks.map(([l, ok]) => `${ok ? "✅" : "❌"} ${l}`),
      };
    },
  },
  {
    name: "3 — Volume threshold only",
    input: {
      q1: "Yes",
      q2: "$25M–$100M",
      q3: "100,000–1 million",
      q4: "Yes — we share for targeted/behavioural advertising",
      q5: "No",
      q6: "No",
      q7: "No",
      q8: "No — we don't buy or sell PI",
    },
    expect: (r) => {
      const checks = [
        ["IN SCOPE", r.inScope === true],
        ["Cybersecurity Audit NOT required (sub-$100M)", r.cyberAuditRequired === false],
        ["ADMT NOT required (q7=No)", r.admtRequired === false],
      ] as const;
      return {
        passed: checks.every(([, ok]) => ok),
        details: checks.map(([l, ok]) => `${ok ? "✅" : "❌"} ${l}`),
      };
    },
  },
  {
    name: "4 — Not in California",
    input: {
      q1: "No",
      q2: "Over $500M",
      q3: "Over 1 million",
      q4: "Both",
      q5: "Yes",
      q6: "Yes",
      q7: "Yes",
      q8: "Yes",
    },
    expect: (r) => {
      const checks = [
        ["OUT OF SCOPE", r.inScope === false],
        ["Reason: geographic (q1=No)", r.isGeoOut === true],
      ] as const;
      return {
        passed: checks.every(([, ok]) => ok),
        details: checks.map(([l, ok]) => `${ok ? "✅" : "❌"} ${l}`),
      };
    },
  },
  {
    name: "5 — Revenue from sale of PI threshold",
    input: {
      q1: "Yes",
      q2: "Under $25 million",
      q3: "Fewer than 100,000",
      q4: "No",
      q5: "Yes",
      q6: "No",
      q7: "No",
      q8: "Yes",
    },
    expect: (r) => {
      const checks = [
        ["IN SCOPE (50%+ revenue from data sales)", r.inScope === true],
      ] as const;
      return {
        passed: checks.every(([, ok]) => ok),
        details: checks.map(([l, ok]) => `${ok ? "✅" : "❌"} ${l}`),
      };
    },
  },
];

export default function TestCPPAScope() {
  const results = useMemo(
    () =>
      SCENARIOS.map((s) => {
        const determination = determine(s.input);
        const verdict = s.expect(determination);
        return { ...s, determination, verdict };
      }),
    []
  );

  const passCount = results.filter((r) => r.verdict.passed).length;

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: CPPA Scope Checker (frontend logic)</h1>
          <p className="text-sm text-muted-foreground">
            Pure-frontend determination — no AI, no edge function, no API cost.
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="font-mono text-sm">
            Status: <strong>{passCount === SCENARIOS.length ? "ALL PASS" : "FAILURES"}</strong> —{" "}
            {passCount}/{SCENARIOS.length} scenarios passed
          </div>
        </div>

        {results.map((r, i) => (
          <div key={i} className="border rounded-lg p-4 bg-card space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-serif">
                {r.verdict.passed ? "✅" : "❌"} Scenario {r.name}
              </h2>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  r.determination.inScope
                    ? "bg-red-100 text-red-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {r.determination.inScope ? "IN SCOPE" : "OUT OF SCOPE"}
                {r.determination.isGeoOut ? " (geographic)" : ""}
                {r.determination.isThresholdOut ? " (thresholds)" : ""}
              </span>
            </div>

            <ul className="text-sm space-y-1">
              {r.verdict.details.map((d, j) => (
                <li key={j}>{d}</li>
              ))}
            </ul>

            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Inputs & determination map
              </summary>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <pre className="text-xs overflow-auto">{JSON.stringify(r.input, null, 2)}</pre>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(r.determination, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
