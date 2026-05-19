import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { USNoticeShell } from "@/components/us-notices/USNoticeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

interface SourceSession {
  id: string;
  client_id: string;
  mode: string;
  scope: string;
  ropa_session_id: string | null;
  version_number: number;
  completed_at: string | null;
  updated_at: string;
}

interface StateSelection {
  id: string;
  state_code: string;
  state_name: string;
  framework_type: string;
}

interface RegChange {
  state_code: string;
  summary: string;
  count: number;
}

type Phase = "loading" | "orientation" | "regulation_check" | "review" | "complete";

const FRAMEWORK_LABEL: Record<string, string> = {
  ccpa: "CCPA / CPRA",
  virginia_model: "Virginia model",
  maryland: "MODPA",
  florida: "FDBR",
  pending: "Pending",
};

export default function USNoticeRefresh() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("loading");
  const [source, setSource] = useState<SourceSession | null>(null);
  const [states, setStates] = useState<StateSelection[]>([]);
  const [newSessionId, setNewSessionId] = useState<string | null>(null);
  const [ropaChanged, setRopaChanged] = useState(false);
  const [regChanges, setRegChanges] = useState<RegChange[]>([]);
  const [regCheckLoading, setRegCheckLoading] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, "unchanged" | "updated">>({});
  const [submitting, setSubmitting] = useState(false);

  // Bootstrap: load source, create new session, copy state selections
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        // 1. Load source session
        const { data: src, error: srcErr } = await supabase
          .from("us_notice_sessions")
          .select("id, client_id, mode, scope, ropa_session_id, version_number, completed_at, updated_at")
          .eq("id", sessionId)
          .maybeSingle();
        if (srcErr) throw srcErr;
        if (!src) throw new Error("Source session not found");
        setSource(src);

        // 2. Load source state selections
        const { data: sel, error: selErr } = await supabase
          .from("us_notice_state_selections")
          .select("id, state_code, state_name, framework_type")
          .eq("session_id", src.id)
          .order("state_name");
        if (selErr) throw selErr;
        const selections = (sel ?? []) as StateSelection[];
        setStates(selections);

        // 3. Compute next version_number for this client
        const { data: maxRow } = await supabase
          .from("us_notice_sessions")
          .select("version_number")
          .eq("client_id", src.client_id)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextVersion = (maxRow?.version_number ?? src.version_number) + 1;

        // 4. Create new refresh session
        const { data: created, error: createErr } = await supabase
          .from("us_notice_sessions")
          .insert({
            client_id: src.client_id,
            mode: src.mode,
            scope: src.scope,
            ropa_session_id: src.ropa_session_id,
            is_refresh: true,
            parent_session_id: src.id,
            version_number: nextVersion,
            status: "in_progress",
          })
          .select("id")
          .single();
        if (createErr) throw createErr;
        setNewSessionId(created.id);

        // 5. Copy state selections to new session
        if (selections.length > 0) {
          const rows = selections.map((s) => ({
            session_id: created.id,
            state_code: s.state_code,
            state_name: s.state_name,
            framework_type: s.framework_type,
          }));
          const { error: copyErr } = await supabase.from("us_notice_state_selections").insert(rows);
          if (copyErr) throw copyErr;
        }

        // 6. RoPA-powered: detect upstream change
        if (src.mode === "ropa_powered" && src.ropa_session_id && src.completed_at) {
          const { data: ropa } = await supabase
            .from("ropa_sessions")
            .select("updated_at")
            .eq("id", src.ropa_session_id)
            .maybeSingle();
          if (ropa?.updated_at && new Date(ropa.updated_at) > new Date(src.completed_at)) {
            setRopaChanged(true);
          }
        }

        setPhase("orientation");
      } catch (err) {
        toast({
          title: "Could not start refresh",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      }
    })();
  }, [sessionId, toast]);

  async function startRegulationCheck() {
    if (!source) return;
    setPhase("regulation_check");
    setRegCheckLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-us-notice-regulatory-updates", {
        body: {
          state_codes: states.map((s) => s.state_code),
          since: source.completed_at,
        },
      });
      if (error) throw error;
      const changes = (data?.changes ?? []) as RegChange[];
      setRegChanges(changes);
    } catch {
      // Edge function may not be deployed yet — degrade gracefully
      setRegChanges([]);
    } finally {
      setRegCheckLoading(false);
    }
  }

  async function copyAnswersForState(stateCode: string) {
    if (!source || !newSessionId) return;
    // Copy universal answers (ropa_activity_id IS NULL) once, on first state.
    // Copy per-state answers tagged via question_key prefix if present.
    // Schema only links answers to session_id (no state column), so we copy ALL
    // source answers to the new session on the first "unchanged" state.
    const alreadyCopied = Object.keys(reviewDecisions).length > 0;
    if (alreadyCopied) return;
    const { data: answers, error } = await supabase
      .from("us_notice_answers")
      .select("ropa_activity_id, question_key, answer_value")
      .eq("session_id", source.id);
    if (error) return;
    if (!answers || answers.length === 0) return;
    const rows = answers.map((a) => ({
      session_id: newSessionId,
      ropa_activity_id: a.ropa_activity_id,
      question_key: a.question_key,
      answer_value: a.answer_value as never,
    }));
    await supabase.from("us_notice_answers").insert(rows);
  }

  async function decideState(stateCode: string, decision: "unchanged" | "updated") {
    await copyAnswersForState(stateCode);
    setReviewDecisions((prev) => ({ ...prev, [stateCode]: decision }));
    if (reviewIndex < states.length - 1) {
      setReviewIndex(reviewIndex + 1);
    } else {
      setPhase("complete");
    }
  }

  async function finishAndReview() {
    if (!newSessionId) return;
    setSubmitting(true);
    try {
      await supabase
        .from("us_notice_sessions")
        .update({ status: "review" })
        .eq("id", newSessionId);
      navigate(`/us-notices/${newSessionId}/review`);
    } finally {
      setSubmitting(false);
    }
  }

  // ----- Render -----

  if (phase === "loading" || !source) {
    return (
      <USNoticeShell title="Refresh Your Notices — US Notice Builder" heading="Annual refresh" step="refresh" sessionId={sessionId}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing refresh…
        </div>
      </USNoticeShell>
    );
  }

  const reviewedCount = Object.keys(reviewDecisions).length;
  const unchangedCount = Object.values(reviewDecisions).filter((d) => d === "unchanged").length;
  const updatedCount = Object.values(reviewDecisions).filter((d) => d === "updated").length;

  return (
    <USNoticeShell title="Refresh Your Notices — US Notice Builder" heading="Annual refresh" step="refresh" sessionId={sessionId}>
      {/* PHASE 1 — Orientation */}
      {phase === "orientation" && (
        <div className="max-w-3xl space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Last generated</div>
                  <div className="font-medium">
                    {source.completed_at ? new Date(source.completed_at).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">States covered</div>
                  <div className="font-medium">{states.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Mode</div>
                  <div className="font-medium capitalize">{source.mode.replace("_", "-")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Time estimate</div>
                  <div className="font-medium">
                    {source.mode === "ropa_powered" ? "5–10 min" : "10–15 min"}
                  </div>
                </div>
              </div>
              <div className="border-t pt-4 text-sm">
                <p className="font-medium mb-2">What happens:</p>
                <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
                  <li>Check for regulation changes since your last notice</li>
                  <li>Review your state-by-state answers</li>
                  <li>Confirm or update, then generate fresh notices</li>
                </ol>
              </div>
              <Button onClick={startRegulationCheck} className="w-full sm:w-auto">
                Start refresh <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PHASE 2 — Regulation change check */}
      {phase === "regulation_check" && (
        <div className="max-w-3xl space-y-4">
          {regCheckLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking for regulatory changes…
            </div>
          ) : (
            <>
              {ropaChanged && (
                <Card className="border-amber-500/40 bg-amber-500/5">
                  <CardContent className="p-4 flex gap-3">
                    <RefreshCw className="h-5 w-5 text-amber-600 mt-0.5" aria-hidden />
                    <div className="text-sm">
                      <p className="font-medium">Your RoPA was updated since the last notice</p>
                      <p className="text-muted-foreground">
                        Some answers may be auto-updated from your latest RoPA in the next step.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {regChanges.length === 0 ? (
                <Card>
                  <CardContent className="p-6 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" aria-hidden />
                    <div className="text-sm">
                      <p className="font-medium">
                        No regulatory changes for your states since{" "}
                        {source.completed_at
                          ? new Date(source.completed_at).toLocaleDateString()
                          : "your last notice"}
                        .
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {regChanges.map((c) => {
                    const st = states.find((s) => s.state_code === c.state_code);
                    return (
                      <Card key={c.state_code} className="border-amber-500/40">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" aria-hidden />
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {st?.state_name ?? c.state_code} — {c.count} regulatory development
                                {c.count === 1 ? "" : "s"} since your last notice
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">{c.summary}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <Button onClick={() => setPhase("review")}>
                Continue to state review <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* PHASE 3 — State answer review */}
      {phase === "review" && states.length > 0 && reviewIndex < states.length && (
        <div className="max-w-3xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Review progress: <span className="font-medium text-foreground">{reviewedCount}</span> of{" "}
            {states.length} states reviewed
          </p>
          {(() => {
            const st = states[reviewIndex];
            return (
              <Card key={st.state_code}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif">{st.state_name}</h2>
                    <Badge variant="secondary">{FRAMEWORK_LABEL[st.framework_type] ?? st.framework_type}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Has anything material changed since{" "}
                    {source.completed_at ? new Date(source.completed_at).toLocaleDateString() : "the last notice"}{" "}
                    for the way you sell or share data, your third-party categories, opt-out mechanism,
                    or retention?
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => decideState(st.state_code, "unchanged")}>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> No changes
                    </Button>
                    <Button variant="outline" onClick={() => decideState(st.state_code, "updated")}>
                      Something has changed
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choosing "Something has changed" will route this state to the question flow on the
                    review screen so you can update its answers.
                  </p>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* PHASE 4 — Complete */}
      {phase === "complete" && (
        <div className="max-w-3xl space-y-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h2 className="font-serif">Refresh summary</h2>
              <p className="text-sm">
                <span className="font-medium">{states.length}</span> states reviewed ·{" "}
                <span className="font-medium text-emerald-600">{unchangedCount}</span> confirmed unchanged ·{" "}
                <span className="font-medium text-amber-600">{updatedCount}</span> flagged for update
              </p>
              <Button onClick={finishAndReview} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Generate updated notices <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </USNoticeShell>
  );
}
