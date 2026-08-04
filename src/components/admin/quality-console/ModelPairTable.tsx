// MODEL A/B HARNESS (dispatch 1), item 3 — side-by-side pair results.
//
// Renders one row per linked A/B pair (same tool, same fixture set, two
// generation models) with both models' scores plus cost/speed signals pulled
// from api_usage: total input/output tokens and total model latency for the
// documents that child run produced.
//
// Renders nothing at all when the batch has no ab_pair_id rows, so the legacy
// /admin/quality-batch console is visually unchanged.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_GENERATION_MODEL,
  AB_ALT_GENERATION_MODEL,
} from "@/lib/qualityBatchTools";

type PairToolResult = {
  tool: string;
  quality_run_id: string | null;
  final_status: string;
  score_overall: number | null;
  gpt_score_overall: number | null;
  generation_model?: string | null;
  ab_pair_id?: string | null;
};

type Usage = { input: number; output: number; ms: number; calls: number };

const EMPTY: Usage = { input: 0, output: 0, ms: 0, calls: 0 };

export function ModelPairTable({
  batch,
  toolResults,
}: {
  batch: { id: string };
  toolResults: PairToolResult[];
}) {
  const pairs = toolResults.filter((r) => r.ab_pair_id);
  const [usage, setUsage] = useState<Record<string, Usage>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const runIds = pairs.map((r) => r.quality_run_id).filter((v): v is string => !!v);
      if (runIds.length === 0) return;
      // quality_run_documents.source_row_id is the api_usage attribution key.
      const { data: docs } = await supabase
        .from("quality_run_documents")
        .select("run_id, source_row_id")
        .in("run_id", runIds);
      const rowToRun = new Map<string, string>();
      for (const d of docs ?? []) {
        if (d.source_row_id) rowToRun.set(d.source_row_id as string, d.run_id as string);
      }
      if (rowToRun.size === 0) return;
      const { data: rows } = await supabase
        .from("api_usage")
        .select("source_row_id, input_tokens, output_tokens, duration_ms")
        .in("source_row_id", Array.from(rowToRun.keys()));
      const agg: Record<string, Usage> = {};
      for (const u of rows ?? []) {
        const runId = rowToRun.get(u.source_row_id as string);
        if (!runId) continue;
        const cur = agg[runId] ?? { ...EMPTY };
        cur.input += Number(u.input_tokens ?? 0);
        cur.output += Number(u.output_tokens ?? 0);
        cur.ms += Number(u.duration_ms ?? 0);
        cur.calls += 1;
        agg[runId] = cur;
      }
      if (!cancelled) setUsage(agg);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.id, toolResults.length]);

  if (pairs.length === 0) return null;

  const byPair = new Map<string, PairToolResult[]>();
  for (const r of pairs) {
    byPair.set(r.ab_pair_id!, [...(byPair.get(r.ab_pair_id!) ?? []), r]);
  }

  const cell = (r?: PairToolResult) => {
    if (!r) return <td className="p-2 text-muted-foreground" colSpan={3}>—</td>;
    const u = (r.quality_run_id && usage[r.quality_run_id]) || EMPTY;
    return (
      <>
        <td className="p-2">
          <Badge variant={r.final_status === "complete" ? "secondary" : "outline"} className="h-4 text-[10px]">
            {r.final_status}
          </Badge>{" "}
          <span className="font-mono">
            {r.score_overall?.toFixed?.(1) ?? "—"} / {r.gpt_score_overall?.toFixed?.(1) ?? "—"}
          </span>
        </td>
        <td className="p-2 font-mono whitespace-nowrap">
          {u.calls ? `${u.input.toLocaleString()} in / ${u.output.toLocaleString()} out` : "—"}
        </td>
        <td className="p-2 font-mono whitespace-nowrap">
          {u.ms ? `${(u.ms / 1000).toFixed(1)}s` : "—"}
        </td>
      </>
    );
  };

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="text-sm font-medium">Model A/B pairs ({byPair.size})</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-left">
              <th className="p-2">Pair</th>
              <th className="p-2">Tool</th>
              <th className="p-2">{DEFAULT_GENERATION_MODEL} · claude/gpt</th>
              <th className="p-2">tokens</th>
              <th className="p-2">latency</th>
              <th className="p-2">{AB_ALT_GENERATION_MODEL} · claude/gpt</th>
              <th className="p-2">tokens</th>
              <th className="p-2">latency</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(byPair.entries()).map(([pid, rows]) => {
              const a = rows.find(
                (r) => (r.generation_model ?? DEFAULT_GENERATION_MODEL) === DEFAULT_GENERATION_MODEL,
              );
              const b = rows.find((r) => r.generation_model === AB_ALT_GENERATION_MODEL);
              return (
                <tr key={pid} className="border-t align-top">
                  <td className="p-2 font-mono">{pid.slice(0, 8)}</td>
                  <td className="p-2 font-mono">{rows[0].tool}</td>
                  {cell(a)}
                  {cell(b)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Tokens and latency are summed from <code>api_usage</code> for the documents each child run
        produced. Grader and rubric calls are pinned and excluded from the A/B parameter.
      </p>
    </div>
  );
}
