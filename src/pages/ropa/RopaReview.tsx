import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToolPrice } from "@/hooks/useToolPrice";
import { waitForSessionPaid } from "@/lib/checkoutConfirmation";
import { useRopaStore } from "@/stores/ropaStore";
import { RopaShell } from "@/components/ropa/RopaShell";
import { RopaBreadcrumb } from "@/components/ropa/RopaBreadcrumb";
import { getRopaSteps } from "@/components/ropa/ropaFlowSteps";
import { withSession } from "@/lib/ropaSession";
import RopaInlineFlag from "@/components/ropa/RopaInlineFlag";
import SessionCheckoutModal from "@/components/SessionCheckoutModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import RopaSetup from "./RopaSetup";
import { useToast } from "@/hooks/use-toast";
import { useGenerationStatus } from "@/hooks/useGenerationStatus";
import GenerationStalledCard from "@/components/GenerationStalledCard";


type GenStep = "client" | "activities" | "transfers" | "pdf";

const SUPA = supabase as any;

interface ClientProfileSummary {
  legal_entity_type?: string;
  employee_band?: string;
  is_controller?: boolean;
  is_processor?: boolean;
  dpo_name?: string;
  selected_jurisdictions?: string[];
}

export default function RopaReview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const currentSession = useRopaStore((s) => s.currentSession);
  const allActivities = useRopaStore((s) => s.allActivities);
  const flags = useRopaStore((s) => s.flags);
  const loadSession = useRopaStore((s) => s.loadSession);
  const loadFlags = useRopaStore((s) => s.loadFlags);
  const runSessionLevelChecks = useRopaStore((s) => s.runSessionLevelChecks);
  const resolveFlag = useRopaStore((s) => s.resolveFlag);
  const getFlagSummary = useRopaStore((s) => s.getFlagSummary);

  const [clientName, setClientName] = useState("");
  const [clientSector, setClientSector] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfileSummary>({});
  const [loading, setLoading] = useState(true);

  const [showAllActivities, setShowAllActivities] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [authorName, setAuthorName] = useState("");
  const [internalRef, setInternalRef] = useState("");
  const [approvedByName, setApprovedByName] = useState("");
  const [approvedByTitle, setApprovedByTitle] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  // Default: document date + 12 months (CNIL register model review cadence).
  const [nextReviewDue, setNextReviewDue] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });


  const [acknowledged, setAcknowledged] = useState(false);
  const [ackHighlight, setAckHighlight] = useState(false);
  const ackRef = useRef<HTMLLabelElement | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [genSteps, setGenSteps] = useState<Record<GenStep, "pending" | "done">>({
    client: "pending",
    activities: "pending",
    transfers: "pending",
    pdf: "pending",
  });
  const { toast } = useToast();

  // Truth-signal poll (server timestamps). Only active while we've dispatched
  // a generation attempt — otherwise a long-idle "review" row would flip to
  // stalled after 20 min just because the user was reading the page.
  const { phase: genPhase, refresh: refreshGen } = useGenerationStatus<{
    status?: string | null;
    generation_error?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  }>({
    table: "ropa_sessions",
    rowId: generating ? (sessionId ?? null) : null,
    isTerminal: (r) => r.status === "generated" || r.status === "failed",
    isReportReady: (r) => r.status === "generated",
  });


  const isRefresh = currentSession?.is_refresh ?? false;
  const pricing = useToolPrice(isRefresh ? "ropa_refresh" : "ropa_initial");

  // Load session, flags, profile, client info
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Never recover review from in-memory store: it can outlive route changes.
      // A review must be opened with an explicit session id.
      if (!sessionId) {
        if (!cancelled) {
          setLoading(false);
          navigate("/ropa", { replace: true });
        }
        return;
      }

      await loadSession(sessionId);
      const sess = useRopaStore.getState().currentSession;
      if (!sess || cancelled) {
        setLoading(false);
        return;
      }
      const { data: client } = await SUPA.from("clients")
        .select("name, sector")
        .eq("id", sess.client_id)
        .maybeSingle();
      if (client && !cancelled) {
        // Show the organisation captured on the session (the company this
        // RoPA documents), not the workspace name.
        const sessionOrgName = (sess as { org_name?: string | null }).org_name;
        setClientName((sessionOrgName?.trim() || client.name) ?? "");
        setClientSector(client.sector ?? null);
      }

      const { data: prof } = await SUPA.from("ropa_client_profiles")
        .select("legal_entity_type, employee_band, is_controller, is_processor, dpo_name")
        .eq("client_id", sess.client_id)
        .maybeSingle();
      const { data: jurs } = await SUPA.from("ropa_jurisdiction_selections")
        .select("jurisdiction_code")
        .eq("client_id", sess.client_id);
      if (!cancelled) {
        setProfile({
          ...(prof ?? {}),
          selected_jurisdictions:
            jurs?.map((j: { jurisdiction_code: string }) => j.jurisdiction_code) ?? [],
        });
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (user?.email && !authorName) {
      setAuthorName(user.email.split("@")[0]);
    }
  }, [user, authorName]);

  const visibleActivities = useMemo(() => {
    if (showAllActivities) return allActivities;
    return allActivities.filter((a) => a.status !== "complete");
  }, [allActivities, showAllActivities]);

  // Gating disabled — users can always proceed to generation.
  const hasMissingRequired = false;
  const onlyWarningsOrRecs = false;
  const allClean = true;
  const generateDisabled = false;

  // Handle return from Stripe checkout (either ?payment_success=true from
  // our own callback, or ?session_id=cs_... from a Stripe-hosted redirect).
  useEffect(() => {
    if (!sessionId) return;
    const isReturn =
      searchParams.get("payment_success") === "true" ||
      !!searchParams.get("session_id");
    if (isReturn) {
      (async () => {
        const ok = await waitForSessionPaid("ropa_sessions", sessionId);
        const next = new URLSearchParams(searchParams);
        next.delete("payment_success");
        next.delete("session_id");
        setSearchParams(next, { replace: true });
        if (ok) await runGeneration();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);


  // Kick off generation. Truth-signal poll (useGenerationStatus above) now
  // owns the waiting UI — this function only dispatches the edge function
  // and hands off. The bounded for-loop poll was deleted, not wrapped
  // (COURIER_SESSION_FLOWS_TRUTH_SIGNAL_2026-07-11).
  const runGeneration = async () => {
    if (!sessionId) return;
    setGenerating(true);
    // Reset step visuals for a fresh run
    setGenSteps({
      client: "pending",
      activities: "pending",
      transfers: "pending",
      pdf: "pending",
    });
    const updates: GenStep[] = ["client", "activities", "transfers", "pdf"];

    // Optimistic step ticks for visual pacing while the server works.
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    let ti = 0;
    tickTimerRef.current = setInterval(() => {
      const step = updates[ti];
      if (step) {
        setGenSteps((s) => ({ ...s, [step]: "done" }));
        ti += 1;
      }
    }, 600);

    try {
      const { error } = await supabase.functions.invoke("generate-ropa-document", {
        body: {
          session_id: sessionId,
          document_date: docDate,
          author_name: authorName,
          internal_reference: internalRef || null,
          approved_by_name: approvedByName || null,
          approved_by_title: approvedByTitle || null,
          approval_date: approvalDate || null,
          next_review_due: nextReviewDue || null,

        },
      });
      if (error) {
        if (tickTimerRef.current) clearInterval(tickTimerRef.current);
        setGenerating(false);
        console.error("generate-ropa-document failed:", error);
        toast({
          title: "Could not start generation",
          description: error.message ?? "Please try again.",
          variant: "destructive",
        });
      }
    } catch (e) {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
      setGenerating(false);
      console.error(e);
    }
  };

  // React to the truth-signal phase transitions.
  useEffect(() => {
    if (!generating) return;
    if (genPhase === "ready") {
      if (tickTimerRef.current) { clearInterval(tickTimerRef.current); tickTimerRef.current = null; }
      setGenSteps({
        client: "done",
        activities: "done",
        transfers: "done",
        pdf: "done",
      });
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = setTimeout(
        () => navigate(withSession("/ropa/documents", sessionId ?? currentSession?.id)),
        600,
      );
    } else if (genPhase === "failed") {
      if (tickTimerRef.current) { clearInterval(tickTimerRef.current); tickTimerRef.current = null; }
      // Read the current error message off the session row for the toast.
      (async () => {
        const { data: r } = await supabase
          .from("ropa_sessions")
          .select("generation_error")
          .eq("id", sessionId!)
          .maybeSingle();
        toast({
          title: "Generation failed",
          description:
            (r as { generation_error?: string } | null)?.generation_error ??
            "Please try again.",
          variant: "destructive",
        });
      })();
      setGenerating(false);
    } else if (genPhase === "stalled" || genPhase === "stalled_pre_dispatch") {
      if (tickTimerRef.current) { clearInterval(tickTimerRef.current); tickTimerRef.current = null; }
      // Modal keeps showing but swaps to GenerationStalledCard (see render).
    }
  }, [genPhase, generating, sessionId, navigate, currentSession?.id, toast]);

  useEffect(() => () => {
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
  }, []);




  const handleGenerateClick = async () => {
    if (!currentSession) return;
    // If blocked only by the acknowledgment checkbox, guide the user to it
    // instead of silently doing nothing.
    if (onlyWarningsOrRecs && !acknowledged) {
      ackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setAckHighlight(true);
      window.setTimeout(() => setAckHighlight(false), 1800);
      return;
    }
    if (hasMissingRequired) {
      // Surface the flags section
      document
        .querySelector('[data-ropa-section="flags"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (currentSession.payment_confirmed || pricing.isIncluded) {
      await runGeneration();
      return;
    }
    setCheckoutOpen(true);
  };

  if (loading) {
    return (
      <RopaShell title="Review your RoPA" heading="Review your RoPA">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading review…
        </div>
      </RopaShell>
    );
  }

  return (
    <RopaShell title="Review your RoPA" heading="Review your RoPA">
      <div className="max-w-4xl mx-auto space-y-6">
        {(() => {
          const { steps, currentIndex } = getRopaSteps(
            "review",
            sessionId ?? currentSession?.id ?? null
          );
          return <RopaBreadcrumb steps={steps} currentIndex={currentIndex} />;
        })()}
        {/* Header */}
        <header>
          <h1 className="font-serif text-brand-navy mb-3">
            Review before generating your RoPA
          </h1>
          <div className="flex flex-wrap gap-2">
            <Chip>{allActivities.length} activities</Chip>
            <Chip>{(profile.selected_jurisdictions ?? []).length} jurisdictions</Chip>
          </div>
        </header>

        {/* Section 1 — Client summary */}
        <Section
          title="Client summary"
          action={
            <button
              onClick={() => setEditDrawerOpen(true)}
              className="text-sm font-semibold text-brand-teal-text hover:underline"
            >
              Edit →
            </button>
          }
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
            <Row label="Name" value={clientName || "—"} />
            <Row label="Sector" value={clientSector || "—"} />
            <Row label="Legal entity" value={profile.legal_entity_type || "—"} />
            <Row label="Size" value={profile.employee_band || "—"} />
            <Row
              label="Roles"
              value={
                [profile.is_controller && "Controller", profile.is_processor && "Processor"]
                  .filter(Boolean)
                  .join(" + ") || "—"
              }
            />
            <Row label="DPO" value={profile.dpo_name || "Not designated"} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(profile.selected_jurisdictions ?? []).map((j) => (
              <span
                key={j}
                className="text-meta px-2 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy font-mono"
              >
                {j}
              </span>
            ))}
          </div>
        </Section>

        {/* Section 2 — Activities */}
        <Section
          title="Processing activities"
          action={
            <button
              onClick={() => setShowAllActivities((v) => !v)}
              className="text-sm font-semibold text-brand-teal-text hover:underline"
            >
              {showAllActivities
                ? "Show flagged only"
                : `Show all ${allActivities.length}`}
            </button>
          }
        >
          {visibleActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-2">
              No flagged or incomplete activities.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleActivities.map((a) => {
                const isOpen = expandedActivity === a.id;
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => setExpandedActivity(isOpen ? null : a.id)}
                      className="w-full flex items-center gap-3 py-3 text-left hover:bg-muted/30 px-2 -mx-2 rounded"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="flex-1 text-sm font-semibold text-brand-navy truncate">
                        {a.display_name}
                      </span>
                      <Chip color="neutral">{a.category}</Chip>
                      <StatusChip status={a.status} />
                    </button>
                    {isOpen && (
                      <div className="pl-7 pb-3 pr-2 text-sm text-muted-foreground space-y-1">
                        <p>Completion: {a.completion_pct}%</p>
                        <p>{a.is_high_risk ? "Marked high-risk" : "Standard risk"}</p>
                        <button
                          onClick={() => navigate(withSession(`/ropa/activity/${a.id}`, sessionId ?? currentSession?.id))}
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


        {/* Section 4 — Document settings */}
        <Section title="Document settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Document date">
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              />
            </Field>
            <Field label="Author name">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              />
            </Field>
            <Field label="Internal reference (optional)">
              <input
                type="text"
                value={internalRef}
                onChange={(e) => setInternalRef(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              />
            </Field>
            <Field label="Version">
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Version {currentSession?.version_number ?? 1}
              </p>
            </Field>
            <Field label="Approved by (name)">
              <input
                type="text"
                value={approvedByName}
                onChange={(e) => setApprovedByName(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              />
            </Field>
            <Field label="Approved by (title)">
              <input
                type="text"
                value={approvedByTitle}
                onChange={(e) => setApprovedByTitle(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              />
            </Field>
            <Field label="Approval date">
              <input
                type="date"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              />
            </Field>
            <Field label="Next review due">
              <input
                type="date"
                value={nextReviewDue}
                onChange={(e) => setNextReviewDue(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Approval details are optional. Left blank, the register still prints
            the attestation block with those lines marked for completion — it
            will not invent an approver. Next review defaults to twelve months
            after the document date.
          </p>
        </Section>


        {/* Continue to payment */}
        <div className="border border-border rounded-xl bg-brand-cloud p-5">
          <button
            onClick={handleGenerateClick}
            disabled={generating}
            className={`w-full text-white text-sm font-semibold py-3 rounded-lg transition ${
              generating
                ? "bg-brand-navy/50 cursor-not-allowed"
                : "bg-brand-navy hover:bg-brand-navy/90"
            }`}
          >
            {generating
              ? "Generating…"
              : currentSession?.payment_confirmed || pricing.isIncluded
                ? "Generate RoPA documents"
                : pricing.loading
                  ? "Continue to payment"
                  : `Continue to payment — $${pricing.price}`}
          </button>
          {!currentSession?.payment_confirmed && !pricing.isSubscriber && !pricing.loading && (
            <p className="text-meta text-brand-teal-text mt-2 text-center">
              RoPA Builder is included with any{" "}
              <a
                href="/get-intelligence"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                subscription <ExternalLink className="w-3 h-3 inline" />
              </a>
            </p>
          )}
        </div>

      </div>

      {/* Edit drawer */}
      <Sheet open={editDrawerOpen} onOpenChange={setEditDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit client setup</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <RopaSetup />
          </div>
        </SheetContent>
      </Sheet>

      {/* Generation progress modal */}
      {generating && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-brand-cloud rounded-2xl p-6 max-w-md w-full">
            {genPhase === "stalled" || genPhase === "stalled_pre_dispatch" ? (
              <GenerationStalledCard
                variant={genPhase}
                retryHref={`/ropa/review/${sessionId ?? ""}`}
                onRefresh={() => { void refreshGen(); }}
              />
            ) : (
              <>
                <h3 className="text-brand-navy mb-2">Building your RoPA…</h3>
                {genPhase === "slow" && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Taking longer than expected — still working.
                  </p>
                )}
                <ul className="space-y-2 text-sm">
                  <GenStepRow done={genSteps.client === "done"} label="Client record" />
                  <GenStepRow done={genSteps.activities === "done"} label={`${allActivities.length} processing activities`} />
                  <GenStepRow done={genSteps.transfers === "done"} label="Cross-border transfer register" />
                  <GenStepRow done={genSteps.pdf === "done"} label="Generating PDF" pending={genSteps.pdf !== "done"} />
                  
                </ul>
              </>
            )}
          </div>
        </div>
      )}


      {/* Checkout modal */}
      {sessionId && (
        <SessionCheckoutModal
          open={checkoutOpen}
          toolType={isRefresh ? "ropa_refresh" : "ropa_initial"}
          sessionId={sessionId}
          userId={user?.id}
          successPath={`/ropa/review/${sessionId}`}
          onClose={() => setCheckoutOpen(false)}
          onComplete={async () => {
            setCheckoutOpen(false);
            await loadSession(sessionId);
            await runGeneration();
          }}
        />
      )}
    </RopaShell>
  );
}

// ──────────────────────────────────────────────────────────────
// Small presentational helpers (kept inline — review-page only)
// ──────────────────────────────────────────────────────────────

function Section({
  title,
  action,
  children,
  ...rest
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...rest}
      className="border border-border rounded-xl bg-brand-cloud p-5"
    >
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-meta font-semibold text-muted-foreground mb-1">{label}</label>
      {children}
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

function StatusChip({ status }: { status: string }) {
  if (status === "complete") return <Chip color="green">Complete</Chip>;
  if (status === "in_progress") return <Chip color="amber">In progress</Chip>;
  return <Chip>Not started</Chip>;
}

function GenStepRow({
  done,
  label,
  pending,
}: {
  done: boolean;
  label: string;
  pending?: boolean;
}) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : pending ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <span className="w-4 h-4 rounded-full border border-muted-foreground/30 inline-block" />
      )}
      <span className={done ? "text-brand-navy" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}
