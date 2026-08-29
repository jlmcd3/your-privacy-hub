// ALL-PRODUCTS-TEST — extended product panel.
//
// /admin/SO-final-test grades the nine skeleton-encoded products through the
// quality-batch orchestrator. Four shipped products are NOT dispatchable
// there — DPA Generator (dispatchable but not skeleton-encoded) and the three
// workspace-scoped builders (RoPA, US Notice, EU Notice). This panel runs
// those products end-to-end against their canonical sample fixtures using the
// EXACT insert/invoke/poll sequences that /admin/sample-reports ships
// (src/lib/sampleGenerators.ts — one shared implementation, no drift).
//
// INTAKE LAW: nothing is inserted or invoked until every selected fixture
// passes preflight (src/lib/sampleFixturePreflight.ts). A run can therefore
// never fail because of a missing or blank intake key — such a fixture is
// refused up-front with the offending key paths named.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { SAMPLE_FIXTURES, type SampleFixture, type ToolSlug } from "@/lib/sampleFixtures";
import { preflightFixture, type PreflightResult } from "@/lib/sampleFixturePreflight";
import { runGenerator } from "@/lib/sampleGenerators";

/** Products covered by the skeleton-graded SO batch above this panel. */
export const SO_COVERED_SLUGS: ToolSlug[] = [
  "cppa_risk", "cppa_cyber", "cppa_admt", "governance",
  "dpia", "li_assessment", "ir_playbook", "biometric", "registration",
];

/** Products with no SO batch dispatch — this panel is their only harness. */
export const EXTENDED_SLUGS: ToolSlug[] = ["dpa", "ropa", "us_notice", "eu_notice"];

export const SLUG_LABEL: Record<ToolSlug, string> = {
  li_assessment: "LIA (Legitimate Interests)",
  dpia: "DPIA Framework",
  dpa: "DPA Generator",
  governance: "GDPR Governance",
  ir_playbook: "IR Playbook",
  biometric: "Biometric Compliance",
  cppa_risk: "CPPA Risk Assessment",
  cppa_cyber: "CPPA Cybersecurity Audit",
  cppa_admt: "CPPA ADMT Assessment",
  ropa: "RoPA (Article 30)",
  us_notice: "US Notice Builder",
  eu_notice: "EU Notice Builder",
  registration: "Registration Manager",
};

type RunStatus = "idle" | "queued" | "running" | "complete" | "failed";

interface RowState {
  status: RunStatus;
  log: string[];
  resultUrl: string | null;
  sourceRowId: string | null;
  preflight: PreflightResult | null;
}

const EMPTY: RowState = { status: "idle", log: [], resultUrl: null, sourceRowId: null, preflight: null };

const fixtureKey = (f: SampleFixture) => `${f.tool_slug}/${f.variant}`;

export function AllProductsPanel() {
  const { user } = useAuth();
  const [state, setState] = useState<Record<string, RowState>>({});
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // BATCH NUMBER — how many sample runs to generate per selected product.
  // Mirrors the "Batch size" control in the skeleton console below; default 1.
  const [batchNumber, setBatchNumber] = useState<number>(1);
  // "-supplemental" fixtures are second-pass (regeneration / supplemental
  // capture) variants of the SAME products, not extra products. Hidden by
  // default so the list is one row per shipped product variant.
  const [showSupplemental, setShowSupplemental] = useState(false);

  const fixtures = useMemo(() => {
    const order = [...EXTENDED_SLUGS, ...SO_COVERED_SLUGS];
    return [...SAMPLE_FIXTURES]
      .filter((f) => showSupplemental || !f.variant.endsWith("-supplemental"))
      .sort(
        (a, b) => order.indexOf(a.tool_slug) - order.indexOf(b.tool_slug) || a.variant.localeCompare(b.variant),
      );
  }, [showSupplemental]);

  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        SAMPLE_FIXTURES.filter(
          (f) => !f.variant.endsWith("-supplemental"),
        ).map(fixtureKey),
      ),
  );


  // Preflight is cheap and pure — run it on mount so the intake health of
  // every fixture is visible before anyone presses Run.
  useEffect(() => {
    setState((prev) => {
      const next = { ...prev };
      for (const f of fixtures) {
        const k = fixtureKey(f);
        next[k] = { ...(next[k] ?? EMPTY), preflight: preflightFixture(f) };
      }
      return next;
    });
  }, [fixtures]);

  const setRow = (k: string, patch: Partial<RowState>) =>
    setState((s) => ({ ...s, [k]: { ...(s[k] ?? EMPTY), ...patch } }));

  const appendLog = (k: string, msg: string) =>
    setState((s) => {
      const row = s[k] ?? EMPTY;
      return { ...s, [k]: { ...row, log: [...row.log, msg].slice(-200) } };
    });

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const failedPreflight = fixtures.filter(
    (f) => selected.has(fixtureKey(f)) && state[fixtureKey(f)]?.preflight?.ok === false,
  );

  async function runSelected() {
    if (!user?.id) return toast.error("Sign in as an admin first");
    const queue = fixtures.filter((f) => selected.has(fixtureKey(f)));
    if (!queue.length) return toast.error("Select at least one product");

    // INTAKE GATE — refuse the whole run rather than emit a doomed dispatch.
    const bad = queue.map((f) => preflightFixture(f)).filter((r) => !r.ok);
    if (bad.length) {
      for (const r of bad) setRow(`${r.tool_slug}/${r.variant}`, { preflight: r, status: "failed" });
      toast.error(`Preflight failed for ${bad.map((b) => b.label).join(", ")} — run refused`);
      return;
    }

    setBusy(true);
    const totalRuns = queue.length * batchNumber;
    for (const f of queue) setRow(fixtureKey(f), { status: "queued", log: [], resultUrl: null });
    let ok = 0;
    let attempted = 0;
    for (const f of queue) {
      const k = fixtureKey(f);
      setRow(k, { status: "running" });
      for (let i = 1; i <= batchNumber; i++) {
        const runLabel = batchNumber > 1 ? ` [run ${i}/${batchNumber}]` : "";
        appendLog(k, `▶ ${f.title}${runLabel}`);
        attempted += 1;
        try {
          const out = await runGenerator(f, user.id, (m) => appendLog(k, m));
          ok += 1;
          appendLog(k, `✅ complete${runLabel} — ${out.resultUrl}`);
          setRow(k, { status: "complete", resultUrl: out.resultUrl, sourceRowId: out.sourceRowId });
        } catch (e) {
          appendLog(k, `❌${runLabel} ${(e as Error).message}`);
          setRow(k, { status: "failed" });
        }
      }
    }
    setBusy(false);
    toast[ok === totalRuns ? "success" : "error"](`${ok}/${totalRuns} runs completed`);
  }

  function runPreflightOnly() {
    let bad = 0;
    for (const f of fixtures) {
      const r = preflightFixture(f);
      if (!r.ok) bad += 1;
      setRow(fixtureKey(f), { preflight: r });
    }
    toast[bad ? "error" : "success"](
      bad ? `${bad} fixture(s) have intake problems` : `All ${fixtures.length} sample fixtures pass intake preflight`,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3">
          <span>All Products — sample data + live generation</span>
          <span className="font-mono text-xs text-muted-foreground">sampleGenerators · preflight-gated</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select any or all products. Sample data is written to each product's own tables, the live generator
          is invoked, and the run is polled to a terminal status. Products marked <em>SO batch</em> are also
          graded by the skeleton console below; the others have no batch dispatch and run only here.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={runSelected} disabled={busy}>
            {busy ? "Running…" : `Run selected (${selected.size})`}
          </Button>
          <Button size="sm" variant="outline" onClick={runPreflightOnly} disabled={busy}>
            Preflight intake data
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setSelected(new Set(fixtures.map(fixtureKey)))}
          >
            Select all
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              setSelected(new Set(fixtures.filter((f) => EXTENDED_SLUGS.includes(f.tool_slug)).map(fixtureKey)))
            }
          >
            Only non-SO products
          </Button>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={showSupplemental}
              disabled={busy}
              onCheckedChange={(v) => setShowSupplemental(v === true)}
            />
            Show second-pass (supplemental capture) variants
          </label>

        </div>

        {failedPreflight.length > 0 && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm">
            Intake preflight failing for {failedPreflight.length} selected fixture(s) — runs are blocked until
            fixed.
          </div>
        )}

        <div className="divide-y rounded border">
          {fixtures.map((f) => {
            const k = fixtureKey(f);
            const row = state[k] ?? EMPTY;
            const pf = row.preflight;
            return (
              <div key={k} className="p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Checkbox checked={selected.has(k)} onCheckedChange={() => toggle(k)} disabled={busy} />
                  <span className="min-w-[15rem] text-sm font-medium">{SLUG_LABEL[f.tool_slug]}</span>
                  <span className="font-mono text-xs text-muted-foreground">{f.variant}</span>
                  <Badge variant={SO_COVERED_SLUGS.includes(f.tool_slug) ? "secondary" : "outline"}>
                    {SO_COVERED_SLUGS.includes(f.tool_slug) ? "SO batch" : "panel only"}
                  </Badge>
                  {pf && (
                    <Badge variant={pf.ok ? "secondary" : "destructive"}>
                      {pf.ok ? "intake ok" : `intake: ${pf.issues.length} issue(s)`}
                    </Badge>
                  )}
                  {row.status !== "idle" && (
                    <Badge
                      variant={
                        row.status === "complete" ? "default" : row.status === "failed" ? "destructive" : "outline"
                      }
                    >
                      {row.status}
                    </Badge>
                  )}
                  {row.resultUrl && (
                    <Link to={row.resultUrl} className="text-xs text-primary underline">
                      open result
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => setExpanded(expanded === k ? null : k)}
                  >
                    {expanded === k ? "hide" : "details"}
                  </Button>
                </div>

                {expanded === k && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">{f.scenario_summary}</p>
                    {pf && !pf.ok && (
                      <ul className="list-inside list-disc text-xs text-destructive">
                        {pf.issues.map((i) => (
                          <li key={i.key}>
                            {i.key} — {i.problem}
                          </li>
                        ))}
                      </ul>
                    )}
                    {row.log.length > 0 && (
                      <pre className="max-h-64 overflow-auto rounded bg-muted p-2 font-mono text-[11px] leading-4">
                        {row.log.join("\n")}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default AllProductsPanel;
