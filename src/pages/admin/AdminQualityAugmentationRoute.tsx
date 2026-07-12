// Route wrapper for QualityLoopAugmentation — that component takes runId/tool
// as props (it's designed to be embedded inside QualityLoop2). At the top-level
// admin route we surface a tiny picker so operators can inspect any run.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminOnly from "@/components/AdminOnly";
import QualityLoopAugmentation from "./QualityLoopAugmentation";

function Inner() {
  const [params, setParams] = useSearchParams();
  const initialRun = params.get("run") ?? "";
  const initialTool = params.get("tool") ?? "dpia";
  const [runId, setRunId] = useState(initialRun);
  const [tool, setTool] = useState(initialTool);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin" className="text-sm text-muted-foreground hover:underline">← Console</Link>
        <h1 className="font-serif text-2xl">Quality augmentation</h1>
      </div>
      <form
        className="mb-6 flex flex-wrap gap-2"
        onSubmit={(e) => { e.preventDefault(); setParams({ run: runId, tool }); }}
      >
        <input
          className="w-96 rounded-md border border-border bg-background px-2 py-1 text-sm"
          placeholder="quality_runs.id"
          value={runId}
          onChange={(e) => setRunId(e.target.value)}
        />
        <input
          className="w-40 rounded-md border border-border bg-background px-2 py-1 text-sm"
          placeholder="tool (dpia, cppa-risk…)"
          value={tool}
          onChange={(e) => setTool(e.target.value)}
        />
        <button className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent" type="submit">Load</button>
      </form>
      <QualityLoopAugmentation runId={runId || null} tool={tool} />
    </div>
  );
}

export default function AdminQualityAugmentationRoute() {
  return (
    <AdminOnly fallback={<div className="p-10 text-sm text-muted-foreground">Not found.</div>}>
      <Inner />
    </AdminOnly>
  );
}
