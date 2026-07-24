// Certification status panel — surfaces per-tool state next to the backlog.
// Computes from quality_campaign_digests + quality_runs + quality_findings
// (via digest.failing_checks) using the pure computeToolCertification helper.
//
// Replicates per wave are approximated as the count of sibling completed
// quality_runs for the same (campaign_id, tool) whose completed_at falls
// within ±6h of the digest.created_at — quality_runs has no wave_number
// column, so time-proximity is the least-fabricated proxy available.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CERTIFICATION_CONFIG,
  computeToolCertification,
  type ToolCertificationState,
  type WaveInput,
} from "@/lib/certification/computeCertificationStatus";

const TOOLS_TRACKED = [
  "cppa-admt", "cppa-risk", "cppa-cyber", "governance", "dpia", "lia",
  "dpa-generator", "ir-playbook", "biometric-checker", "registration",
];

const REPLICATE_WINDOW_MS = 6 * 60 * 60 * 1000;

type DigestRow = {
  id: string;
  tool: string;
  wave_number: number | null;
  campaign_id: string;
  run_id: string | null;
  gate_v2_pass: boolean | null;
  failing_checks: unknown;
  created_at: string;
};

type RunRow = {
  id: string;
  tool: string | null;
  campaign_id: string | null;
  grader_context_version: string | null;
  batch_size: number | null;
  completed_at: string | null;
};

export function CertificationStatusPanel() {
  const [states, setStates] = useState<ToolCertificationState[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: digests, error: dErr } = await supabase
          .from("quality_campaign_digests")
          .select("id,tool,wave_number,campaign_id,run_id,gate_v2_pass,failing_checks,created_at")
          .in("tool", TOOLS_TRACKED)
          .order("wave_number", { ascending: false })
          .limit(400);
        if (dErr) throw dErr;

        const runIds = Array.from(new Set(
          (digests ?? []).map(d => d.run_id).filter((x): x is string => !!x),
        ));
        const campaignIds = Array.from(new Set((digests ?? []).map(d => d.campaign_id)));

        const { data: anchorRuns, error: rErr } = runIds.length
          ? await supabase
              .from("quality_runs")
              .select("id,tool,campaign_id,grader_context_version,batch_size,completed_at")
              .in("id", runIds)
          : { data: [] as RunRow[], error: null };
        if (rErr) throw rErr;

        const { data: siblingRuns, error: sErr } = campaignIds.length
          ? await supabase
              .from("quality_runs")
              .select("id,tool,campaign_id,grader_context_version,batch_size,completed_at")
              .in("campaign_id", campaignIds)
              .in("tool", TOOLS_TRACKED)
              .eq("status", "complete")
          : { data: [] as RunRow[], error: null };
        if (sErr) throw sErr;

        const anchorById = new Map<string, RunRow>();
        for (const r of (anchorRuns ?? []) as RunRow[]) anchorById.set(r.id, r);

        const siblingsByCampaignTool = new Map<string, RunRow[]>();
        for (const r of (siblingRuns ?? []) as RunRow[]) {
          if (!r.campaign_id || !r.tool) continue;
          const key = `${r.campaign_id}::${r.tool}`;
          const arr = siblingsByCampaignTool.get(key) ?? [];
          arr.push(r);
          siblingsByCampaignTool.set(key, arr);
        }

        const wavesByTool = new Map<string, WaveInput[]>();
        for (const d of (digests ?? []) as DigestRow[]) {
          const anchor = d.run_id ? anchorById.get(d.run_id) : undefined;
          const key = `${d.campaign_id}::${d.tool}`;
          const siblings = siblingsByCampaignTool.get(key) ?? [];
          const digestMs = Date.parse(d.created_at);
          const replicates = siblings.filter(s => {
            if (!s.completed_at) return false;
            const dt = Date.parse(s.completed_at);
            return Math.abs(dt - digestMs) <= REPLICATE_WINDOW_MS;
          }).length || (anchor ? 1 : 0);

          const wave: WaveInput = {
            tool: d.tool,
            wave_number: d.wave_number ?? 0,
            campaign_id: d.campaign_id,
            digest_id: d.id,
            gate_v2_pass: d.gate_v2_pass,
            failing_checks: Array.isArray(d.failing_checks)
              ? (d.failing_checks as { severity?: string; cross_category?: string }[])
              : [],
            instrument_hash: anchor?.grader_context_version ?? null,
            n_docs: anchor?.batch_size ?? null,
            replicates,
            created_at: d.created_at,
          };
          const arr = wavesByTool.get(d.tool) ?? [];
          arr.push(wave);
          wavesByTool.set(d.tool, arr);
        }

        const results: ToolCertificationState[] = TOOLS_TRACKED.map(tool => {
          const list = (wavesByTool.get(tool) ?? []).sort(
            (a, b) => (b.wave_number ?? 0) - (a.wave_number ?? 0),
          );
          return computeToolCertification(tool, list);
        });
        if (!cancelled) setStates(results);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const certifiedCount = useMemo(
    () => (states ?? []).filter(s => s.certified).length,
    [states],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Certification status</span>
          <span className="text-sm font-normal text-muted-foreground">
            {states ? `${certifiedCount} of ${states.length} tools certified` : "—"}
            {" · "}A5 defaults: N_docs≥{CERTIFICATION_CONFIG.MIN_N_DOCS},
            {" "}replicates≥{CERTIFICATION_CONFIG.MIN_REPLICATES},
            {" "}{CERTIFICATION_CONFIG.REQUIRED_CONSECUTIVE_WAVES} consecutive waves
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {error && (
          <div className="text-sm text-red-600">Failed to load: {error}</div>
        )}
        {states && !loading && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead className="text-center">Certified</TableHead>
                  <TableHead className="text-center">Streak</TableHead>
                  <TableHead>Instrument (window)</TableHead>
                  <TableHead>Top wave gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {states.map(s => {
                  const top = s.waves[0]?.wave;
                  return (
                    <TableRow key={s.tool}>
                      <TableCell className="font-medium">{s.tool}</TableCell>
                      <TableCell className="text-center">
                        {s.certified
                          ? <Badge className="bg-green-600 hover:bg-green-600">CERTIFIED</Badge>
                          : <Badge variant="secondary">not yet</Badge>}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {s.streak} / {CERTIFICATION_CONFIG.REQUIRED_CONSECUTIVE_WAVES}
                        {top ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (W{top.wave_number})
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {s.streak_instrument_hash ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.certified
                          ? "—"
                          : s.next_missing.join("; ")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CertificationStatusPanel;
