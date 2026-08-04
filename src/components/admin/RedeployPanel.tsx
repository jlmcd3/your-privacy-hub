// RedeployPanel — admin operator control for queueing edge-function redeploys.
// Mounted on /admin/final-test (ITEM 325) so the variant-aware quality console
// and the operator redeploy tool share one admin landing surface.
//
// Posts through admin-toolbox-action action=redeploy_request, which fronts the
// admin-redeploy edge function (two-source conflict gate + redeploy_queue).

import { useEffect, useId, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Common edge functions that operators redeploy during quality / prose work.
// The input is free-text, so this list is a convenience, not a hard boundary.
const COMMON_FUNCTIONS = [
  "quality-batch-orchestrator",
  "run-cppa-risk-assessment",
  "run-cppa-cybersecurity",
  "run-admt-checker",
  "run-li-assessment",
  "run-dpia-framework",
  "run-governance-assessment",
  "run-registration-assessment",
  "run-biometric-checker",
  "run-ir-playbook",
  "generate-report-pdf",
  "admin-redeploy",
  "admin-toolbox-action",
  "ingest-gov-enforcement",
  "corpus-refetch-campaign",
  "verification-scan",
];

export function RedeployPanel() {
  const id = useId();
  const [fn, setFn] = useState("");
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [log, setLog] = useState<Array<{ id: string; created_at: string; action: string; ok: boolean; result: Record<string, unknown> }>>([]);

  async function loadLog() {
    const { data } = await supabase
      .from("admin_action_log")
      .select("id, created_at, action, ok, result")
      .eq("action", "redeploy_request")
      .order("created_at", { ascending: false })
      .limit(10);
    setLog((data as any) ?? []);
  }

  useEffect(() => { loadLog(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const functionName = fn.trim();
    const reasonText = reason.trim();
    if (!functionName) { toast.error("Enter a function name"); return; }
    if (!reasonText) { toast.error("Enter a reason"); return; }

    setBusy(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-toolbox-action", {
        body: {
          action: "redeploy_request",
          params: {
            function_name: functionName,
            reason: reasonText,
            ...(override ? { override: "OVERRIDE-REDEPLOY" } : {}),
          },
        },
      });
      if (error) throw error;
      const res = (data as any)?.result ?? {};
      setLastResult(res);
      if ((data as any)?.ok) {
        toast.success("Redeploy queued");
      } else {
        toast.error(`Redeploy blocked: ${res?.body ?? JSON.stringify(res)}`);
      }
    } catch (e: any) {
      const msg = e?.context?.body ?? e?.message ?? String(e);
      toast.error(`Redeploy failed: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
      setLastResult({ error: msg });
    } finally {
      setBusy(false);
      loadLog();
    }
  }

  return (
    <Card className="mt-6 border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg">Redeploy Edge Function</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-fn`}>Function name</Label>
            <Input
              id={`${id}-fn`}
              list={`${id}-fn-list`}
              value={fn}
              onChange={(e) => setFn(e.target.value)}
              placeholder="e.g. quality-batch-orchestrator"
              disabled={busy}
              className="font-mono text-sm"
            />
            <datalist id={`${id}-fn-list`}>
              {COMMON_FUNCTIONS.map((f) => <option key={f} value={f} />)}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-reason`}>Reason</Label>
            <Input
              id={`${id}-reason`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this redeploy is needed"
              disabled={busy}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`${id}-override`}
              checked={override}
              onCheckedChange={(v) => setOverride(!!v)}
              disabled={busy}
            />
            <Label htmlFor={`${id}-override`} className="text-sm font-normal">
              Force override (bypasses the conflict gate)
            </Label>
          </div>

          <Button type="submit" disabled={busy || !fn.trim() || !reason.trim()}>
            {busy ? "Queueing…" : "Queue redeploy"}
          </Button>
        </form>

        {lastResult && (
          <div className="mt-4 rounded border border-border bg-muted/50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last result</div>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent redeploy requests</div>
          {log.length === 0 ? (
            <div className="mt-2 text-sm text-muted-foreground">No redeploy requests logged yet.</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {log.map((r) => (
                <li key={r.id} className="flex items-start gap-2 text-sm">
                  <span className={r.ok ? "text-green-500" : "text-red-500"}>{r.ok ? "✓" : "✗"}</span>
                  <span className="text-muted-foreground">{new Date(r.created_at).toISOString().slice(0, 19)}</span>
                  <span className="font-mono text-xs">{JSON.stringify(r.result).slice(0, 120)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
