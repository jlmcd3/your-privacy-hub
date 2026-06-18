// QualityScoreLedger.tsx — Score history panel for /admin/quality-loop
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const LAUNCH_THRESHOLD = 98.0;
const TOTAL_TOOLS = 12;

type LedgerRow = {
  id: string;
  tool_name: string;
  run_date: string;
  overall_score: number;
  documents_evaluated: number;
  findings_count: number;
  passed_launch_threshold: boolean;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const yr = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${mon} ${yr} ${hh}:${mm} UTC`;
}

function scoreClass(passed: boolean) {
  return passed ? "text-green-600 font-semibold" : "text-amber-600 font-semibold";
}

export default function QualityScoreLedger() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("quality_score_ledger")
        .select("id,tool_name,run_date,overall_score,documents_evaluated,findings_count,passed_launch_threshold")
        .order("run_date", { ascending: false })
        .limit(100);
      if (!error && data) setRows(data as LedgerRow[]);
      setLoading(false);
    })();
  }, []);

  // Best score per tool
  const bestByTool = new Map<string, LedgerRow>();
  for (const r of rows) {
    const cur = bestByTool.get(r.tool_name);
    if (!cur || Number(r.overall_score) > Number(cur.overall_score)) {
      bestByTool.set(r.tool_name, r);
    }
  }
  const bestRows = Array.from(bestByTool.values()).sort(
    (a, b) => Number(b.overall_score) - Number(a.overall_score),
  );

  const toolsEvaluated = bestByTool.size;
  const toolsReady = bestRows.filter(r => r.passed_launch_threshold).length;
  const toolsBelow = toolsEvaluated - toolsReady;

  return (
    <div className="mt-10 bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-900">Quality Score Ledger</h2>
        <span className="text-sm font-semibold text-gray-700">
          Launch threshold: {LAUNCH_THRESHOLD.toFixed(2)}%
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Aggregate quality scores recorded for each batch run.
      </p>

      {/* Launch Readiness Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
          <div className="text-xs text-gray-500">Tools evaluated</div>
          <div className="text-2xl font-semibold text-gray-900">{toolsEvaluated}</div>
        </div>
        <div className="border border-green-200 rounded-md p-3 bg-green-50">
          <div className="text-xs text-green-700">Tools at 98%+</div>
          <div className="text-2xl font-semibold text-green-700">{toolsReady}</div>
        </div>
        <div className="border border-red-200 rounded-md p-3 bg-red-50">
          <div className="text-xs text-red-700">Tools below 98%</div>
          <div className="text-2xl font-semibold text-red-700">{toolsBelow}</div>
        </div>
        <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
          <div className="text-xs text-gray-500">Platform readiness</div>
          <div className="text-2xl font-semibold text-gray-900">
            {toolsReady} of {TOTAL_TOOLS}{" "}
            <span className="text-sm font-normal text-gray-500">tools launch ready</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-500">No ledger entries yet. Run a quality batch to record scores.</div>
      ) : (
        <>
          {/* Best Score Per Tool */}
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Best Score Per Tool</h3>
          <div className="border rounded-md mb-8 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead className="text-right">Best Score</TableHead>
                  <TableHead>Date Achieved</TableHead>
                  <TableHead className="text-center">Launch Ready</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bestRows.map(r => (
                  <TableRow key={`best-${r.tool_name}`}>
                    <TableCell className="font-medium">{r.tool_name}</TableCell>
                    <TableCell className={`text-right ${scoreClass(r.passed_launch_threshold)}`}>
                      {Number(r.overall_score).toFixed(2)}%
                    </TableCell>
                    <TableCell>{fmtDate(r.run_date)}</TableCell>
                    <TableCell className="text-center">
                      {r.passed_launch_threshold
                        ? <span className="text-green-600 font-semibold">✓</span>
                        : <span className="text-red-600 font-semibold">✗</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Full ledger (latest 100) */}
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Run History (latest 100)</h3>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Overall Score</TableHead>
                  <TableHead className="text-right">Documents</TableHead>
                  <TableHead className="text-right">Findings</TableHead>
                  <TableHead className="text-center">Launch Ready</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.tool_name}</TableCell>
                    <TableCell>{fmtDate(r.run_date)}</TableCell>
                    <TableCell className={`text-right ${scoreClass(r.passed_launch_threshold)}`}>
                      {Number(r.overall_score).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">{r.documents_evaluated}</TableCell>
                    <TableCell className="text-right">{r.findings_count}</TableCell>
                    <TableCell className="text-center">
                      {r.passed_launch_threshold
                        ? <span className="text-green-600 font-semibold">✓</span>
                        : <span className="text-red-600 font-semibold">✗</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
