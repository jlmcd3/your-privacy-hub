import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRopaStore } from "@/stores/ropaStore";
import { RopaShell } from "@/components/ropa/RopaShell";
import { AutosaveIndicator } from "@/components/AutosaveIndicator";
import { RopaBreadcrumb } from "@/components/ropa/RopaBreadcrumb";
import { getRopaSteps } from "@/components/ropa/ropaFlowSteps";
import { getQuestionsForActivity } from "@/data/ropa-questions";
import type { Question } from "@/data/ropa-questions/types";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const SUPA = supabase as unknown as { from: (t: string) => any };

export default function RopaActivity() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
  const evaluateFlagsForAnswer = useRopaStore((s) => s.evaluateFlagsForAnswer);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [activityNavOpen, setActivityNavOpen] = useState(false);
  const questionCardRef = useRef<HTMLDivElement>(null);

  // Load activity + parent session
  useEffect(() => {
    if (!id) return;
    (async () => {
      await loadActivity(id);
      // also load session if not already
      const act = useRopaStore.getState().currentActivity;
      if (act && !useRopaStore.getState().currentSession) {
        await loadSession(act.session_id);
      }
    })();
  }, [id, loadActivity, loadSession]);

  const questions: Question[] = useMemo(
    () => getQuestionsForActivity(currentActivity?.template_key ?? null),
    [currentActivity?.template_key]
  );

  // After auto-advance, move focus to first focusable element of new question
  useEffect(() => {
    if (!questionCardRef.current) return;
    const focusable = questionCardRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }, [questionIndex, currentActivity?.id]);

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

  const q = visibleQuestions[questionIndex];

  const handleAnswer = async (value: unknown) => {
    if (!q || !currentActivity || !currentSession) return;
    await saveAnswer(q.key, value as never);

    // Evaluate flags (auto-creates new ones, auto-resolves stale ones, dedupes)
    if (q.flagIf) {
      await evaluateFlagsForAnswer(q.key, value as never, q.flagIf);
    }

    // Auto-advance for single-pick question types so the user gets immediate
    // visual feedback after choosing an option (e.g. lawful basis).
    const autoAdvanceTypes = new Set([
      "single_choice",
      "lawful_basis",
      "yes_no",
      "yes_no_unsure",
      "date_or_period",
    ]);
    if (autoAdvanceTypes.has(q.type)) {
      // Small delay so the selection state is visible before moving on
      setTimeout(() => {
        void goNext();
      }, 220);
    }
  };

  const goNext = async () => {
    if (questionIndex < visibleQuestions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      // Last question — mark complete
      await markActivityComplete();
      // Find next incomplete activity
      const incomplete = allActivities.find(
        (a) => a.id !== currentActivity?.id && a.status !== "complete"
      );
      if (incomplete) navigate(`/ropa/activity/${incomplete.id}`);
      else navigate("/ropa/review");
    }
  };

  if (!currentActivity) {
    return (
      <RopaShell title="Activity — RoPA Builder" heading="Loading activity…">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </RopaShell>
    );
  }

  if (!q) {
    return (
      <RopaShell
        title={`${currentActivity.display_name} — RoPA Builder`}
        heading={currentActivity.display_name}
      >
        <p className="text-muted-foreground">No questions configured.</p>
        <button
          onClick={() => navigate("/ropa/review")}
          className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold"
        >
          Continue to review →
        </button>
      </RopaShell>
    );
  }

  const completedCount = allActivities.filter((a) => a.status === "complete")
    .length;

  return (
    <RopaShell
      title={`${currentActivity.display_name} — RoPA Builder`}
      heading=""
    >
      {(() => {
        const { steps, currentIndex } = getRopaSteps("activity");
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
            onSelect={(aid) => navigate(`/ropa/activity/${aid}`)}
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
                Question {questionIndex + 1} of {visibleQuestions.length}
              </p>
              <div
                className="w-full h-1.5 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={questionIndex + 1}
                aria-valuemin={1}
                aria-valuemax={visibleQuestions.length}
                aria-label="Activity progress"
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${
                      ((questionIndex + 1) / visibleQuestions.length) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <p className="mb-1">
                {completedCount} of {allActivities.length} activities
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

          <div ref={questionCardRef} className="bg-card border border-border rounded-xl p-4 sm:p-6">
            {q.staticInfoCard && (
              <div className="mb-4 p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded">
                <p className="font-semibold text-sm">{q.staticInfoCard.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {q.staticInfoCard.body}
                </p>
              </div>
            )}

            <label
              htmlFor={`q-${q.key}`}
              className="block text-lg font-medium mb-2"
            >
              {q.text}
            </label>
            <details className="mb-4 text-sm">
              <summary className="cursor-pointer text-muted-foreground min-h-[44px] flex items-center">
                ⓘ Why we ask this
              </summary>
              <p className="mt-2 text-muted-foreground">{q.whyWeAsk}</p>
            </details>

            <PriorAnswerSuggestions
              sessionId={currentSession?.id ?? null}
              activityId={currentActivity.id}
              question={q}
              currentValue={currentAnswers[q.key]}
              onPick={(val) => handleAnswer(val)}
            />

            <QuestionInput
              question={q}
              value={currentAnswers[q.key]}
              onChange={handleAnswer}
            />

            {/* Flag preview if just-saved value triggers a flag */}
            <FlagPreview question={q} value={currentAnswers[q.key]} />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={() =>
                  setQuestionIndex((i) => Math.max(0, i - 1))
                }
                disabled={questionIndex === 0}
                aria-label="Previous question"
                className="order-2 sm:order-1 w-full sm:w-auto min-h-[44px] text-sm underline text-muted-foreground disabled:opacity-30"
              >
                ← Back
              </button>
              <div className="order-1 sm:order-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <AutosaveIndicator
                  saving={isSaving}
                  savedAt={lastSavedAt}
                  className="text-center sm:text-left"
                />
                <button
                  onClick={goNext}
                  disabled={
                    q.isRequired &&
                    (currentAnswers[q.key] === undefined ||
                      currentAnswers[q.key] === "")
                  }
                  aria-label={
                    questionIndex < visibleQuestions.length - 1
                      ? "Next question"
                      : "Mark activity complete"
                  }
                  className="w-full sm:w-auto min-h-[44px] bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
                >
                  {questionIndex < visibleQuestions.length - 1
                    ? "Next →"
                    : "Mark complete →"}
                </button>
              </div>
            </div>

            <div className="mt-3 text-center sm:text-right">
              <button
                onClick={() => navigate("/ropa/review")}
                className="text-xs underline text-muted-foreground min-h-[44px] px-2"
              >
                Skip this activity ›
              </button>
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
                navigate(`/ropa/activity/${aid}`);
              }}
            />
          </nav>
        </SheetContent>
      </Sheet>
    </RopaShell>
  );
}

function ActivityNavList({
  activities,
  currentActivityId,
  onSelect,
}: {
  activities: { id: string; display_name: string; status: string }[];
  currentActivityId: string;
  onSelect: (id: string) => void;
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
            <button
              onClick={() => !isLocked && onSelect(a.id)}
              disabled={isLocked}
              aria-current={isCurrent ? "step" : undefined}
              aria-disabled={isLocked || undefined}
              aria-label={`${a.display_name} — ${statusLabel}`}
              title={isLocked ? "Complete the previous activity first" : undefined}
              className={`w-full text-left text-sm px-2 py-2 min-h-[44px] rounded flex items-start gap-2 ${
                isCurrent
                  ? "bg-primary/10 border-l-2 border-primary font-semibold"
                  : isLocked
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-muted/40"
              }`}
            >
              <span aria-hidden className="mt-0.5">
                {isComplete
                  ? "✓"
                  : a.status === "in_progress"
                    ? "•"
                    : isLocked
                      ? "🔒"
                      : "○"}
              </span>
              <span className="flex-1">{a.display_name}</span>
              <span className="sr-only">{statusLabel}</span>
            </button>
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
      return (
        <div role="radiogroup" aria-labelledby={`q-${question.key}`} className="grid grid-cols-3 gap-2">
          {["yes", "no", "unsure"].map((o) => (
            <button
              key={o}
              onClick={() => onChange(o)}
              role="radio"
              aria-checked={v === o}
              aria-label={o === "unsure" ? "Not sure" : o}
              className={`p-3 rounded-lg border capitalize min-h-[52px] ${
                v === o
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              {o === "unsure" ? "Not sure" : o}
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
          <p className="text-sm font-semibold">⚠ {c.message}</p>
          <p className="text-xs text-muted-foreground mt-1">{c.consequence}</p>
          {c.actionLabel && c.actionRoute && (
            <a
              href={c.actionRoute}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline text-primary mt-2 inline-block"
            >
              {c.actionLabel} →
            </a>
          )}
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
                  {isSelected ? "✓" : ""}
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
