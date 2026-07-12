import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRegenerate } from "@/hooks/useRegenerate";
import { startMeterExtension } from "@/lib/meterExtension";
import type { ResolveFieldMap } from "@/lib/rerunHighlighting";

export interface EditableFieldSpec {
  key: string;
  label: string;
  kind: "text" | "textarea";
  placeholder?: string;
  help?: string;
}

interface Props {
  toolType: string;
  assessmentId: string;
  intake: Record<string, unknown>;
  lockedFields: Record<string, unknown>;
  editable: EditableFieldSpec[]; // ordered fields the user can edit on re-run
  runsUsed: number;
  runsAllowed: number;
  runsRemaining: number;
  resultPath: string; // where to navigate after acceptance, e.g. "/li-assessment-result/:id"
  infoNeededKeys?: string[]; // fields the report named as needed for a fuller determination
  // Doc Q: fields referenced by inconsistency_flags[].source_fields or
  // information_needed[].field on the prior report. Rendered ONLY when
  // resolveHighlightingEnabled === true (caller gates on
  // IMPROVEMENT_KIT_ENABLED && isPro). Strengthen fields NEVER appear
  // here by construction (P3/D5).
  resolveFields?: ResolveFieldMap;
  resolveHighlightingEnabled?: boolean;
  // WS6 v2.1 (regeneration only): prior report's information_needed entries.
  // When non-empty, each entry gets its own textarea; a general context box
  // renders regardless. Absent → no supplemental section rendered.
  priorInformationNeeded?: Array<{ field?: string; dimensions?: string; ask?: string; [k: string]: unknown }>;
}


function renderLockedValue(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ") || "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function RefinePanel({
  toolType, assessmentId, intake, lockedFields, editable,
  runsUsed, runsAllowed, runsRemaining, resultPath, infoNeededKeys,
  resolveFields, resolveHighlightingEnabled,
  priorInformationNeeded,
}: Props) {
  const priorInfo = priorInformationNeeded ?? [];
  const [supplementalResponses, setSupplementalResponses] = useState<string[]>(() => priorInfo.map(() => ""));
  const [supplementalContext, setSupplementalContext] = useState<string>("");
  const infoSet = new Set(infoNeededKeys ?? []);
  // Doc Q: active RESOLVE map, empty when disabled. Local cleared-set
  // hides the highlight/chip visually on edit -- never mutates data.
  const activeResolve = resolveHighlightingEnabled && resolveFields ? resolveFields : { fields: {}, fieldOrder: [], count: 0 };
  const [clearedResolve, setClearedResolve] = useState<Set<string>>(new Set());
  const firstResolveRef = useRef<HTMLDivElement | null>(null);

  const nav = useNavigate();
  const { toast } = useToast();
  const { regenerate, busy } = useRegenerate();

  // Store form values as strings (arrays/objects are JSON-serialized for edit).
  const initial = useMemo(() => {
    const o: Record<string, string> = {};
    for (const f of editable) {
      if (!(f.key in intake)) { o[f.key] = ""; continue; }
      const v = intake[f.key];
      if (v == null) o[f.key] = "";
      else if (typeof v === "string") o[f.key] = v;
      else if (typeof v === "number" || typeof v === "boolean") o[f.key] = String(v);
      else o[f.key] = JSON.stringify(v, null, 2);
    }
    return o;
  }, [editable, intake]);
  const [values, setValues] = useState<Record<string, string>>(initial);

  const lockedKeys = Object.keys(lockedFields ?? {});
  const exhausted = runsRemaining <= 0;

  // Visible RESOLVE fields = derived map minus cleared minus fields the
  // editable list does not surface (only editable fields can highlight).
  const editableKeys = useMemo(() => new Set(editable.map((f) => f.key)), [editable]);
  const visibleResolveOrder = useMemo(
    () => activeResolve.fieldOrder.filter((k) => editableKeys.has(k) && !clearedResolve.has(k)),
    [activeResolve, editableKeys, clearedResolve],
  );
  const visibleResolveCount = visibleResolveOrder.length;

  // Scroll to the first highlighted field on mount / first render with data.
  useEffect(() => {
    if (visibleResolveCount > 0 && firstResolveRef.current) {
      firstResolveRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Intentionally scroll only when the visible order first becomes non-empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResolve.count]);

  async function onRegenerate() {
    // Strip any locked keys defensively; coerce values back to their original
    // JSON shape when the seed value was an array/object.
    const cleanEdits: Record<string, unknown> = {};
    for (const f of editable) {
      if (lockedKeys.includes(f.key)) continue;
      const raw = values[f.key] ?? "";
      const seed = intake[f.key];
      if (Array.isArray(seed) || (seed && typeof seed === "object")) {
        try { cleanEdits[f.key] = raw.trim() ? JSON.parse(raw) : seed; }
        catch {
          toast({ title: "Invalid JSON", description: `Field "${f.label}" must be valid JSON.`, variant: "destructive" });
          return;
        }
      } else if (typeof seed === "number") {
        const n = Number(raw);
        cleanEdits[f.key] = Number.isFinite(n) ? n : seed;
      } else if (typeof seed === "boolean") {
        cleanEdits[f.key] = raw === "true";
      } else {
        cleanEdits[f.key] = raw;
      }
    }
    // WS6 v2.1: assemble supplemental payload. Empty responses are dropped;
    // absent values are omitted entirely so first-run parity is preserved.
    const suppList = priorInfo
      .map((e, i) => ({
        ref_field: (e as any).field as string | undefined,
        ask: ((e as any).dimensions as string | undefined)
          ?? ((e as any).ask as string | undefined)
          ?? ((e as any).field as string | undefined)
          ?? "",
        response: (supplementalResponses[i] ?? "").trim(),
      }))
      .filter((x) => x.response.length > 0);
    const suppCtx = supplementalContext.trim();

    const outcome = await regenerate({
      toolType, assessmentId,
      editedFields: cleanEdits,
      priorRunsUsed: runsUsed,
      supplementalResponses: suppList.length > 0 ? suppList : undefined,
      supplementalContext: suppCtx.length > 0 ? suppCtx : undefined,
    });

    if (outcome.kind === "accepted") {
      toast({ title: "Regenerating your report", description: "This can take a minute." });
      nav(resultPath.replace(":id", assessmentId));
      return;
    }
    if (outcome.kind === "budget_exhausted") {
      toast({
        title: "You've used your included generations",
        description: "Extend with 4 more to keep refining.",
      });
      return;
    }
    if (outcome.kind === "locked_field_changed") {
      toast({
        title: "That field is locked",
        description: `"${outcome.field}" was fixed on the first run and can't change on a re-run. Start a new assessment to change it.`,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Couldn't regenerate", description: outcome.message, variant: "destructive" });
  }

  return (
    <section className="bg-card border border-brand-cloud rounded-2xl p-6 sm:p-8 shadow-eup-sm space-y-6">
      <header>
        <div className="text-eyebrow text-brand-mist mb-2">Refine this assessment</div>
        <h2 className="font-display text-brand-navy leading-snug">
          Edit the open answers and regenerate
        </h2>
        <p className="text-sm text-slate mt-2 max-w-[70ch]">
          Generation {runsUsed} of {runsAllowed} used. The identity fields below were fixed on
          your first run and can't change — everything else is open for revision.
        </p>
      </header>

      {visibleResolveCount > 0 && (
        <div
          data-testid="rerun-highlight-banner"
          className="rounded-md border border-blue-400/60 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100 px-4 py-3 text-sm"
        >
          {visibleResolveCount} {visibleResolveCount === 1 ? "field relates" : "fields relate"} to open items from your last run.
        </div>
      )}

      {lockedKeys.length > 0 && (
        <div>
          <div className="text-eyebrow text-brand-mist mb-2">Locked from run 1</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lockedKeys.map((k) => (
              <div key={k} className="border border-brand-cloud rounded-lg px-3 py-2 bg-brand-cloud/30">
                <div className="flex items-center gap-1.5 text-eyebrow text-brand-navy mb-1">
                  <Lock className="h-3 w-3" aria-hidden />
                  <span>{k.replace(/_/g, " ")}</span>
                </div>
                <div className="text-sm text-brand-navy break-words">
                  {renderLockedValue(lockedFields[k])}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editable.length > 0 && (
        <div className="space-y-5">
          {editable.map((f) => {
            const resolveItems = activeResolve.fields[f.key];
            const isResolveHighlighted =
              !!resolveItems && resolveItems.length > 0 && !clearedResolve.has(f.key);
            const isFirstResolve =
              isResolveHighlighted && visibleResolveOrder[0] === f.key;
            const clearResolveOnEdit = () => {
              if (!isResolveHighlighted) return;
              setClearedResolve((prev) => {
                if (prev.has(f.key)) return prev;
                const next = new Set(prev);
                next.add(f.key);
                return next;
              });
            };
            return (
            <div
              key={f.key}
              ref={isFirstResolve ? firstResolveRef : undefined}
              data-resolve-highlighted={isResolveHighlighted ? "true" : undefined}
              className={isResolveHighlighted ? "rounded-md ring-2 ring-blue-400/70 bg-blue-50/40 dark:bg-blue-950/20 p-3 -m-1" : undefined}
            >
              <label htmlFor={`ref-${f.key}`} className="text-sm font-semibold text-brand-navy inline-flex items-center gap-2 flex-wrap">
                {f.label}
                {isResolveHighlighted && (
                  <span
                    data-testid={`rerun-highlight-chip-${f.key}`}
                    className="text-body-tiny font-semibold text-blue-900 bg-blue-100 border border-blue-300 rounded px-1.5 py-0.5"
                  >
                    From your open items ({resolveItems!.join(", ")})
                  </span>
                )}
                {infoSet.has(f.key) && !isResolveHighlighted && (
                  <span className="text-body-tiny font-semibold text-teal-action bg-teal-wash rounded px-1.5 py-0.5">
                    named in your report
                  </span>
                )}
              </label>

              {f.kind === "textarea" ? (
                <textarea
                  id={`ref-${f.key}`}
                  value={(values[f.key] as string) ?? ""}
                  onChange={(e) => { clearResolveOnEdit(); setValues((v) => ({ ...v, [f.key]: e.target.value })); }}
                  placeholder={f.placeholder}
                  className="mt-2 min-h-24 w-full rounded-md border border-brand-cloud bg-background text-sm p-3"
                />
              ) : (
                <input
                  id={`ref-${f.key}`}
                  type="text"
                  value={(values[f.key] as string) ?? ""}
                  onChange={(e) => { clearResolveOnEdit(); setValues((v) => ({ ...v, [f.key]: e.target.value })); }}
                  placeholder={f.placeholder}
                  className="mt-2 w-full h-10 px-3 rounded-md border border-brand-cloud bg-background text-sm"
                />
              )}
              {f.help && <p className="text-meta text-muted-foreground mt-1">{f.help}</p>}
            </div>
            );
          })}
        </div>
      )}

      <div className="pt-4 border-t border-brand-cloud flex flex-wrap gap-3">
        {!exhausted ? (
          <button
            onClick={onRegenerate}
            disabled={busy}
            className="px-6 py-3 rounded-md bg-brand-navy text-white font-semibold hover:bg-brand-ocean disabled:opacity-60 transition-colors"
          >
            {busy
              ? "Regenerating…"
              : `Regenerate report — spends 1 of your ${runsRemaining} remaining`}
          </button>
        ) : (
          <button
            onClick={() => startMeterExtension(toolType, assessmentId)}
            className="px-6 py-3 rounded-md bg-teal-action text-white font-semibold hover:bg-[hsl(var(--teal-action-hover))] transition-colors"
          >
            Extend with 4 more
          </button>
        )}
      </div>
    </section>
  );
}
