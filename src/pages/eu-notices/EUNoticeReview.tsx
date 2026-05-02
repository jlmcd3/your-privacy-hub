import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Pencil, Loader2 } from "lucide-react";
import { EUNoticeShell } from "@/components/eu-notices/EUNoticeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEuNoticeSessionGuard } from "@/hooks/useEuNoticeSessionGuard";
import { buildEuQuestionSections } from "@/data/eu-notice-questions";
import type { EuFrameworkCode } from "@/data/eu-notice-questions/types";
import type { Question } from "@/data/ropa-questions/types";

type AnswerValue = string | string[] | null;

interface FwSel {
  framework_code: string;
  framework_name: string;
  region: string;
}

function formatAnswer(q: Question, value: AnswerValue): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map((v) => q.options?.find((o) => o.value === v)?.label ?? v).join(", ");
  }
  return q.options?.find((o) => o.value === value)?.label ?? String(value);
}

export default function EUNoticeReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authorized } = useEuNoticeSessionGuard(sessionId);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [frameworks, setFrameworks] = useState<FwSel[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  useEffect(() => {
    if (!sessionId || !authorized) return;
    (async () => {
      setLoading(true);
      try {
        const [fwRes, ansRes] = await Promise.all([
          supabase.from("eu_notice_framework_selections").select("framework_code, framework_name, region").eq("session_id", sessionId),
          supabase.from("eu_notice_answers").select("question_key, answer_value").eq("session_id", sessionId).is("ropa_activity_id", null),
        ]);
        if (fwRes.error) throw fwRes.error;
        if (ansRes.error) throw ansRes.error;
        setFrameworks((fwRes.data ?? []) as FwSel[]);
        const a: Record<string, AnswerValue> = {};
        for (const r of ansRes.data ?? []) a[r.question_key] = r.answer_value as AnswerValue;
        setAnswers(a);
      } catch (err) {
        console.error(err);
        toast({ title: "Couldn't load review", description: "Please try again.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, authorized, toast]);

  const sections = useMemo(() => {
    const codes = frameworks.map((f) => f.framework_code as EuFrameworkCode);
    return buildEuQuestionSections(codes);
  }, [frameworks]);

  async function handleGenerate() {
    if (!sessionId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-eu-notice", {
        body: { session_id: sessionId },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast({ title: "Notices generated", description: "Your privacy notices are ready." });
      navigate(`/eu-notices/documents`);
    } catch (err) {
      console.error("[EUNoticeReview] generate error", err);
      toast({
        title: "Could not generate notices",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <EUNoticeShell title="Review — EU & Global Notice Builder" heading="Review your answers" step="review" sessionId={sessionId}>
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </EUNoticeShell>
    );
  }

  return (
    <EUNoticeShell title="Review — EU & Global Notice Builder" heading="Review your answers" step="review" sessionId={sessionId}>
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Review every answer before we generate your notices. You can edit any answer by going back to the questions step.
      </p>

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Frameworks ({frameworks.length})</h3>
            <Button asChild variant="ghost" size="sm">
              <button onClick={() => navigate(`/eu-notices/frameworks/${sessionId}`)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </button>
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {frameworks.map((f) => (
              <Badge key={f.framework_code} variant="secondary">{f.framework_name}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={sections.map((s) => s.key)} className="mb-8">
        {sections.map((section) => (
          <AccordionItem key={section.key} value={section.key}>
            <AccordionTrigger>{section.label}</AccordionTrigger>
            <AccordionContent>
              <ul className="divide-y">
                {section.questions.map((q) => {
                  const a = answers[q.key];
                  return (
                    <li key={q.key} className="py-3 flex items-start gap-4">
                      <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${a != null && a !== "" ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{q.text}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{formatAnswer(q, a)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate(`/eu-notices/questions/${sessionId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to questions
        </Button>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Generate notices <ArrowRight className="h-4 w-4 ml-1.5" /></>}
        </Button>
      </div>
    </EUNoticeShell>
  );
}
