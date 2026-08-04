import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRopaStore } from "@/stores/ropaStore";
import { RopaShell } from "@/components/ropa/RopaShell";
import { AutosaveIndicator } from "@/components/AutosaveIndicator";
import { RopaBreadcrumb } from "@/components/ropa/RopaBreadcrumb";
import { getRopaSteps } from "@/components/ropa/ropaFlowSteps";
import { useRopaSessionParam, withSession } from "@/lib/ropaSession";
import { getQuestionsForActivity } from "@/data/ropa-questions";
import type { Question } from "@/data/ropa-questions/types";
import { getPersonalDataExamplesForSector } from "@/data/ropa-personal-data-examples";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Art9Art10Checklist from "@/components/ropa/Art9Art10Checklist";
import { AlertTriangle, CheckCircle2, Lock, Trash2 } from 'lucide-react';

const SUPA = supabase as unknown as { from: (t: string) => any };

export default function RopaActivity() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const urlSessionId = useRopaSessionParam();

  const currentActivity = useRopaStore((s) => s.currentActivity);
  const allActivities = useRopaStore((s) => s.allActivities);
  const currentSession = useRopaStore((s) => s.currentSession);
  const currentAnswers = useRopaStore((s) => s.currentAnswers);
  const isSaving = useRopaStore((s) => s.isSaving);
  const lastSavedAt = useRopaStore((s) => s.lastSavedAt);
  const loadActivity = useRopaStore((s) => s.loadActivity);
  const loadSession = useRopaStore((s) => s.loadSession);
  const saveAnswer = useRopaStore((s) => s.saveAnswer);
  const markActivityComplete = useRopaStore((s) => s.markActivityComplete);
  const deleteActivityFromStore = useRopaStore((s) => s.deleteActivity);
  const evaluateFlagsForAnswer = useRopaStore((s) => s.evaluateFlagsForAnswer);

  const [activityNavOpen, setActivityNavOpen] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [activityReady, setActivityReady] = useState(false);
  const [clientSector, setClientSector] = useState<string>("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  // Fetch the client sector for the current session, so we can show
  // sector-specific examples of personal data on the data_categories question.
  useEffect(() => {
    const clientId = currentSession?.client_id;
    if (!clientId) {
      setClientSector("");
      return;
    }
    (async () => {
      const { data } = await SUPA.from("clients")
        .select("sector")
        .eq("id", clientId)
        .maybeSingle();
      setClientSector((data?.sector as string) ?? "");
    })();
  }, [currentSession?.client_id]);

  const personalDataExamples = useMemo(
    () => getPersonalDataExamplesForSector(clientSector),
    [clientSector]
  );

  // Load activity + parent session whenever the activity id changes.
  // We reload the session (which also refreshes allActivities) whenever the
  // store doesn't already contain the current activity in its sidebar list —
  // covers the case where the prior page created activities via direct
  // inserts without round-tripping through loadSession.
  useEffect(() => {
    if (!id) return;
    setActivityReady(false);
    (async () => {
      await loadActivity(id);
      const act = useRopaStore.getState().currentActivity;
      if (!act) {
        navigate("/ropa", { replace: true });
        return;
      }
      if (act && urlSessionId && act.session_id !== urlSessionId) {
        useRopaStore.getState().clearSession();
        navigate(withSession("/ropa/activities", urlSessionId), { replace: true });
        return;
      }
      const sess = useRopaStore.getState().currentSession;
      const all = useRopaStore.getState().allActivities;
      const sidebarStale =
        !sess ||
        (act && sess.id !== act.session_id) ||
        (act && !all.some((a) => a.id === act.id));
      if (act && sidebarStale) {
        await loadSession(act.session_id);
        // loadSession resets currentActivity to null — restore it.
        await loadActivity(id);
      }
      const loadedSession = useRopaStore.getState().currentSession;
      if (
        loadedSession &&
        !["in_progress", "review"].includes(loadedSession.status)
      ) {
        navigate(`/ropa/review/${loadedSession.id}`, { replace: true });
        return;
      }
      setActivityReady(true);
    })();
  }, [id, loadActivity, loadSession, navigate, urlSessionId]);

  const questions: Question[] = useMemo(
    () => getQuestionsForActivity(currentActivity?.template_key ?? null),
    [currentActivity?.template_key]
  );

  // Filter based on showIf
  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.showIf) return true;
      const val = currentAnswers[q.showIf.questionKey];
      const target = q.showIf.value;
      switch (q.showIf.operator) {
        case "equals":
          return val === target;
        case "not_equals":
          return val !== target;
        case "contains":
          return Array.isArray(val) && Array.isArray(target)
            ? target.some((t) => (val as string[]).includes(t))
            : Array.isArray(val) && typeof target === "string"
              ? (val as string[]).includes(target)
              : false;
        default:
          return true;
      }
    });
  }, [questions, currentAnswers]);

  const handleAnswer = async (questionKey: string, value: unknown) => {
    if (!currentActivity || !currentSession) return;
    await saveAnswer(questionKey, value as never);
    const q = visibleQuestions.find((x) => x.key === questionKey);
    if (q?.flagIf) {
      await evaluateFlagsForAnswer(questionKey, value as never, q.flagIf);
    }
  };

  const handleDeleteActivity = (activityId: string, displayName: string) => {
    setPendingDelete({ id: activityId, name: displayName });
  };

  const confirmDeleteActivity = async () => {
    if (!pendingDelete) return;
    const { id: activityId, name: displayName } = pendingDelete;
    setPendingDelete(null);
    const isCurrent = currentActivity?.id === activityId;
    try {
      await deleteActivityFromStore(activityId);
      toast.success(`Deleted "${displayName}"`);
      if (isCurrent) {
        const remaining = useRopaStore.getState().allActivities;
        if (remaining.length > 0) {
          navigate(
            withSession(`/ropa/activity/${remaining[0].id}`, currentSession?.id)
          );
        } else {
          navigate(withSession(`/ropa/activities`, currentSession?.id));
        }
      }
    } catch (e) {
      toast.error(
        `Couldn't delete activity: ${(e as Error)?.message ?? "unknown error"}`
      );
    }
  };

  // Count answered required questions for progress
  const answeredRequired = visibleQuestions.filter(
    (q) =>
      q.isRequired &&
      currentAnswers[q.key] !== undefined &&
      currentAnswers[q.key] !== "" &&
      !(Array.isArray(currentAnswers[q.key]) &&
        (currentAnswers[q.key] as unknown[]).length === 0)
  ).length;
  const totalRequired = visibleQuestions.filter((q) => q.isRequired).length;
  const missingRequired = visibleQuestions.filter(
    (q) =>
      q.isRequired &&
      (currentAnswers[q.key] === undefined ||
        currentAnswers[q.key] === "" ||
        (Array.isArray(currentAnswers[q.key]) &&
          (currentAnswers[q.key] as unknown[]).length === 0))
  );

  const handleSubmit = async () => {
    if (!currentActivity || !currentSession) return;
    if (missingRequired.length > 0) {
      toast.error(
        `Please answer all required questions (${missingRequired.length} remaining).`
      );
      // Scroll to first missing
      const firstKey = missingRequired[0].key;
      const el = formCardRef.current?.querySelector(
        `[data-question-key="${firstKey}"]`
      ) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Ensure any debounced answers are flushed
    await new Promise((r) => setTimeout(r, 600));

    if (applyToAll) {
      setBulkSaving(true);
      try {
        const others = allActivities.filter(
          (a) => a.id !== currentActivity.id && a.status !== "complete"
        );

        // Build the answer payload from the current activity's answers
        const answersToCopy = Object.entries(currentAnswers).filter(
          ([, v]) =>
            v !== undefined &&
            v !== "" &&
            !(Array.isArray(v) && v.length === 0)
        );

        for (const other of others) {
          const otherQuestions = getQuestionsForActivity(
            other.template_key ?? null
          );
          const otherKeys = new Set(otherQuestions.map((q) => q.key));
          const rows = answersToCopy
            .filter(([key]) => otherKeys.has(key))
            .map(([key, value]) => ({
              activity_id: other.id,
              session_id: currentSession.id,
              question_key: key,
              answer_value: value,
              updated_at: new Date().toISOString(),
            }));

          if (rows.length > 0) {
            const { error: upErr } = await SUPA.from("ropa_answers").upsert(
              rows,
              { onConflict: "activity_id,question_key" }
            );
            if (upErr) throw upErr;
          }

          const { error: actErr } = await SUPA.from(
            "ropa_processing_activities"
          )
            .update({ status: "complete", completion_pct: 100 })
            .eq("id", other.id);
          if (actErr) throw actErr;
        }

        await markActivityComplete();
        toast.success(
          others.length > 0
            ? `Applied your answers to ${others.length} more activit${others.length === 1 ? "y" : "ies"}.`
            : "Activity saved."
        );
        navigate(currentSession ? `/ropa/review/${currentSession.id}` : "/ropa/review");
      } catch (e) {
        console.error(e);
        toast.error("Could not apply answers to all activities. Try again.");
      } finally {
        setBulkSaving(false);
      }
      return;
    }

    await markActivityComplete();
    const incomplete = allActivities.find(
      (a) => a.id !== currentActivity.id && a.status !== "complete"
    );
    if (incomplete) navigate(withSession(`/ropa/activity/${incomplete.id}`, currentSession?.id));
    else navigate(currentSession ? `/ropa/review/${currentSession.id}` : "/ropa/review");
  };

  if (!activityReady || !currentActivity) {
    return (
      <RopaShell title="Activity — RoPA Builder" heading="Loading activity…">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </RopaShell>
    );
  }

  if (visibleQuestions.length === 0) {
    return (
      <RopaShell
        title={`${currentActivity.display_name} — RoPA Builder`}
        heading={currentActivity.display_name}
      >
        <p className="text-muted-foreground">No questions configured.</p>
        <button
          onClick={() => navigate(currentSession ? `/ropa/review/${currentSession.id}` : "/ropa/review")}
          className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold"
        >
          Continue to review →
        </button>
      </RopaShell>
    );
  }

  const completedCount = allActivities.filter((a) => a.status === "complete")
    .length;
  const otherIncompleteCount = allActivities.filter(
    (a) => a.id !== currentActivity.id && a.status !== "complete"
  ).length;

  return (
    <RopaShell
      title={`${currentActivity.display_name} — RoPA Builder`}
      heading=""
    >
      {(() => {
        const { steps, currentIndex } = getRopaSteps(
          "activity",
          currentSession?.id ?? null
        );
        return <RopaBreadcrumb steps={steps} currentIndex={currentIndex} />;
      })()}
      <div className="grid md:grid-cols-[260px_1fr] gap-6 pb-24 md:pb-0">
        {/* Sidebar (desktop) */}
        <aside
          className="hidden md:block border border-border rounded-xl p-4 bg-card h-fit"
          role="navigation"
          aria-label="Processing activities"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Activities
          </p>
          <ActivityNavList
            activities={allActivities}
            currentActivityId={currentActivity.id}
            onSelect={(aid) =>
              navigate(withSession(`/ropa/activity/${aid}`, currentSession?.id))
            }
            onDelete={(aid, name) => handleDeleteActivity(aid, name)}
          />
        </aside>

        {/* Question zone */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif flex-1">
              {currentActivity.display_name}
            </h1>
            {currentActivity.is_high_risk && (
              <span className="text-xs bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-1 rounded font-semibold">
                HIGH RISK
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 text-xs text-muted-foreground">
            <div className="flex-1">
              <p className="mb-1">
                {answeredRequired} of {totalRequired} required answered
              </p>
              <div
                className="w-full h-1.5 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={answeredRequired}
                aria-valuemin={0}
                aria-valuemax={totalRequired}
                aria-label="Activity progress"
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${
                      (answeredRequired / Math.max(1, totalRequired)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <p className="mb-1">
                {completedCount} of {allActivities.length} activities complete
              </p>
              <div
                className="w-full h-1.5 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={completedCount}
                aria-valuemin={0}
                aria-valuemax={allActivities.length}
                aria-label="Session progress"
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${
                      (completedCount / Math.max(1, allActivities.length)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div
            ref={formCardRef}
            className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-8"
          >
            {visibleQuestions.map((q, idx) => (
              <div
                key={q.key}
                data-question-key={q.key}
                className={
                  idx > 0 ? "pt-6 border-t border-border" : undefined
                }
              >
                {q.staticInfoCard && (
                  <div className="mb-4 p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded">
                    <p className="font-semibold text-sm">
                      {q.staticInfoCard.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {q.staticInfoCard.body}
                    </p>
                  </div>
                )}

                <label
                  htmlFor={`q-${q.key}`}
                  className="block text-base font-medium mb-1"
                >
                  <span className="text-xs text-muted-foreground mr-2">
                    {idx + 1}.
                  </span>
                  {q.text}
                  {q.isRequired && (
                    <span
                      className="text-destructive ml-1"
                      aria-label="required"
                    >
                      *
                    </span>
                  )}
                </label>
                <WhyWeAsk>{q.whyWeAsk}</WhyWeAsk>


                {q.key === "data_categories" && (
                  <details className="mb-3 text-sm">
                    <summary className="cursor-pointer text-muted-foreground min-h-[32px] flex items-center">
                      ⓘ Examples of personal data
                      {clientSector ? ` for ${clientSector}` : ""} under GDPR
                    </summary>
                    <div className="mt-2 space-y-3 rounded-md border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        Illustrative only. Pick what actually applies to this
                        activity. Items marked <span className="font-semibold">sensitive</span> are
                        special category or otherwise heightened-risk data
                        (GDPR Art.9 / Art.10) and usually need an additional
                        condition for processing.
                      </p>
                      {personalDataExamples.map((group) => (
                        <div key={group.label}>
                          <p className="text-sm font-semibold">
                            {group.label}
                            {group.sensitive && (
                              <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                                sensitive
                              </span>
                            )}
                          </p>
                          <ul className="mt-1 list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                            {group.examples.map((ex) => (
                              <li key={ex}>{ex}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {q.key === "data_categories" && (
                  <Art9Art10Checklist activityId={currentActivity.id} />
                )}

                <PriorAnswerSuggestions
                  sessionId={currentSession?.id ?? null}
                  activityId={currentActivity.id}
                  question={q}
                  currentValue={currentAnswers[q.key]}
                  onPick={(val) => handleAnswer(q.key, val)}
                />

                <QuestionInput
                  question={q}
                  value={currentAnswers[q.key]}
                  onChange={(val) => handleAnswer(q.key, val)}
                />

                <FlagPreview question={q} value={currentAnswers[q.key]} />
              </div>
            ))}

            {/* Apply-to-all checkbox */}
            {otherIncompleteCount > 0 && (
              <div className="pt-6 border-t border-border">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="mt-1 h-4 w-4"
                    aria-label="Apply these same answers to all remaining activities"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      Use these same answers for all {otherIncompleteCount}{" "}
                      remaining activit
                      {otherIncompleteCount === 1 ? "y" : "ies"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We'll copy your answers to every other activity that
                      hasn't been completed yet, mark them complete, and take
                      you to review. You can still edit each one afterwards.
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border">
              <button
                onClick={() => navigate(currentSession ? `/ropa/review/${currentSession.id}` : "/ropa/review")}
                className="order-2 sm:order-1 text-xs underline text-muted-foreground min-h-[44px] px-2"
              >
                Skip this activity ›
              </button>
              <div className="order-1 sm:order-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <AutosaveIndicator
                  saving={isSaving || bulkSaving}
                  savedAt={lastSavedAt}
                  className="text-center sm:text-left"
                />
                <button
                  onClick={handleSubmit}
                  disabled={bulkSaving}
                  className="w-full sm:w-auto min-h-[44px] bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
                >
                  {bulkSaving
                    ? "Saving…"
                    : applyToAll
                      ? `Apply to all & continue →`
                      : otherIncompleteCount > 0
                        ? "Save & next activity →"
                        : "Save & continue to review →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom pill — opens activity nav sheet */}
      <Sheet open={activityNavOpen} onOpenChange={setActivityNavOpen}>
        <SheetTrigger asChild>
          <button
            className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background shadow-lg rounded-full px-5 py-3 min-h-[44px] text-sm font-semibold flex items-center gap-2"
            aria-label="Show all processing activities"
          >
            {completedCount} of {allActivities.length} complete <span aria-hidden>↑</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif">Processing activities</SheetTitle>
          </SheetHeader>
          <nav role="navigation" aria-label="Processing activities" className="mt-4">
            <ActivityNavList
              activities={allActivities}
              currentActivityId={currentActivity.id}
              onSelect={(aid) => {
                setActivityNavOpen(false);
                navigate(withSession(`/ropa/activity/${aid}`, currentSession?.id));
              }}
              onDelete={(aid, name) => {
                setActivityNavOpen(false);
                handleDeleteActivity(aid, name);
              }}
            />
          </nav>
        </SheetContent>
      </Sheet>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the activity and all of its answers and flags. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteActivity}>Delete activity</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RopaShell>
  );
}

function ActivityNavList({
  activities,
  currentActivityId,
  onSelect,
  onDelete,
}: {
  activities: { id: string; display_name: string; status: string }[];
  currentActivityId: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string, displayName: string) => void;
}) {
  // Determine which activities are unlocked: all complete ones, plus the
  // first non-complete activity. Everything after that is locked so users
  // are forced to work through the list sequentially.
  const firstIncompleteIdx = activities.findIndex((a) => a.status !== "complete");
  const unlockedThroughIdx =
    firstIncompleteIdx === -1 ? activities.length - 1 : firstIncompleteIdx;

  return (
    <ul className="space-y-1">
      {activities.map((a, idx) => {
        const isCurrent = a.id === currentActivityId;
        const isComplete = a.status === "complete";
        const isLocked = idx > unlockedThroughIdx && !isCurrent;
        const statusLabel = isComplete
          ? "Complete"
          : a.status === "in_progress"
            ? "In progress"
            : isLocked
              ? "Locked — complete previous activities first"
              : "Not started";
        return (
          <li key={a.id}>
            <div
              className={`group w-full rounded flex items-stretch ${
                isCurrent
                  ? "bg-primary/10 border-l-2 border-primary"
                  : isLocked
                    ? "opacity-40"
                    : "hover:bg-muted/40"
              }`}
            >
              <button
                onClick={() => !isLocked && onSelect(a.id)}
                disabled={isLocked}
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={isLocked || undefined}
                aria-label={`${a.display_name} — ${statusLabel}`}
                title={isLocked ? "Complete the previous activity first" : undefined}
                className={`flex-1 text-left text-sm px-2 py-2 min-h-[44px] flex items-start gap-2 ${
                  isLocked ? "cursor-not-allowed" : ""
                } ${isCurrent ? "font-semibold" : ""}`}
              >
                <span aria-hidden className="mt-0.5">
                  {isComplete
                    ? ""
                    : a.status === "in_progress"
                      ? "•"
                      : isLocked
                        ? ""
                        : "○"}
                </span>
                <span className="flex-1">{a.display_name}</span>
                <span className="sr-only">{statusLabel}</span>
              </button>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(a.id, a.display_name);
                  }}
                  aria-label={`Delete activity ${a.display_name}`}
                  title="Delete activity (removes all answers and flags)"
                  className="px-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = value as string | string[] | undefined;

  switch (question.type) {
    case "single_choice":
    case "lawful_basis":
      return (
        <div role="radiogroup" aria-labelledby={`q-${question.key}`} className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              role="radio"
              aria-checked={v === opt.value}
              aria-label={opt.label}
              id={`q-${question.key}-${opt.value}`}
              className={`w-full text-left p-3 rounded-lg border min-h-[52px] ${
                v === opt.value
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <div>{opt.label}</div>
              {opt.example && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  e.g. {opt.example}
                </div>
              )}
            </button>
          ))}
        </div>
      );

    case "yes_no":
      return (
        <div role="radiogroup" aria-labelledby={`q-${question.key}`} className="grid grid-cols-2 gap-2">
          {["yes", "no"].map((o) => (
            <button
              key={o}
              onClick={() => onChange(o)}
              role="radio"
              aria-checked={v === o}
              aria-label={o}
              className={`p-3 rounded-lg border capitalize font-semibold min-h-[52px] ${
                v === o
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      );

    case "yes_no_unsure":
      // RC-Cleanup3 (CEO-ratified 2026-07-14): the tri-state "yes/no/unsure"
      // render was collapsed to yes/no. The question type union in
      // src/data/ropa-questions/types.ts still exports "yes_no_unsure" for
      // legacy compatibility, but no active ROPA question uses it and any
      // legacy stored value === "unsure" will simply render as no selection
      // (radiogroup aria-checked=false on both buttons) — non-crashing; the
      // user picks a definite branch on revisit.
      return (
        <div role="radiogroup" aria-labelledby={`q-${question.key}`} className="grid grid-cols-2 gap-2">
          {["yes", "no"].map((o) => (
            <button
              key={o}
              onClick={() => onChange(o)}
              role="radio"
              aria-checked={v === o}
              aria-label={o}
              className={`p-3 rounded-lg border capitalize min-h-[52px] ${
                v === o
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      );

    case "date_or_period":
      return (
        <div role="radiogroup" aria-labelledby={`q-${question.key}`} className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              role="radio"
              aria-checked={v === opt.value}
              aria-label={opt.label}
              className={`w-full text-left p-3 rounded-lg border min-h-[52px] ${
                v === opt.value
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );

    case "multi_choice": {
      const selected = Array.isArray(v) ? (v as string[]) : [];
      return (
        <div role="group" aria-labelledby={`q-${question.key}`} className="grid sm:grid-cols-2 gap-2">
          {(question.options ?? []).map((opt) => {
            const on = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={opt.label}
                onClick={() =>
                  onChange(
                    on
                      ? selected.filter((s) => s !== opt.value)
                      : [...selected, opt.value]
                  )
                }
                className={`text-left p-3 rounded-lg border min-h-[44px] text-sm ${
                  on
                    ? "border-primary bg-primary/10 font-semibold"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "assessment_reference":
      return (
        <RelatedAssessmentPicker
          questionKey={question.key}
          value={Array.isArray(v) ? (v as string[]) : []}
          onChange={onChange}
        />
      );

    case "text_long":

      return (
        <textarea
          id={`q-${question.key}`}
          value={(v as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          aria-label={question.text}
          rows={4}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background min-h-[88px]"
        />
      );

    case "text_short":
    default:
      return (
        <input
          id={`q-${question.key}`}
          type="text"
          value={(v as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          aria-label={question.text}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background min-h-[44px]"
        />
      );
  }
}

// Cross-reference picker for question type "assessment_reference".
// Lists the signed-in account's existing LIA and DPIA records so an activity
// can point at the assessment that covers it. Renders "None on file" — never
// an invented reference — when the account has no assessments.
function RelatedAssessmentPicker({
  questionKey,
  value,
  onChange,
}: {
  questionKey: string;
  value: string[];
  onChange: (v: unknown) => void;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        if (!cancelled) {
          setOptions([]);
          setLoading(false);
        }
        return;
      }
      const [{ data: lias }, { data: dpias }] = await Promise.all([
        SUPA.from("li_assessments")
          .select("id, organization_name, processing_description, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(25),
        SUPA.from("dpia_frameworks")
          .select("id, organization_name, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);
      if (cancelled) return;
      const label = (kind: string, name: unknown, detail: unknown, created: unknown) => {
        const date = created ? String(created).slice(0, 10) : "";
        const subject =
          (typeof name === "string" && name.trim()) ||
          (typeof detail === "string" && detail.trim().slice(0, 60)) ||
          "Untitled";
        return `${kind} — ${subject}${date ? ` (${date})` : ""}`;
      };
      setOptions([
        ...(lias ?? []).map((r: any) =>
          label("LIA", r.organization_name, r.processing_description, r.created_at)
        ),
        ...(dpias ?? []).map((r: any) =>
          label("DPIA", r.organization_name, null, r.created_at)
        ),
      ]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Looking up your assessments…</p>;
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="related-assessments-empty">
        None on file. Your account has no Legitimate Interests Assessment or DPIA
        records yet, so this activity will record "None on file".
      </p>
    );
  }

  return (
    <div role="group" aria-labelledby={`q-${questionKey}`} className="space-y-2">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-label={opt}
            onClick={() =>
              onChange(on ? value.filter((s) => s !== opt) : [...value, opt])
            }
            className={`w-full text-left p-3 rounded-lg border min-h-[44px] text-sm ${
              on
                ? "border-primary bg-primary/10 font-semibold"
                : "border-border hover:bg-muted/40"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}



function FlagPreview({
  question,
  value,
}: {
  question: Question;
  value: unknown;
}) {
  if (!question.flagIf || value === undefined) return null;
  const triggered = question.flagIf.filter((c) =>
    c.operator === "equals" ? value === c.value : false
  );
  if (!triggered.length) return null;
  return (
    <div className="mt-4 space-y-2">
      {triggered.map((c, i) => (
        <div
          key={i}
          className={`p-3 rounded-lg border-l-4 ${
            c.severity === "warning"
              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
              : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          }`}
        >
          <p className="text-sm font-semibold"><AlertTriangle aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {c.message}</p>
          <p className="text-xs text-muted-foreground mt-1">{c.consequence}</p>
          {c.actionLabel && c.actionRoute ? (
            <a
              href={c.actionRoute}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline text-primary mt-2 inline-block"
            >
              {c.actionLabel} →
            </a>
          ) : c.actionLabel ? (
            <p className="text-xs text-primary mt-2 inline-block">
              {c.actionLabel}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PriorAnswerSuggestions({
  sessionId,
  activityId,
  question,
  currentValue,
  onPick,
}: {
  sessionId: string | null;
  activityId: string;
  question: Question;
  currentValue: unknown;
  onPick: (val: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<
    { value: string; activityName: string }[]
  >([]);

  // Only show autofill for free-text questions
  const isTextType =
    question.type === "text_long" || question.type === "text_short";

  useEffect(() => {
    if (!isTextType || !sessionId) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: answerRows } = await SUPA.from("ropa_answers")
        .select("activity_id, answer_value")
        .eq("session_id", sessionId)
        .eq("question_key", question.key)
        .neq("activity_id", activityId);

      if (cancelled || !answerRows?.length) {
        setSuggestions([]);
        return;
      }

      const activityIds = Array.from(
        new Set(answerRows.map((r: any) => r.activity_id))
      );
      const { data: activityRows } = await SUPA.from(
        "ropa_processing_activities"
      )
        .select("id, display_name")
        .in("id", activityIds);

      const nameById = new Map<string, string>(
        (activityRows ?? []).map((a: any) => [a.id, a.display_name])
      );

      // Dedupe by value; keep first activity that used it
      const seen = new Set<string>();
      const items: { value: string; activityName: string }[] = [];
      for (const r of answerRows as any[]) {
        const val =
          typeof r.answer_value === "string"
            ? r.answer_value
            : r.answer_value == null
              ? ""
              : String(r.answer_value);
        if (!val.trim() || seen.has(val)) continue;
        seen.add(val);
        items.push({
          value: val,
          activityName: nameById.get(r.activity_id) ?? "previous activity",
        });
        if (items.length >= 5) break;
      }
      if (!cancelled) setSuggestions(items);
    })();
    return () => {
      cancelled = true;
    };
  }, [isTextType, sessionId, activityId, question.key]);

  if (!suggestions.length) return null;

  return (
    <div className="mb-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        Reuse a previous answer
      </p>
      <div className="flex flex-col gap-2">
        {suggestions.map((s, i) => {
          const isSelected = currentValue === s.value;
          const preview =
            s.value.length > 140 ? s.value.slice(0, 140) + "…" : s.value;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(s.value)}
              aria-pressed={isSelected}
              className={`text-left text-sm rounded-md border p-2 min-h-[44px] transition ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {isSelected ? <CheckCircle2 size={12} strokeWidth={1.75} aria-hidden /> : null}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    From: {s.activityName}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{preview}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
