// /admin/quality-batch2 — admin-driven stage-two (revision) QA surface.
// Lists recent assessments per tool and links to the reviewer view.
// Admin-role-gated; uses admin-fetch-assessment (mode: "list") + service role.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminOnly from "@/components/AdminOnly";
import { adminSeedQualityBatch2 } from "@/lib/adminRevisionApi";
import { QUALITY_BATCH2_TOOLS } from "@/lib/qualityBatchTools";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ListItem {
  id: string;
  user_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  open_items_total: number;
  open_items_open: number;
}

const TOOLS: { key: string; label: string; seedable: boolean }[] = [
  { key: "cppa_risk_assessment", label: "CPPA Risk Assessment", seedable: true },
  { key: "cppa_admt", label: "CPPA ADMT", seedable: true },
  { key: "cppa_cybersecurity", label: "CPPA Cybersecurity", seedable: true },
  { key: "governance_assessment", label: "Governance", seedable: true },
  { key: "dpia_framework", label: "DPIA Framework", seedable: false },
  { key: "li_assessment", label: "LIA (Legitimate Interests)", seedable: false },
];

function ToolSection({ tool }: { tool: { key: string; label: string; seedable: boolean } }) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.functions.invoke("admin-fetch-assessment", {
      body: { tool_type: tool.key, mode: "list", limit: 25 },
    });
    if (error) setErr(error.message);
    else setItems(((data as any)?.items ?? []) as ListItem[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [tool.key]);

  async function seed() {
    setSeeding(true);
    const res = await adminSeedQualityBatch2({ toolType: tool.key });
    setSeeding(false);
    if (res.kind === "error") {
      toast({ title: "Seed failed", description: res.message, variant: "destructive" });
    } else {
      toast({ title: "Seeded", description: `assessment_id ${res.assessmentId}` });
      setTimeout(() => void load(), 1500);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg">{tool.label}</h2>
        {tool.seedable && (
          <Button size="sm" variant="outline" disabled={seeding} onClick={seed}>
            {seeding ? "Seeding…" : "Seed one from fixture"}
          </Button>
        )}
      </div>
      {loading && <div className="mt-3 text-sm text-muted-foreground">Loading…</div>}
      {err && <div className="mt-3 text-sm text-destructive">{err}</div>}
      {!loading && !err && items.length === 0 && (
        <div className="mt-3 text-sm text-muted-foreground">No assessments found.</div>
      )}
      {!loading && items.length > 0 && (
        <table className="mt-3 w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left py-1">ID</th>
              <th className="text-left py-1">Status</th>
              <th className="text-left py-1">Open items</th>
              <th className="text-left py-1">Updated</th>
              <th className="text-left py-1"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-border">
                <td className="py-1 font-mono text-xs">{it.id.slice(0, 8)}…</td>
                <td className="py-1">{it.status}</td>
                <td className="py-1">
                  {it.open_items_open} open / {it.open_items_total} total
                </td>
                <td className="py-1 text-xs text-muted-foreground">
                  {new Date(it.updated_at).toLocaleString()}
                </td>
                <td className="py-1">
                  <Link
                    to={`/ADMIn/quality-batch2/${tool.key}/${it.id}`}
                    className="text-sm text-primary underline"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Inner() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-serif text-3xl">Quality Batch 2 — Revision QA</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Admin-only stage-two QA. Opens each doc's frozen open_items in the same reviewer
        surface the customer refine path uses. Submissions route through the internal-
        verification branch of regenerate-assessment; REVISIONS_ENABLED stays off.
      </p>
      <div className="mt-6 space-y-4">
        {TOOLS.map((t) => <ToolSection key={t.key} tool={t} />)}
      </div>
    </div>
  );
}

export default function QualityBatch2Page() {
  return <AdminOnly fallback={<div className="p-8 text-sm">Admin only.</div>}><Inner /></AdminOnly>;
}
