import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRopaStore } from "@/stores/ropaStore";
import { RopaShell } from "@/components/ropa/RopaShell";
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
      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside
          className="hidden md:block border border-border rounded-xl p-4 bg-card h-fit"
          aria-label="Processing activities"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Activities
          </p>
          <ul className="space-y-1">
            {allActivities.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => navigate(`/ropa/activity/${a.id}`)}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded ${
                    a.id === currentActivity.id
                      ? "bg-primary/10 border-l-2 border-primary font-semibold"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <span className="mr-2">
                    {a.status === "complete"
                      ? "✓"
                      : a.status === "in_progress"
                        ? "•"
                        : "○"}
                  </span>
                  {a.display_name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Question zone */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl flex-1">
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

          <div className="bg-card border border-border rounded-xl p-6">
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
              <summary className="cursor-pointer text-muted-foreground">
                ⓘ Why we ask this
              </summary>
              <p className="mt-2 text-muted-foreground">{q.whyWeAsk}</p>
            </details>

            <QuestionInput
              question={q}
              value={currentAnswers[q.key]}
              onChange={handleAnswer}
            />

            {/* Flag preview if just-saved value triggers a flag */}
            <FlagPreview question={q} value={currentAnswers[q.key]} />

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <button
                onClick={() =>
                  setQuestionIndex((i) => Math.max(0, i - 1))
                }
                disabled={questionIndex === 0}
                className="text-sm underline text-muted-foreground disabled:opacity-30"
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  {isSaving
                    ? "Saving…"
                    : lastSavedAt
                      ? "Saved ✓"
                      : ""}
                </span>
                <button
                  onClick={goNext}
                  disabled={
                    q.isRequired &&
                    (currentAnswers[q.key] === undefined ||
                      currentAnswers[q.key] === "")
                  }
                  className="bg-primary text-primary-foreground font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
                >
                  {questionIndex < visibleQuestions.length - 1
                    ? "Next →"
                    : "Mark complete →"}
                </button>
              </div>
            </div>

            <div className="mt-3 text-right">
              <button
                onClick={() => navigate("/ropa/review")}
                className="text-xs underline text-muted-foreground"
              >
                Skip this activity ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </RopaShell>
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
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              id={`q-${question.key}-${opt.value}`}
              className={`w-full text-left p-3 rounded-lg border ${
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
        <div className="grid grid-cols-2 gap-2">
          {["yes", "no"].map((o) => (
            <button
              key={o}
              onClick={() => onChange(o)}
              className={`p-3 rounded-lg border capitalize font-semibold ${
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
        <div className="grid grid-cols-3 gap-2">
          {["yes", "no", "unsure"].map((o) => (
            <button
              key={o}
              onClick={() => onChange(o)}
              className={`p-3 rounded-lg border capitalize ${
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
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`w-full text-left p-3 rounded-lg border ${
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
          rows={4}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
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
          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
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
