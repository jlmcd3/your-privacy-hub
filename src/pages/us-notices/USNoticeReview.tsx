import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb,
  Pencil,
  Loader2,
} from "lucide-react";
import { USNoticeShell } from "@/components/us-notices/USNoticeShell";
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
import FreeRunIndicator from "@/components/FreeRunIndicator";
import { useUsNoticeSessionGuard } from "@/hooks/useUsNoticeSessionGuard";
import {
  buildQuestionSet,
  isQuestionInScope,
  STATE_TO_JURISDICTION,
  type Question,
  type FlagCondition,
} from "@/data/us-notice-questions";

type AnswerValue = string | string[] | null;

interface StateRow {
  state_code: string;
  state_name: string;
  framework_type: string;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  ccpa: "CCPA",
  virginia_model: "Virginia model",
  maryland: "Maryland (MODPA)",
  florida: "Florida (FDBR)",
  pending: "Pending",
};

function evaluateShowIf(q: Question, answers: Record<string, AnswerValue>): boolean {
  if (!q.showIf) return true;
  const v = answers[q.showIf.questionKey];
  switch (q.showIf.operator) {
    case "equals":
      return v === q.showIf.value;
    case "not_equals":
      return v !== q.showIf.value;
    case "contains": {
      const targets = Array.isArray(q.showIf.value)
        ? q.showIf.value
        : [q.showIf.value];
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

function formatAnswer(q: Question, value: AnswerValue): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    const labels = value.map((v) => {
      const opt = q.options?.find((o) => o.value === v);
      return opt?.label ?? v;
    });
    return labels.join(", ");
  }
  const opt = q.options?.find((o) => o.value === value);
  return opt?.label ?? String(value);
}

/**
 * Group questions into logical sections for the review.
 * Universal -> Sale/sharing -> CCPA -> Virginia model -> Maryland -> Florida -> Other
 */
function groupQuestion(q: Question): { id: string; label: string; order: number } {
  const j = q.jurisdictionOnly?.[0];
  if (!j) return { id: "universal", label: "Business & data basics", order: 0 };
  if (j === "US_CCPA") return { id: "ccpa", label: "California (CCPA/CPRA)", order: 2 };
  if (j === "US_MD") return { id: "md", label: "Maryland (MODPA)", order: 4 };
  if (j === "US_FL") return { id: "fl", label: "Florida (FDBR)", order: 5 };
  // Virginia-model packs share the same first jurisdiction (US_VA) when shared.
  if (q.jurisdictionOnly && q.jurisdictionOnly.length > 1) {
    return { id: "vam", label: "Virginia-model states", order: 3 };
  }
  return {
    id: `state-${j}`,
    label: `${j.replace("US_", "")} specific`,
    order: 6,
  };
}

export default function USNoticeReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authorized } = useUsNoticeSessionGuard(sessionId);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [states, setStates] = useState<StateRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  useEffect(() => {
    if (!sessionId || !authorized) return;

    (async () => {
      setLoading(true);
      try {
        const [statesRes, answersRes] = await Promise.all([
          supabase
            .from("us_notice_state_selections")
            .select("state_code, state_name, framework_type")
            .eq("session_id", sessionId),
          supabase
            .from("us_notice_answers")
            .select("question_key, answer_value")
            .eq("session_id", sessionId),
        ]);

        if (statesRes.error) throw statesRes.error;
        if (answersRes.error) throw answersRes.error;

        const stateRows = (statesRes.data ?? []) as StateRow[];
        if (stateRows.length === 0) {
          toast({
            title: "Select states first",
            description: "Choose which states your notice should cover before reviewing.",
          });
          navigate(`/us-notices/${sessionId}/states`);
          return;
        }

        const loaded: Record<string, AnswerValue> = {};
        for (const row of answersRes.data ?? []) {
          loaded[row.question_key] = row.answer_value as AnswerValue;
        }

        setStates(stateRows);
        setAnswers(loaded);
      } catch (err) {
        console.error("[USNoticeReview] load error", err);
        toast({
          title: "Couldn't load your review",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate, toast, authorized]);

  const selectedStateCodes = useMemo(
    () => states.map((s) => s.state_code),
    [states],
  );

  // Build the visible question set with the same rules as USNoticeQuestions.
  const visibleQuestions = useMemo(() => {
    if (selectedStateCodes.length === 0) return [];
    const all = buildQuestionSet(selectedStateCodes);
    return all.filter(
      (q) => isQuestionInScope(q, selectedStateCodes) && evaluateShowIf(q, answers),
    );
  }, [selectedStateCodes, answers]);

  // Group questions for the accordion.
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { id: string; label: string; order: number; items: Question[] }
    >();
    for (const q of visibleQuestions) {
      const g = groupQuestion(q);
      const existing = map.get(g.id);
      if (existing) {
        existing.items.push(q);
      } else {
        map.set(g.id, { ...g, items: [q] });
      }
    }
    return [...map.values()].sort((a, b) => a.order - b.order);
  }, [visibleQuestions]);

  // Aggregate triggered flags + missing required answers.
  const { triggeredFlags, missingRequired } = useMemo(() => {
    const flags: { question: Question; flag: FlagCondition }[] = [];
    const missing: Question[] = [];
    for (const q of visibleQuestions) {
      const v = answers[q.key];
      const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
      if (q.isRequired && empty) missing.push(q);
      for (const f of q.flagIf ?? []) {
        if (evaluateFlag(f, v)) flags.push({ question: q, flag: f });
      }
    }
    return { triggeredFlags: flags, missingRequired: missing };
  }, [visibleQuestions, answers]);

  // Computed quality checks — defensive validations on top of declarative flags.
  // These cover cross-question consistency that can't be expressed via flagIf alone.
  const qualityIssues = useMemo(() => {
    const issues: { id: string; severity: "warning" | "info" | "recommendation"; message: string }[] = [];
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1) Privacy contact email must be a valid email address.
    const emailKeys = ["privacy_contact_email", "contact_email", "dpo_email"];
    for (const k of emailKeys) {
      const v = answers[k];
      if (typeof v === "string" && v.trim() !== "" && !EMAIL_RE.test(v.trim())) {
        issues.push({
          id: `email-${k}`,
          severity: "warning",
          message: `The contact email you entered (${v}) doesn't look like a valid email address. Update it before publishing — users rely on this to exercise their rights.`,
        });
        break;
      }
    }

    // 2) Sale-vs-opt-out consistency: if you sell or share data, you must offer an opt-out mechanism.
    const sellsData = answers["sells_personal_info"] === "yes" || answers["shares_for_targeted_ads"] === "yes";
    const hasOptOut =
      answers["opt_out_mechanism"] != null &&
      answers["opt_out_mechanism"] !== "none" &&
      answers["opt_out_mechanism"] !== "";
    if (sellsData && !hasOptOut) {
      issues.push({
        id: "sale-without-optout",
        severity: "warning",
        message:
          "You indicated you sell or share personal information for targeted advertising, but no opt-out mechanism is configured. CCPA, CPA, CTDPA and most Virginia-model laws require a clear, easy-to-use opt-out (e.g. a 'Do Not Sell or Share' link or GPC honoring).",
      });
    }

    // 3) Children's data handling must be disclosed when collecting from minors.
    const collectsFromMinors =
      answers["collects_from_minors"] === "yes" ||
      (Array.isArray(answers["audience_includes"]) &&
        (answers["audience_includes"] as string[]).some((x) => x === "minors_13_16" || x === "children_under_13"));
    const hasMinorDisclosure =
      answers["minor_data_handling"] != null && answers["minor_data_handling"] !== "";
    if (collectsFromMinors && !hasMinorDisclosure) {
      issues.push({
        id: "minor-data-undisclosed",
        severity: "warning",
        message:
          "Your audience includes minors but you haven't disclosed how children's data is handled. Most state laws (and COPPA federally) require explicit consent flows and disclosure for users under 16.",
      });
    }

    // 4) Ad-platform inconsistency: declared ad platforms but said you don't share data for ads.
    const adPlatforms = Array.isArray(answers["ad_platforms_used"])
      ? (answers["ad_platforms_used"] as string[])
      : [];
    const declaresAds = adPlatforms.length > 0 && !adPlatforms.includes("none");
    if (declaresAds && answers["shares_for_targeted_ads"] === "no") {
      issues.push({
        id: "ad-platform-inconsistency",
        severity: "info",
        message: `You listed ad platforms (${adPlatforms.join(", ")}) but indicated you don't share data for targeted advertising. Many ad platforms automatically receive identifiers — confirm with each platform whether your usage qualifies as "sharing" under CCPA/CPRA.`,
      });
    }

    // 5) Retention default fallback — recommend a sensible default if missing.
    const retention = answers["data_retention_period"];
    const retentionEmpty =
      retention == null || retention === "" || (Array.isArray(retention) && retention.length === 0);
    if (retentionEmpty) {
      issues.push({
        id: "retention-default",
        severity: "recommendation",
        message:
          "No retention period specified. We'll default to 'as long as necessary for the purposes described, then deleted within 90 days.' You can customize this in your final notice.",
      });
    }

    return issues;
  }, [answers]);

  const warningCount =
    triggeredFlags.filter((t) => t.flag.severity === "warning").length +
    qualityIssues.filter((q) => q.severity === "warning").length;
  const infoCount =
    triggeredFlags.filter((t) => t.flag.severity === "info").length +
    qualityIssues.filter((q) => q.severity === "info").length;
  const recCount =
    triggeredFlags.filter((t) => t.flag.severity === "recommendation").length +
    qualityIssues.filter((q) => q.severity === "recommendation").length;

  async function handleGenerate() {
    if (!sessionId) return;
    if (missingRequired.length > 0) {
      toast({
        title: "Some required answers are missing",
        description: `Please answer ${missingRequired.length} required question${
          missingRequired.length === 1 ? "" : "s"
        } before generating your notices.`,
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    const { error } = await supabase
      .from("us_notice_sessions")
      .update({
        status: "ready_to_generate",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    setGenerating(false);

    if (error) {
      console.error("[USNoticeReview] session update error", error);
      toast({
        title: "Couldn't save progress",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    navigate(`/us-notices/${sessionId}/documents`);
  }

  if (loading) {
    return (
      <USNoticeShell title="Review Your Notices — End User Privacy" heading="Review your notices" step="review" sessionId={sessionId}>
        <Skeleton className="h-24 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </USNoticeShell>
    );
  }

  return (
    <USNoticeShell
      title="Review Your Notices — End User Privacy"
      heading="Review your notices"
      step="review"
      sessionId={sessionId}
    >
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Confirm your answers and resolve any flags before generating your state-by-state
        privacy notices.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <SummaryCard
          icon={CheckCircle2}
          label="States covered"
          value={states.length}
          tone="default"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Warnings"
          value={warningCount + missingRequired.length}
          tone={warningCount + missingRequired.length > 0 ? "warning" : "default"}
        />
        <SummaryCard icon={Info} label="Info notes" value={infoCount} tone="info" />
        <SummaryCard
          icon={Lightbulb}
          label="Recommendations"
          value={recCount}
          tone="default"
        />
      </div>

      {/* States covered */}
      <Card className="mb-6">
        <CardContent className="p-4 md:p-6">
          <h2 className="font-serif mb-3">States in this notice set</h2>
          <div className="flex flex-wrap gap-2">
            {states.map((s) => (
              <Badge key={s.state_code} variant="secondary" className="text-xs">
                {s.state_name} · {FRAMEWORK_LABELS[s.framework_type] ?? s.framework_type}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Missing required */}
      {missingRequired.length > 0 && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0"
                aria-hidden
              />
              <div className="flex-1">
                <h2 className="mb-2">
                  {missingRequired.length} required question
                  {missingRequired.length === 1 ? "" : "s"} unanswered
                </h2>
                <ul className="text-sm space-y-1 mb-3">
                  {missingRequired.slice(0, 5).map((q) => (
                    <li key={q.key} className="text-muted-foreground">
                      • {q.text}
                    </li>
                  ))}
                  {missingRequired.length > 5 && (
                    <li className="text-muted-foreground italic">
                      …and {missingRequired.length - 5} more
                    </li>
                  )}
                </ul>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/us-notices/${sessionId}/questions`}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Finish answering
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Triggered flags */}
      {triggeredFlags.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <h2 className="font-serif mb-4">Flags & recommendations</h2>
            <div className="space-y-3">
              {triggeredFlags.map(({ question, flag }, i) => (
                <FlagRow key={`${question.key}-${i}`} flag={flag} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Computed quality checks */}
      {qualityIssues.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <h2 className="font-serif mb-4">Quality checks</h2>
            <div className="space-y-3">
              {qualityIssues.map((issue) => (
                <FlagRow
                  key={issue.id}
                  flag={{
                    severity: issue.severity,
                    message: issue.message,
                    operator: "equals",
                    value: "",
                    flagType: "recommendation",
                    consequence: "",
                  } as FlagCondition}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped answers */}
      <Card className="mb-8">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif">Your answers</h2>
            <Button asChild size="sm" variant="ghost">
              <Link to={`/us-notices/${sessionId}/questions`}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Link>
            </Button>
          </div>

          <Accordion type="multiple" defaultValue={groups.map((g) => g.id)}>
            {groups.map((group) => (
              <AccordionItem value={group.id} key={group.id}>
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2 text-left">
                    <span className="font-medium">{group.label}</span>
                    <Badge variant="outline" className="text-meta font-mono">
                      {group.items.length}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <dl className="space-y-4 pt-2">
                    {group.items.map((q) => {
                      const v = answers[q.key];
                      const empty =
                        v == null || v === "" || (Array.isArray(v) && v.length === 0);
                      return (
                        <div
                          key={q.key}
                          className="border-l-2 border-muted pl-4 py-1"
                        >
                          <dt className="text-sm text-muted-foreground mb-1">
                            {q.text}
                          </dt>
                          <dd
                            className={
                              empty
                                ? "text-sm italic text-destructive/80"
                                : "text-sm text-foreground"
                            }
                          >
                            {empty
                              ? q.isRequired
                                ? "Required — not answered"
                                : "Skipped"
                              : formatAnswer(q, v)}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to={`/us-notices/${sessionId}/questions`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to questions
          </Link>
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={generating || missingRequired.length > 0}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Generate my notices
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </USNoticeShell>
  );
}

// Suppress unused-import lint for STATE_TO_JURISDICTION (kept for future review filters).
void STATE_TO_JURISDICTION;

// ---------------- Subcomponents ----------------

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: "default" | "warning" | "info";
}) {
  const toneClass =
    tone === "warning"
      ? "border-destructive/40 bg-destructive/5"
      : tone === "info"
        ? "border-primary/30 bg-primary/5"
        : "";
  return (
    <Card className={toneClass}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </div>
        <div className="font-serif text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}

function FlagRow({ flag }: { flag: FlagCondition }) {
  const tone =
    flag.severity === "warning"
      ? "border-destructive/40 bg-destructive/5"
      : flag.severity === "info"
        ? "border-primary/30 bg-primary/5"
        : "border-muted bg-muted/40";

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
