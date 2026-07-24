// CPPA-PRODUCT-1 L5: admin surface for public.quality_finding_backlog.
// Renders a table of recurring quality findings across all ten tools with
// class + proposed_lever, and exposes a button to run the
// classify-quality-findings edge function (backfill on first run).

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

type BacklogRow = {
  id: string;
  finding_check_id: string;
  tool: string;
  first_seen_wave: number | null;
  last_seen_wave: number | null;
  occurrence_count: number;
  class: string;
  proposed_lever: string | null;
  registry_key: string | null;
  intake_field: string | null;
  grader_hash: string | null;
  status: string;
  notes: string | null;
  updated_at: string;
};

const CLASS_TONE: Record<string, string> = {
  feature: "bg-blue-100 text-blue-900",
  prompt: "bg-slate-100 text-slate-900",
  intake: "bg-amber-100 text-amber-900",
  measurement_noise: "bg-purple-100 text-purple-900",
  unclassified: "bg-muted text-muted-foreground",
};

export function QualityFindingBacklogPanel() {
  const [rows, setRows] = useState<BacklogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [toolFilter, setToolFilter] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quality_finding_backlog")
      .select("*")
      .order("occurrence_count", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) {
      toast.error(`Load failed: ${error.message}`);
      return;
    }
    setRows((data ?? []) as BacklogRow[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onClassify = async () => {
    setClassifying(true);
    const { data, error } = await supabase.functions.invoke("classify-quality-findings", { body: {} });
    setClassifying(false);
    if (error) {
      toast.error(`Classify failed: ${error.message}`);
      return;
    }
    const d = data as { upserted?: number; classified?: number; unclassified?: number } | null;
    toast.success(`Classified ${d?.upserted ?? 0} rows (${d?.unclassified ?? 0} unclassified)`);
    load();
  };

  const tools = useMemo(() => {
    const s = new Set(rows.map((r) => r.tool));
    return Array.from(s).sort();
  }, [rows]);

  const visible = useMemo(
    () => (toolFilter ? rows.filter((r) => r.tool === toolFilter) : rows),
    [rows, toolFilter],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Quality finding backlog
          <span className="ml-2 text-xs text-muted-foreground font-mono">
            {rows.length} row{rows.length === 1 ? "" : "s"}
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm bg-background"
            value={toolFilter}
            onChange={(e) => setToolFilter(e.target.value)}
          >
            <option value="">All tools</option>
            {tools.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={onClassify} disabled={classifying}>
            {classifying ? "Classifying…" : "Run classifier"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Check ID</th>
                <th className="py-2 pr-3">Tool</th>
                <th className="py-2 pr-3 text-right">Count</th>
                <th className="py-2 pr-3">Waves</th>
                <th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Lever</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Grader hash</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="py-1.5 pr-3 font-mono text-xs">{r.finding_check_id}</td>
                  <td className="py-1.5 pr-3 text-xs">{r.tool}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{r.occurrence_count}</td>
                  <td className="py-1.5 pr-3 text-xs font-mono">
                    {r.first_seen_wave ?? "—"}→{r.last_seen_wave ?? "—"}
                  </td>
                  <td className="py-1.5 pr-3">
                    <Badge className={CLASS_TONE[r.class] ?? ""}>{r.class}</Badge>
                  </td>
                  <td className="py-1.5 pr-3 text-xs">{r.proposed_lever ?? "—"}</td>
                  <td className="py-1.5 pr-3 text-xs">{r.status}</td>
                  <td className="py-1.5 pr-3 text-xs font-mono text-muted-foreground truncate max-w-[160px]">
                    {r.grader_hash ?? "—"}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground text-sm">
                    {loading ? "Loading…" : "No backlog rows yet. Click Run classifier to backfill."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
