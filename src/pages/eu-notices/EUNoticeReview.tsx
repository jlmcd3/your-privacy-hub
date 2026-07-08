import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Pencil,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { EUNoticeShell } from "@/components/eu-notices/EUNoticeShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToolPrice } from "@/hooks/useToolPrice";
import { useEuNoticeSessionGuard } from "@/hooks/useEuNoticeSessionGuard";
import { waitForSessionPaid } from "@/lib/checkoutConfirmation";
import { buildEuQuestionSections } from "@/data/eu-notice-questions";
import type { EuFrameworkCode } from "@/data/eu-notice-questions/types";
import type { Question } from "@/data/ropa-questions/types";
import SessionCheckoutModal, { type SessionToolType } from "@/components/SessionCheckoutModal";
import FreeRunIndicator from "@/components/FreeRunIndicator";

type AnswerValue = string | string[] | null;
type EuNoticeScope = "single" | "suite" | "full_international";
type GenStatus = "pending" | "running" | "done";

interface FwSel {
  framework_code: string;
  framework_name: string;
  region: string;
}

interface SessionRow {
  id: string;
  client_id: string;
  scope: EuNoticeScope | null;
  mode: string | null;
  status: string | null;
  is_refresh: boolean | null;
  payment_confirmed: boolean | null;
  ropa_session_id: string | null;
  version_number: number | null;
}

interface FwFlag {
  framework_code: string;
  type: "missing_required" | "warning" | "recommendation";
  message: string;
}

const SCOPE_LABEL: Record<EuNoticeScope, string> = {
  single: "Single framework",
  suite: "EU Suite",
  full_international: "Full International",
};

function scopeToToolType(scope: EuNoticeScope | null, isRefresh: boolean): SessionToolType {
  if (isRefresh) return "eu_notice_refresh";
  if (scope === "full_international") return "eu_notice_full_international";
  if (scope === "suite") return "eu_notice_suite";
  return "eu_notice_single";
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
  const { user } = useAuth();
  const { authorized } = useEuNoticeSessionGuard(sessionId);
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [clientName, setClientName] = useState("");
  const [frameworks, setFrameworks] = useState<FwSel[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  const [showAllFrameworks, setShowAllFrameworks] = useState(false);
  const [expandedFw, setExpandedFw] = useState<string | null>(null);
  const [reviewedFlags, setReviewedFlags] = useState<Set<string>>(new Set());
  const [acknowledged, setAcknowledged] = useState(false);

  const [includeHtml, setIncludeHtml] = useState(true);
  
  const [includeCombined, setIncludeCombined] = useState(true);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [genSteps, setGenSteps] = useState<Record<string, GenStatus>>({});

  // Load session, frameworks, answers, client name
  useEffect(() => {
    if (!sessionId || !authorized) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [sessRes, fwRes, ansRes] = await Promise.all([
          supabase
            .from("eu_notice_sessions")
            .select(
              "id, client_id, scope, mode, status, is_refresh, payment_confirmed, ropa_session_id, version_number",
            )
            .eq("id", sessionId)
            .single(),
          supabase
            .from("eu_notice_framework_selections")
            .select("framework_code, framework_name, region")
            .eq("session_id", sessionId),
          supabase
            .from("eu_notice_answers")
            .select("question_key, answer_value")
            .eq("session_id", sessionId)
            .is("ropa_activity_id", null),
        ]);
        if (sessRes.error) throw sessRes.error;
        if (fwRes.error) throw fwRes.error;
        if (ansRes.error) throw ansRes.error;
        if (cancelled) return;

        const sessRow = sessRes.data as unknown as SessionRow;
        setSession(sessRow);

        if (sessRow?.client_id) {
          const { data: client } = await supabase
            .from("clients")
            .select("name")
            .eq("id", sessRow.client_id)
            .maybeSingle();
          if (!cancelled) setClientName(client?.name ?? "");
        }

        setFrameworks((fwRes.data ?? []) as FwSel[]);
        const a: Record<string, AnswerValue> = {};
        for (const r of ansRes.data ?? []) a[r.question_key] = r.answer_value as AnswerValue;
        setAnswers(a);
      } catch (err) {
        console.error(err);
        toast({
          title: "Couldn't load review",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, authorized, toast]);

  // Build question sections per framework
  const sections = useMemo(() => {
    const codes = frameworks.map((f) => f.framework_code as EuFrameworkCode);
    return buildEuQuestionSections(codes);
  }, [frameworks]);

  // Compute flags inline (no eu_notice_flags table). Missing required answers
  // become "missing_required"; partially answered frameworks become "warning";
  // frameworks complete but with optional gaps surface as "recommendation".
  const fwStatus = useMemo(() => {
    const map = new Map<
      string,
      { answered: number; total: number; required: number; requiredAnswered: number }
    >();
    for (const fw of frameworks) {
      map.set(fw.framework_code, { answered: 0, total: 0, required: 0, requiredAnswered: 0 });
    }
    // Each section corresponds to one framework. We aggregate by framework code
    // by inspecting question key prefixes when present, otherwise by section.
    for (const section of sections) {
      // Section keys typically embed framework code; fall back to first framework.
      const fwCode =
        frameworks.find((f) => section.key.toLowerCase().includes(f.framework_code.toLowerCase()))
          ?.framework_code ?? frameworks[0]?.framework_code;
      if (!fwCode) continue;
      const bucket = map.get(fwCode);
      if (!bucket) continue;
      for (const q of section.questions) {
        bucket.total += 1;
        const a = answers[q.key];
        const filled = Array.isArray(a) ? a.length > 0 : a != null && a !== "";
        if (filled) bucket.answered += 1;
        const isRequired = (q as Question & { required?: boolean }).required === true;
        if (isRequired) {
          bucket.required += 1;
          if (filled) bucket.requiredAnswered += 1;
        }
      }
    }
    return map;
  }, [sections, answers, frameworks]);

  const flags = useMemo<FwFlag[]>(() => {
    const out: FwFlag[] = [];
    for (const fw of frameworks) {
      const s = fwStatus.get(fw.framework_code);
      if (!s) continue;
      if (s.required > 0 && s.requiredAnswered < s.required) {
        out.push({
          framework_code: fw.framework_code,
          type: "missing_required",
          message: `${fw.framework_name}: ${s.required - s.requiredAnswered} required answer${
            s.required - s.requiredAnswered === 1 ? "" : "s"
          } missing`,
        });
      } else if (s.answered < s.total) {
        out.push({
          framework_code: fw.framework_code,
          type: "warning",
          message: `${fw.framework_name}: ${s.total - s.answered} optional answer${
            s.total - s.answered === 1 ? "" : "s"
          } not provided`,
        });
      } else if (s.total === 0) {
        out.push({
          framework_code: fw.framework_code,
          type: "recommendation",
          message: `${fw.framework_name}: no questions configured — defaults will be used`,
        });
      }
    }
    return out;
  }, [frameworks, fwStatus]);

  const openFlags = flags.filter((f) => !reviewedFlags.has(`${f.framework_code}:${f.type}`));
  const missingRequired = openFlags.filter((f) => f.type === "missing_required");
  const warnings = openFlags.filter((f) => f.type === "warning");
  const recommendations = openFlags.filter((f) => f.type === "recommendation");

  // Filter framework cards: default = flagged/incomplete only
  const flaggedFwCodes = useMemo(
    () => new Set(openFlags.map((f) => f.framework_code)),
    [openFlags],
  );
  const visibleFrameworks = useMemo(
    () => (showAllFrameworks ? frameworks : frameworks.filter((f) => flaggedFwCodes.has(f.framework_code))),
    [frameworks, showAllFrameworks, flaggedFwCodes],
  );

  // Pricing
  const isRefresh = session?.is_refresh ?? false;
  const toolType = scopeToToolType(session?.scope ?? "single", isRefresh);
  const pricing = useToolPrice(toolType);

  // Gate logic
  const hasMissingRequired = missingRequired.length > 0;
  const hasWarningsOrRecs = !hasMissingRequired && (warnings.length > 0 || recommendations.length > 0);
  const generateDisabled = hasMissingRequired || (hasWarningsOrRecs && !acknowledged);

  // Combined option only when 3+ frameworks
  const combinedAvailable = frameworks.length >= 3;

  function markReviewed(f: FwFlag) {
    setReviewedFlags((s) => {
      const next = new Set(s);
      next.add(`${f.framework_code}:${f.type}`);
      return next;
    });
  }

  async function pollSessionUntilTerminal(
    sid: string,
  ): Promise<{ status: "generated" | "failed" | "timeout"; error?: string }> {
    const POLL_INTERVAL_MS = 3000;
    const MAX_POLLS = 60;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const { data: row } = await supabase
        .from("eu_notice_sessions")
        .select("status, generation_error")
        .eq("id", sid)
        .maybeSingle();
      if (row?.status === "generated") return { status: "generated" };
      if (row?.status === "failed") {
        return { status: "failed", error: row.generation_error ?? undefined };
      }
    }
    return { status: "timeout" };
  }

  async function runGeneration() {
    if (!sessionId) return;
    setGenerating(true);

    // Build per-framework progress steps
    const initialSteps: Record<string, GenStatus> = {
      _session: "done",
      _config: "done",
    };
    for (const fw of frameworks) initialSteps[fw.framework_code] = "running";
    if (combinedAvailable && includeCombined) initialSteps._combined = "pending";
    setGenSteps(initialSteps);

    // Tick frameworks optimistically while the edge function runs
    let i = 0;
    const tickInt = setInterval(() => {
      const fw = frameworks[i];
      if (!fw) return;
      setGenSteps((s) => ({ ...s, [fw.framework_code]: "done" }));
      i += 1;
    }, 700);

    try {
      const { data, error } = await supabase.functions.invoke("generate-eu-notice", {
        body: { session_id: sessionId },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      // 202 dispatch — poll the session row until terminal status.
      const terminal = await pollSessionUntilTerminal(sessionId);
      clearInterval(tickInt);
      if (terminal.status === "failed") {
        throw new Error(terminal.error || "Generation failed — please try again.");
      }
      if (terminal.status === "timeout") {
        throw new Error("Generation timed out. Please try again.");
      }

      const final: Record<string, GenStatus> = { _session: "done", _config: "done" };
      for (const fw of frameworks) final[fw.framework_code] = "done";
      if (combinedAvailable && includeCombined) final._combined = "done";
      setGenSteps(final);

      toast({ title: "Notices generated", description: "Your privacy notices are ready." });
      setTimeout(() => navigate("/eu-notices/documents"), 600);
    } catch (err) {
      clearInterval(tickInt);
      console.error("[EUNoticeReview] generate error", err);
      toast({
        title: "Could not generate notices",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      setGenerating(false);
    }
  }

  async function handleGenerateClick() {
    if (!session) return;
    // Subscribers (monthly or annual) get notice generation included with
    // their subscription — bypass checkout entirely.
    if (session.payment_confirmed || pricing.isSubscriber) {
      await runGeneration();
      return;
    }
    setCheckoutOpen(true);
  }

  // Handle ?payment_success=true → wait for webhook → auto-generate
  useEffect(() => {
    if (!sessionId) return;
    if (searchParams.get("payment_success") === "true") {
      (async () => {
        const ok = await waitForSessionPaid("eu_notice_sessions", sessionId);
        const next = new URLSearchParams(searchParams);
        next.delete("payment_success");
        next.delete("session_id");
        setSearchParams(next, { replace: true });
        if (ok) {
          // Refresh session row so payment_confirmed reflects the webhook
          const { data: fresh } = await supabase
            .from("eu_notice_sessions")
            .select("payment_confirmed")
            .eq("id", sessionId)
            .single();
          setSession((s) => (s ? { ...s, payment_confirmed: !!fresh?.payment_confirmed } : s));
          await runGeneration();
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading) {
    return (
      <EUNoticeShell
        title="Review — EU & Global Notice Builder"
        heading="Review your answers"
        step="review"
        sessionId={sessionId}
      >
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </EUNoticeShell>
    );
  }

  const totalAnswered = Object.values(answers).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v != null && v !== "",
  ).length;
  const scope = session?.scope ?? "single";

  return (
    <EUNoticeShell
      title="Review — EU & Global Notice Builder"
      heading="Review before generating your EU & global privacy notices"
      step="review"
      sessionId={sessionId}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header chips */}
        <div className="flex flex-wrap gap-2">
          <Chip>
            {frameworks.length} framework{frameworks.length === 1 ? "" : "s"} selected
          </Chip>
          <Chip>{totalAnswered} questions answered</Chip>
          {openFlags.length > 0 ? (
            <Chip color="amber">
              {openFlags.length} item{openFlags.length === 1 ? "" : "s"} to review
            </Chip>
          ) : (
            <Chip color="green">
              <CheckCircle2 className="w-3 h-3 inline mr-1" /> All items resolved
            </Chip>
          )}
        </div>

        {/* SECTION 1 — Scope summary */}
        <Section
          title="Scope summary"
          action={
            <button
              onClick={() => navigate(`/eu-notices/frameworks/${sessionId}`)}
              className="text-sm font-semibold text-brand-teal-text hover:underline inline-flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Edit scope →
            </button>
          }
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm mb-3">
            <Row label="Client" value={clientName || "—"} />
            <Row label="Scope" value={SCOPE_LABEL[scope]} />
            <Row
              label="Mode"
              value={session?.ropa_session_id ? "RoPA-powered" : "Standalone"}
            />
            <Row label="Version" value={`v${session?.version_number ?? 1}`} />
          </dl>
          <div className="flex flex-wrap gap-1.5">
            {frameworks.map((f) => (
              <span
                key={f.framework_code}
                className="text-meta px-2 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy font-mono"
              >
                {f.framework_name}
              </span>
            ))}
          </div>
        </Section>

        {/* SECTION 2 — Per-framework cards */}
        <Section
          title="Frameworks"
          action={
            <button
              onClick={() => setShowAllFrameworks((v) => !v)}
              className="text-sm font-semibold text-brand-teal-text hover:underline"
            >
              {showAllFrameworks ? "Show flagged only" : `Show all ${frameworks.length} frameworks`}
            </button>
          }
        >
          {visibleFrameworks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-2">
              No flagged or incomplete frameworks. All set.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleFrameworks.map((fw) => {
                const isOpen = expandedFw === fw.framework_code;
                const status = fwStatus.get(fw.framework_code);
                const fwFlagCount = openFlags.filter((f) => f.framework_code === fw.framework_code).length;
                const section = sections.find((s) =>
                  s.key.toLowerCase().includes(fw.framework_code.toLowerCase()),
                );
                return (
                  <li key={fw.framework_code}>
                    <button
                      onClick={() => setExpandedFw(isOpen ? null : fw.framework_code)}
                      className="w-full flex items-center gap-3 py-3 text-left hover:bg-muted/30 px-2 -mx-2 rounded"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="flex-1 text-sm font-semibold text-brand-navy truncate">
                        {fw.framework_name}
                      </span>
                      <Chip color="neutral">{fw.region}</Chip>
                      <StatusChip
                        status={
                          status && status.required > status.requiredAnswered
                            ? "incomplete"
                            : status && status.answered < status.total
                              ? "partial"
                              : "complete"
                        }
                      />
                      {fwFlagCount > 0 && (
                        <Chip color="amber">
                          {fwFlagCount} flag{fwFlagCount > 1 ? "s" : ""}
                        </Chip>
                      )}
                    </button>
                    {isOpen && section && (
                      <div className="pl-7 pb-3 pr-2 text-sm space-y-1">
                        <ul className="divide-y divide-border/50 max-h-64 overflow-y-auto">
                          {section.questions.slice(0, 6).map((q) => (
                            <li key={q.key} className="py-2">
                              <p className="text-muted-foreground text-meta">{q.text}</p>
                              <p className="text-brand-navy">{formatAnswer(q, answers[q.key])}</p>
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => navigate(`/eu-notices/questions/${sessionId}`)}
                          className="mt-2 inline-flex items-center gap-1 text-brand-teal-text font-semibold hover:underline"
                        >
                          Edit answers →
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* SECTION 3 — Flags */}
        {(missingRequired.length > 0 || warnings.length > 0) && (
          <Section title="Items requiring attention">
            <div className="space-y-2">
              {[...missingRequired, ...warnings].map((f) => (
                <div
                  key={`${f.framework_code}:${f.type}`}
                  className="border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/20 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-brand-navy">{f.message}</p>
                  </div>
                  <button
                    onClick={() => markReviewed(f)}
                    className="text-meta font-semibold text-muted-foreground hover:text-brand-navy whitespace-nowrap"
                  >
                    Mark as reviewed
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {recommendations.length > 0 && (
          <Section title="Recommendations">
            <div className="space-y-2">
              {recommendations.map((f) => (
                <div
                  key={`${f.framework_code}:${f.type}`}
                  className="border border-border rounded-lg p-3 bg-muted/30 flex items-start justify-between gap-3"
                >
                  <p className="text-sm text-muted-foreground">{f.message}</p>
                  <button
                    onClick={() => markReviewed(f)}
                    className="text-meta font-semibold text-muted-foreground hover:text-brand-navy whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* SECTION 4 — Document format & combined option */}
        <Section title="Document format">
          <p className="text-meta text-muted-foreground mb-3">
            PDF is the primary format and is always generated.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeHtml}
                onChange={(e) => setIncludeHtml(e.target.checked)}
              />
              Also include HTML (Included)
            </label>
            {combinedAvailable && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeCombined}
                  onChange={(e) => setIncludeCombined(e.target.checked)}
                />
                Combined international notice (Included)
              </label>
            )}
          </div>
        </Section>

        {/* SECTION 5 — Pricing & generate */}
        <Section title="EU & global notice generation">
          <div className="border border-border rounded-lg p-4 bg-muted/30 mb-4">
            <p className="text-meta font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Generation
            </p>
            <div className="flex items-center justify-between text-sm">
              <span>
                {frameworks.length} framework notice{frameworks.length === 1 ? "" : "s"} —{" "}
                {SCOPE_LABEL[scope]}
              </span>
              <span className="font-semibold text-brand-navy">
                {pricing.loading
                  ? "…"
                  : session?.payment_confirmed
                    ? "Paid"
                    : `$${pricing.price}`}
                {!session?.payment_confirmed && !pricing.loading && (
                  <span className="text-meta text-muted-foreground ml-2">
                    {pricing.isSubscriber ? "subscriber" : "standalone"}
                  </span>
                )}
              </span>
            </div>
            {includeHtml && (
              <div className="flex justify-between text-meta text-muted-foreground mt-1">
                <span>+ HTML versions</span>
                <span>Included</span>
              </div>
            )}
            {combinedAvailable && includeCombined && (
              <div className="flex justify-between text-meta text-muted-foreground">
                <span>+ Combined notice</span>
                <span>Included</span>
              </div>
            )}
            {!pricing.isSubscriber && !session?.payment_confirmed && pricing.standalonePrice > pricing.subscriberPrice && (
              <p className="text-meta text-brand-teal-text mt-2">
                Subscribe to save ${pricing.standalonePrice - pricing.subscriberPrice} ·{" "}
                <a
                  href="/get-intelligence"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                >
                  Intelligence <ExternalLink className="w-3 h-3 inline" />
                </a>
              </p>
            )}
          </div>

          {/* Gate messaging */}
          {hasMissingRequired && (
            <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-r mb-3 text-sm text-red-900 dark:text-red-200">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Resolve required answers before generating.
            </div>
          )}
          {hasWarningsOrRecs && (
            <label className="flex items-start gap-2 text-sm mb-3 p-3 border border-border rounded-md bg-muted/30">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I understand there are {openFlags.length} item{openFlags.length === 1 ? "" : "s"} flagged
                — generate with them noted in the notice.
              </span>
            </label>
          )}

          <div className="flex justify-between gap-3">
            <button
              onClick={() => navigate(`/eu-notices/questions/${sessionId}`)}
              className="text-sm font-semibold text-muted-foreground hover:text-brand-navy inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back to questions
            </button>
            <div className="flex flex-col items-end gap-2">
              <FreeRunIndicator toolKey="eu_notice" />
              <button
                onClick={handleGenerateClick}
                disabled={generateDisabled || generating}
                className="bg-brand-navy text-white text-sm font-semibold px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-navy/90 transition inline-flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                  </>
                ) : session?.payment_confirmed ? (
                  <>
                    Generate notices <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>Continue to payment — ${pricing.price}</>
                )}
              </button>
            </div>
          </div>
        </Section>
      </div>

      {/* Generation progress modal */}
      {generating && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-brand-cloud rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-brand-navy mb-4">
              Generating your EU & global privacy notices…
            </h3>
            <ul className="space-y-2 text-sm">
              <GenStepRow status={genSteps._session ?? "pending"} label="Session data loaded" />
              <GenStepRow
                status={genSteps._config ?? "pending"}
                label={`${frameworks.length} framework${frameworks.length === 1 ? "" : "s"} configured`}
              />
              {frameworks.map((fw) => (
                <GenStepRow
                  key={fw.framework_code}
                  status={genSteps[fw.framework_code] ?? "pending"}
                  label={`${fw.framework_name} notice`}
                />
              ))}
              {combinedAvailable && includeCombined && (
                <GenStepRow status={genSteps._combined ?? "pending"} label="Combined international notice" />
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {sessionId && (
        <SessionCheckoutModal
          open={checkoutOpen}
          toolType={toolType}
          sessionId={sessionId}
          userId={user?.id}
          successPath="/eu-notices/review"
          onClose={() => setCheckoutOpen(false)}
          onComplete={async () => {
            setCheckoutOpen(false);
            // Refresh session so payment_confirmed reflects the webhook
            const { data: fresh } = await supabase
              .from("eu_notice_sessions")
              .select("payment_confirmed")
              .eq("id", sessionId)
              .single();
            setSession((s) => (s ? { ...s, payment_confirmed: !!fresh?.payment_confirmed } : s));
            await runGeneration();
          }}
        />
      )}
    </EUNoticeShell>
  );
}

// ──────────────────────────────────────────────────────────────
// Small presentational helpers
// ──────────────────────────────────────────────────────────────

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border rounded-xl bg-brand-cloud p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-serif text-brand-navy">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground min-w-[90px]">{label}:</dt>
      <dd className="text-brand-navy">{value}</dd>
    </div>
  );
}

function Chip({
  children,
  color = "neutral",
}: {
  children: React.ReactNode;
  color?: "neutral" | "amber" | "green";
}) {
  const styles =
    color === "amber"
      ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
      : color === "green"
        ? "bg-green-100 text-green-900 dark:bg-green-950/50 dark:text-green-200"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`text-meta px-2 py-0.5 rounded-full font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function StatusChip({ status }: { status: "complete" | "partial" | "incomplete" }) {
  if (status === "complete") return <Chip color="green">Complete</Chip>;
  if (status === "partial") return <Chip color="amber">Partial</Chip>;
  return <Chip color="amber">Incomplete</Chip>;
}

function GenStepRow({ status, label }: { status: GenStatus; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {status === "done" ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : status === "running" ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <span className="w-4 h-4 rounded-full border border-muted-foreground/40" />
      )}
      <span className={status === "done" ? "text-brand-navy" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}
