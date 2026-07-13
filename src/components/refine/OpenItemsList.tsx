// RC-B B6 — Open Items list. Renders on the revision path in place of the
// autoEditable intake surface. Each open_item routes by input_spec.kind.
// This component is gated by REVISIONS_ENABLED at the caller.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StructuredFieldEditor } from "./StructuredFieldEditor";
import { supabase } from "@/integrations/supabase/client";

export type OpenItemStatus = "open" | "resolved" | "not_resolved";
export interface OpenItem {
  id: string;
  class: "verdict-blocking" | "record-completeness";
  target: { kind: "field" | "narrative"; path: string };
  why_insufficient: string;
  provision_key: string;
  input_spec: { kind: "re-select" | "structured" | "bounded-narrative" | "boolean+evidence"; max_chars?: number; enum_ref?: string };
  status: OpenItemStatus;
}

function ProvisionPanel({ provisionKey }: { provisionKey: string }) {
  const [state, setState] = useState<{ loading: boolean; excerpt?: string | null; citation?: string | null; pending?: string }>({ loading: true });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("get-provision-text", { body: { key: provisionKey } });
        if (!alive) return;
        setState({ loading: false, excerpt: (data as any)?.excerpt ?? null, citation: (data as any)?.citation ?? null, pending: (data as any)?.pending_notice });
      } catch {
        if (alive) setState({ loading: false, pending: "Provision text pending verification." });
      }
    })();
    return () => { alive = false; };
  }, [provisionKey]);
  if (state.loading) return <div className="text-xs text-muted-foreground">Loading provision…</div>;
  return (
    <div className="rounded border bg-muted/30 p-3 text-sm">
      <div className="font-medium">{state.citation ?? provisionKey}</div>
      {state.excerpt ? (
        <div className="mt-2 whitespace-pre-wrap text-muted-foreground">{state.excerpt}</div>
      ) : (
        <div className="mt-2 italic text-muted-foreground">{state.pending ?? "Provision text pending verification."}</div>
      )}
    </div>
  );
}

interface Props {
  items: OpenItem[];
  onSubmit: (answered: Array<{ item_id: string; value: unknown; evidence?: string }>) => Promise<void> | void;
  submitting?: boolean;
  advisoryNotes?: Array<{ text: string; fact_ref?: string }>;
}

export default function OpenItemsList({ items, onSubmit, submitting, advisoryNotes }: Props) {
  const [answers, setAnswers] = useState<Record<string, { value: unknown; evidence?: string }>>({});
  const [advisoryOpen, setAdvisoryOpen] = useState(false);

  const open = items.filter((i) => i.status === "open");
  const resolvedCount = items.filter((i) => i.status === "resolved").length;
  const total = items.length;

  const setAnswer = (id: string, patch: { value?: unknown; evidence?: string }) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSubmit = () => {
    const answered = Object.entries(answers)
      .filter(([_, v]) => v?.value !== undefined && v.value !== "" && v.value !== null)
      .map(([item_id, v]) => ({ item_id, value: v.value, evidence: v.evidence }));
    if (answered.length === 0) return;
    onSubmit(answered);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm font-medium">Resolved {resolvedCount} of {total}</div>
      </div>

      {open.length === 0 && (
        <div className="rounded border bg-muted p-4 text-sm text-muted-foreground">
          All open items resolved. You may still submit corrections via the Errata channel.
        </div>
      )}

      {open.map((item) => {
        const a = answers[item.id] ?? { value: "" };
        return (
          <div key={item.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">{item.class}</div>
              <div className="mt-1 text-sm">{item.why_insufficient}</div>
            </div>
            <ProvisionPanel provisionKey={item.provision_key} />
            <div className="space-y-2">
              <Label htmlFor={`ans-${item.id}`}>Your answer</Label>
              {item.input_spec.kind === "structured" ? (
                <StructuredFieldEditor
                  value={a.value ?? []}
                  onChange={(v) => setAnswer(item.id, { value: v })}
                  fieldKey={item.target.path}
                />
              ) : item.input_spec.kind === "boolean+evidence" ? (
                <div className="space-y-2">
                  <div className="flex gap-3 text-sm">
                    <label className="flex items-center gap-2"><input type="radio" name={`b-${item.id}`} onChange={() => setAnswer(item.id, { value: true })} /> Yes</label>
                    <label className="flex items-center gap-2"><input type="radio" name={`b-${item.id}`} onChange={() => setAnswer(item.id, { value: false })} /> No</label>
                  </div>
                  <Textarea
                    id={`ans-${item.id}`}
                    placeholder="Evidence / citation (short)"
                    maxLength={item.input_spec.max_chars ?? 400}
                    value={a.evidence ?? ""}
                    onChange={(e) => setAnswer(item.id, { evidence: e.target.value })}
                  />
                </div>
              ) : (
                <Textarea
                  id={`ans-${item.id}`}
                  maxLength={item.input_spec.max_chars ?? 1200}
                  value={typeof a.value === "string" ? a.value : ""}
                  onChange={(e) => setAnswer(item.id, { value: e.target.value })}
                />
              )}
            </div>
          </div>
        );
      })}

      {advisoryNotes && advisoryNotes.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <button
            type="button"
            className="text-sm font-medium"
            onClick={() => setAdvisoryOpen((v) => !v)}
          >
            Advisory notes ({advisoryNotes.length}) {advisoryOpen ? "▾" : "▸"}
          </button>
          {advisoryOpen && (
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {advisoryNotes.map((n, i) => (
                <li key={i} className="border-l-2 border-muted-foreground/30 pl-3">{n.text}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting || open.length === 0}>
          {submitting ? "Submitting…" : "Submit answers"}
        </Button>
      </div>
    </div>
  );
}
