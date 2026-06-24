import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Info, AlertTriangle, Lightbulb } from "lucide-react";
import { USNoticeShell } from "@/components/us-notices/USNoticeShell";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import { AutosaveIndicator } from "@/components/AutosaveIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExhibitTextarea } from "@/components/ExhibitTextarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUsNoticeSessionGuard } from "@/hooks/useUsNoticeSessionGuard";
import {
  buildQuestionSet,
  isQuestionInScope,
  type Question,
  type FlagCondition,
} from "@/data/us-notice-questions";
import { Req, RequiredLegend } from "@/components/RequiredMark";

type AnswerValue = string | string[] | null;

function evaluateShowIf(
  q: Question,
  answers: Record<string, AnswerValue>,
): boolean {
  if (!q.showIf) return true;
  const v = answers[q.showIf.questionKey];
  const target = q.showIf.value;
  switch (q.showIf.operator) {
    case "equals":
      return v === target;
    case "not_equals":
      return v !== target;
    case "contains":
      if (Array.isArray(v)) {
        if (Array.isArray(target)) return target.some((t) => v.includes(t));
        return v.includes(target as string);
      }
      return false;
  }
}

function evaluateFlag(
  flag: FlagCondition,
  value: AnswerValue,
): boolean {
  if (value == null) return false;
  if (flag.operator === "equals") {
    return value === flag.value;
  }
  // contains
  const targets = Array.isArray(flag.value) ? flag.value : [flag.value];
  if (Array.isArray(value)) return targets.some((t) => value.includes(t));
  return targets.includes(value);
}

export default function USNoticeQuestions() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authorized } = useUsNoticeSessionGuard(sessionId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load session, selected states, and any existing answers.
  useEffect(() => {
    if (!sessionId || !authorized) return;

    (async () => {
      setLoading(true);
      try {
        const [statesRes, answersRes] = await Promise.all([
          supabase
            .from("us_notice_state_selections")
            .select("state_code")
            .eq("session_id", sessionId),
          supabase
            .from("us_notice_answers")
            .select("question_key, answer_value")
            .eq("session_id", sessionId),
        ]);

        if (statesRes.error) throw statesRes.error;
        if (answersRes.error) throw answersRes.error;

        const states = (statesRes.data ?? []).map((r) => r.state_code);
        if (states.length === 0) {
          toast({
            title: "Select states first",
            description: "Choose which states your notice should cover before answering questions.",
          });
          navigate(`/us-notices/${sessionId}/states`);
          return;
        }

        const loaded: Record<string, AnswerValue> = {};
        for (const row of answersRes.data ?? []) {
          loaded[row.question_key] = row.answer_value as AnswerValue;
        }

        setSelectedStates(states);
        setAnswers(loaded);
      } catch (err) {
        console.error("[USNoticeQuestions] load error", err);
        toast({
          title: "Couldn't load your session",
          description: "Please try again or return to the dashboard.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate, toast, authorized]);

  // Build the question set and apply showIf + jurisdictionOnly filters.
  const visibleQuestions = useMemo(() => {
    if (selectedStates.length === 0) return [];
    const all = buildQuestionSet(selectedStates);
    return all.filter(
      (q) => isQuestionInScope(q, selectedStates) && evaluateShowIf(q, answers),
    );
  }, [selectedStates, answers]);

  // Clamp index when the visible set shrinks (e.g. showIf hides current question).
  useEffect(() => {
    if (currentIndex >= visibleQuestions.length && visibleQuestions.length > 0) {
      setCurrentIndex(visibleQuestions.length - 1);
    }
  }, [visibleQuestions.length, currentIndex]);

  const currentQuestion = visibleQuestions[currentIndex];
  const progressPct = visibleQuestions.length
    ? Math.round(((currentIndex + 1) / visibleQuestions.length) * 100)
    : 0;

  // Persist a single answer (upsert).
  async function persistAnswer(key: string, value: AnswerValue) {
    if (!sessionId) return;
    setSaving(true);
    // Partial unique index (WHERE ropa_activity_id IS NULL) cannot be targeted
    // by supabase-js .upsert({ onConflict }) — it raises 42P10 and the answer is
    // lost. Manual upsert: update the universal row if present, else insert.
    const { data: updated, error: updError } = await supabase
      .from("us_notice_answers")
      .update({ answer_value: value as never })
      .eq("session_id", sessionId)
      .eq("question_key", key)
      .is("ropa_activity_id", null)
      .select("question_key");
    let error = updError;
    if (!error && (!updated || updated.length === 0)) {
      const { error: insError } = await supabase
        .from("us_notice_answers")
        .insert({ session_id: sessionId, question_key: key, answer_value: value as never, ropa_activity_id: null });
      error = insError;
    }
    setSaving(false);
    if (error) {
      console.error("[USNoticeQuestions] persist error", error);
      toast({
        title: "Couldn't save your answer",
        description: "Your answer is shown but didn't save. Please try again.",
        variant: "destructive",
      });
      return;
    }
    setLastSavedAt(new Date());
  }

  function setAnswer(key: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    void persistAnswer(key, value);
  }

  async function handleNext() {
    if (!currentQuestion) return;
    if (currentQuestion.isRequired) {
      const v = answers[currentQuestion.key];
      const empty =
        v == null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0);
      if (empty) {
        toast({
          title: "Answer required",
          description: "Please answer this question to continue.",
        });
        return;
      }
    }

    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
      return;
    }

    // Last question — mark session and move to review.
    setSaving(true);
    const { error } = await supabase
      .from("us_notice_sessions")
      .update({
        status: "questions_complete",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionId!);
    setSaving(false);

    if (error) {
      console.error("[USNoticeQuestions] session update error", error);
      toast({
        title: "Couldn't save progress",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    navigate(`/us-notices/${sessionId}/review`);
  }

  function handleBack() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else {
      navigate(`/us-notices/${sessionId}/states`);
    }
  }

  if (loading) {
    return (
      <USNoticeShell title="Questions — US Notice Builder" heading="Questions" step="questions" sessionId={sessionId}>
        <Skeleton className="h-3 w-full mb-6" />
        <Skeleton className="h-40 w-full" />
      </USNoticeShell>
    );
  }

  if (!currentQuestion) {
    return (
      <USNoticeShell title="Questions — US Notice Builder" heading="Questions" step="questions" sessionId={sessionId}>
        <p className="text-muted-foreground text-sm">
          No questions to display for the selected states.
        </p>
      </USNoticeShell>
    );
  }

  const value = answers[currentQuestion.key];
  const triggeredFlags =
    currentQuestion.flagIf?.filter((f) => evaluateFlag(f, value)) ?? [];

  return (
    <USNoticeShell title="Questions — US Notice Builder" heading="Questions" step="questions" sessionId={sessionId}>
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>
            Question {currentIndex + 1} of {visibleQuestions.length}
          </span>
          <div className="flex items-center gap-3">
            <AutosaveIndicator saving={saving} savedAt={lastSavedAt} />
            <span>{progressPct}%</span>
          </div>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <Card>
        <CardContent className="p-6 md:p-8 space-y-6">
          <RequiredLegend />
          {/* Jurisdiction badges */}
          {currentQuestion.jurisdictionOnly && currentQuestion.jurisdictionOnly.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currentQuestion.jurisdictionOnly.map((j) => (
                <Badge key={j} variant="secondary" className="font-mono text-meta">
                  {j.replace("US_", "")}
                </Badge>
              ))}
            </div>
          )}

          {/* Question text */}
          <h2 className="font-serif text-foreground leading-snug">
            {currentQuestion.text}
            {currentQuestion.isRequired && <Req />}
          </h2>

          {/* Why we ask */}
          {currentQuestion.whyWeAsk && (
            <div className="flex gap-2 text-sm text-muted-foreground bg-muted/40 rounded-md p-3">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden />
              <span>{currentQuestion.whyWeAsk}</span>
            </div>
          )}

          {/* Input */}
          <QuestionInput
            question={currentQuestion}
            value={value}
            onChange={(v) => setAnswer(currentQuestion.key, v)}
          />

          {/* Triggered flags */}
          {triggeredFlags.length > 0 && (
            <div className="space-y-3">
              {triggeredFlags.map((f, i) => (
                <FlagBanner key={i} flag={f} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={saving}
          className="w-full sm:w-auto min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
          {currentIndex === 0 ? "Back to states" : "Previous"}
        </Button>
        <Button
          onClick={handleNext}
          disabled={saving}
          className="w-full sm:w-auto min-h-[44px]"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden /> : null}
          {currentIndex === visibleQuestions.length - 1 ? "Continue to review" : "Next"}
          <ArrowRight className="h-4 w-4 ml-2" aria-hidden />
        </Button>
      </div>
    </USNoticeShell>
  );
}

// ---------------- Helpers ----------------

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  switch (question.type) {
    case "text_short":
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer"
        />
      );
    case "text_long":
    case "date_or_period":
      return (
        <>
          {["third_party_categories", "or_specific_third_parties"].includes(question.key) ? (
            <ExhibitTextarea
              value={(value as string) ?? ""}
              onChange={onChange}
              placeholder="Type your answer"
              rows={4}
            />
          ) : (
            <Textarea
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your answer"
              rows={4}
            />
          )}
          <IntakeGuidance className="mt-2">Answer as specifically and completely as you can — anything left vague or blank becomes placeholder text in your published notice.</IntakeGuidance>
        </>
      );
    case "yes_no":
      return (
        <RadioGroup
          value={(value as string) ?? ""}
          onValueChange={onChange}
          className="space-y-2"
        >
          {[
            { v: "yes", l: "Yes" },
            { v: "no", l: "No" },
          ].map((opt) => (
            <div key={opt.v} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.v} id={`${question.key}-${opt.v}`} />
              <Label htmlFor={`${question.key}-${opt.v}`} className="cursor-pointer">
                {opt.l}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    case "yes_no_unsure":
      return (
        <RadioGroup
          value={(value as string) ?? ""}
          onValueChange={onChange}
          className="space-y-2"
        >
          {[
            { v: "yes", l: "Yes" },
            { v: "no", l: "No" },
            { v: "unsure", l: "Unsure — flag for review" },
          ].map((opt) => (
            <div key={opt.v} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.v} id={`${question.key}-${opt.v}`} />
              <Label htmlFor={`${question.key}-${opt.v}`} className="cursor-pointer">
                {opt.l}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    case "single_choice":
      return (
        <RadioGroup
          value={(value as string) ?? ""}
          onValueChange={onChange}
          className="space-y-2"
        >
          {(question.options ?? []).map((opt) => (
            <div key={opt.value} className="flex items-start space-x-2">
              <RadioGroupItem
                value={opt.value}
                id={`${question.key}-${opt.value}`}
                className="mt-1"
              />
              <Label
                htmlFor={`${question.key}-${opt.value}`}
                className="cursor-pointer leading-snug"
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    case "multi_choice": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <div key={opt.value} className="flex items-start space-x-2">
                <Checkbox
                  id={`${question.key}-${opt.value}`}
                  checked={checked}
                  onCheckedChange={(c) => {
                    const next = c
                      ? [...selected, opt.value]
                      : selected.filter((s) => s !== opt.value);
                    onChange(next);
                  }}
                  className="mt-1"
                />
                <Label
                  htmlFor={`${question.key}-${opt.value}`}
                  className="cursor-pointer leading-snug"
                >
                  {opt.label}
                </Label>
              </div>
            );
          })}
        </div>
      );
    }
    case "platform_search":
    case "lawful_basis":
    default:
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer"
          rows={3}
        />
      );
  }
}

function FlagBanner({ flag }: { flag: FlagCondition }) {
  const tone =
    flag.severity === "warning"
      ? "border-destructive/40 bg-destructive/5 text-foreground"
      : flag.severity === "info"
        ? "border-primary/30 bg-primary/5 text-foreground"
        : "border-muted bg-muted/40 text-foreground";

  const Icon =
    flag.severity === "warning"
      ? AlertTriangle
      : flag.severity === "info"
        ? Info
        : Lightbulb;

  return (
    <div className={`border rounded-md p-3 flex gap-3 ${tone}`}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden />
      <div className="text-sm space-y-1">
        <p className="font-medium">{flag.message}</p>
        <p className="text-muted-foreground">{flag.consequence}</p>
      </div>
    </div>
  );
}
