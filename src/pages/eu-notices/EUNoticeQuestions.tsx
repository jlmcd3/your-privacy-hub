import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Info, AlertTriangle } from "lucide-react";
import { EUNoticeShell } from "@/components/eu-notices/EUNoticeShell";
import { AutosaveIndicator } from "@/components/AutosaveIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEuNoticeSessionGuard } from "@/hooks/useEuNoticeSessionGuard";
import { buildEuQuestionSections } from "@/data/eu-notice-questions";
import type { EuFrameworkCode } from "@/data/eu-notice-questions/types";
import type { Question, FlagCondition } from "@/data/ropa-questions/types";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";

function popoverKeyForQuestion(key: string): string | null {
  const k = key.toLowerCase();
  if (k.includes("lawful_basis") || k.includes("legal_basis")) return "gdpr_lawful_basis";
  if (k.includes("transfer") || k.includes("scc")) return "gdpr_international_transfer";
  if (k.includes("special_categor") || k.includes("sensitive")) return "gdpr_special_categories";
  return null;
}

type AnswerValue = string | string[] | null;

function evaluateShowIf(q: Question, answers: Record<string, AnswerValue>): boolean {
  if (!q.showIf) return true;
  const v = answers[q.showIf.questionKey];
  switch (q.showIf.operator) {
    case "equals": return v === q.showIf.value;
    case "not_equals": return v !== q.showIf.value;
    case "contains": {
      const targets = Array.isArray(q.showIf.value) ? q.showIf.value : [q.showIf.value];
      if (Array.isArray(v)) return targets.some((t) => v.includes(t));
      return false;
    }
  }
}

function evaluateFlag(flag: FlagCondition, value: AnswerValue): boolean {
  if (value == null) return false;
  if (flag.operator === "equals") return value === flag.value;
  const targets = Array.isArray(flag.value) ? flag.value : [flag.value];
  if (Array.isArray(value)) return targets.some((t) => value.includes(t));
  return targets.includes(value);
}

export default function EUNoticeQuestions() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authorized } = useEuNoticeSessionGuard(sessionId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [frameworks, setFrameworks] = useState<EuFrameworkCode[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!sessionId || !authorized) return;
    (async () => {
      setLoading(true);
      try {
        const [fwRes, ansRes] = await Promise.all([
          supabase.from("eu_notice_framework_selections").select("framework_code").eq("session_id", sessionId),
          supabase.from("eu_notice_answers").select("question_key, answer_value").eq("session_id", sessionId).is("ropa_activity_id", null),
        ]);
        if (fwRes.error) throw fwRes.error;
        if (ansRes.error) throw ansRes.error;
        const fws = (fwRes.data ?? []).map((r) => r.framework_code as EuFrameworkCode);
        if (fws.length === 0) {
          toast({ title: "Pick frameworks first", description: "Choose at least one framework before answering questions." });
          navigate(`/eu-notices/frameworks/${sessionId}`);
          return;
        }
        const loaded: Record<string, AnswerValue> = {};
        for (const r of ansRes.data ?? []) loaded[r.question_key] = r.answer_value as AnswerValue;
        setFrameworks(fws);
        setAnswers(loaded);
      } catch (err) {
        console.error("[EUNoticeQuestions] load error", err);
        toast({ title: "Couldn't load session", description: "Please try again.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, authorized, navigate, toast]);

  const visibleQuestions = useMemo(() => {
    if (frameworks.length === 0) return [] as Question[];
    const sections = buildEuQuestionSections(frameworks);
    const all = sections.flatMap((s) => s.questions);
    return all.filter((q) => evaluateShowIf(q, answers));
  }, [frameworks, answers]);

  const currentQ = visibleQuestions[currentIndex];
  const progress = visibleQuestions.length > 0
    ? Math.round(((currentIndex + 1) / visibleQuestions.length) * 100)
    : 0;

  async function saveAnswer(q: Question, v: AnswerValue) {
    if (!sessionId) return;
    setAnswers((prev) => ({ ...prev, [q.key]: v }));
    setSaving(true);
    const { error } = await supabase
      .from("eu_notice_answers")
      .upsert(
        { session_id: sessionId, question_key: q.key, answer_value: v as never, ropa_activity_id: null, updated_at: new Date().toISOString() },
        { onConflict: "session_id,question_key" },
      );
    setSaving(false);
    if (error) {
      console.error("[EUNoticeQuestions] save error", error);
      return;
    }
    setLastSavedAt(new Date());
  }

  function handleNext() {
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      finish();
    }
  }
  function handlePrev() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  async function finish() {
    if (!sessionId) return;
    setSaving(true);
    await supabase
      .from("eu_notice_sessions")
      .update({ status: "review", last_activity_at: new Date().toISOString() })
      .eq("id", sessionId);
    setSaving(false);
    navigate(`/eu-notices/review/${sessionId}`);
  }

  if (loading || !currentQ) {
    return (
      <EUNoticeShell title="Questions — EU & Global Notice Builder" heading="Tell us about your processing" step="questions" sessionId={sessionId}>
        <Skeleton className="h-48 w-full" />
      </EUNoticeShell>
    );
  }

  const value = answers[currentQ.key];
  const flags = currentQ.flagIf?.filter((f) => evaluateFlag(f, value)) ?? [];

  return (
    <EUNoticeShell title="Questions — EU & Global Notice Builder" heading="Tell us about your processing" step="questions" sessionId={sessionId}>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <DefPopover termKey="gdpr_transparency" />
        <RequiredLegend />
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Question {currentIndex + 1} of {visibleQuestions.length}</span>
          <div className="flex items-center gap-3">
            <AutosaveIndicator saving={saving} savedAt={lastSavedAt} />
            <span>{progress}%</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-2">{currentQ.text}<Req />{(() => { const k = popoverKeyForQuestion(currentQ.key); return k ? <> <DefPopover termKey={k} /></> : null; })()}</h2>
          {currentQ.whyWeAsk && (
            <p className="text-xs text-muted-foreground mb-4 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{currentQ.whyWeAsk}</span>
            </p>
          )}

          {currentQ.type === "text_short" && (
            <Input value={(value as string) ?? ""} onChange={(e) => saveAnswer(currentQ, e.target.value)} placeholder="Your answer" />
          )}
          {currentQ.type === "text_long" && (
            <Textarea value={(value as string) ?? ""} onChange={(e) => saveAnswer(currentQ, e.target.value)} placeholder="Your answer" rows={4} />
          )}
          {(currentQ.type === "yes_no" || currentQ.type === "yes_no_unsure") && (
            <RadioGroup value={(value as string) ?? ""} onValueChange={(v) => saveAnswer(currentQ, v)}>
              <div className="flex items-center gap-2 py-1">
                <RadioGroupItem value="yes" id={`${currentQ.key}-yes`} />
                <Label htmlFor={`${currentQ.key}-yes`} className="cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center gap-2 py-1">
                <RadioGroupItem value="no" id={`${currentQ.key}-no`} />
                <Label htmlFor={`${currentQ.key}-no`} className="cursor-pointer">No</Label>
              </div>
              {currentQ.type === "yes_no_unsure" && (
                <div className="flex items-center gap-2 py-1">
                  <RadioGroupItem value="unsure" id={`${currentQ.key}-unsure`} />
                  <Label htmlFor={`${currentQ.key}-unsure`} className="cursor-pointer">Not sure</Label>
                </div>
              )}
            </RadioGroup>
          )}
          {currentQ.type === "single_choice" && currentQ.options && (
            <RadioGroup value={(value as string) ?? ""} onValueChange={(v) => saveAnswer(currentQ, v)}>
              {currentQ.options.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2 py-1">
                  <RadioGroupItem value={opt.value} id={`${currentQ.key}-${opt.value}`} />
                  <Label htmlFor={`${currentQ.key}-${opt.value}`} className="cursor-pointer text-sm">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
          {currentQ.type === "multi_choice" && currentQ.options && (
            <div className="space-y-1.5">
              {currentQ.options.map((opt) => {
                const arr = Array.isArray(value) ? value : [];
                const checked = arr.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-start gap-2 py-1 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        const next = c ? [...arr, opt.value] : arr.filter((x) => x !== opt.value);
                        saveAnswer(currentQ, next);
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}

          {flags.length > 0 && (
            <div className="mt-4 space-y-2">
              {flags.map((f, i) => (
                <div key={i} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-900">{f.message}</p>
                    {f.consequence && <p className="text-xs text-amber-800 mt-0.5">{f.consequence}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <Button onClick={handleNext} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : currentIndex === visibleQuestions.length - 1 ? <>Continue to review <ArrowRight className="h-4 w-4 ml-1.5" /></> : <>Next <ArrowRight className="h-4 w-4 ml-1.5" /></>}
        </Button>
      </div>
    </EUNoticeShell>
  );
}
