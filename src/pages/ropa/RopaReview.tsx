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

type GenStep = "client" | "activities" | "transfers" | "pdf" | "docx" | "xlsx";

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
  const [includeWord, setIncludeWord] = useState(false);
  const [includeExcel, setIncludeExcel] = useState(false);

  const [acknowledged, setAcknowledged] = useState(false);
  const [ackHighlight, setAckHighlight] = useState(false);
  const ackRef = useRef<HTMLLabelElement | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genSteps, setGenSteps] = useState<Record<GenStep, "pending" | "done">>({
    client: "pending",
    activities: "pending",
    transfers: "pending",
    pdf: "pending",
    docx: "pending",
    xlsx: "pending",
  });

  const isRefresh = currentSession?.is_refresh ?? false;
  const pricing = useToolPrice(isRefresh ? "ropa_refresh" : "ropa_initial");

  // Load session, flags, profile, client info
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // If the URL has no sessionId, try to recover from the store
      // (e.g. user navigated to bare /ropa/review). If we still have no
      // session, send them back to start instead of spinning forever.
      let effectiveId = sessionId ?? useRopaStore.getState().currentSession?.id;
      if (!effectiveId) {
        if (!cancelled) {
          setLoading(false);
          navigate("/ropa", { replace: true });
        }
        return;
      }
      if (!sessionId && effectiveId) {
        navigate(`/ropa/review/${effectiveId}`, { replace: true });
        return;
      }

      await loadSession(effectiveId);
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

  // Handle ?payment_success=true
  useEffect(() => {
    if (!sessionId) return;
    if (searchParams.get("payment_success") === "true") {
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

  const runGeneration = async () => {
    if (!sessionId) return;
    setGenerating(true);
    const updates: GenStep[] = ["client", "activities", "transfers", "pdf"];
    if (includeWord) updates.push("docx");
    if (includeExcel) updates.push("xlsx");

    // Tick steps optimistically while we wait for the edge function
    let i = 0;
    const tickInt = setInterval(() => {
      const step = updates[i];
      if (step) {
        setGenSteps((s) => ({ ...s, [step]: "done" }));
        i += 1;
      }
    }, 600);

    try {
      const { error } = await supabase.functions.invoke("generate-ropa-document", {
        body: {
          session_id: sessionId,
          document_date: docDate,
          author_name: authorName,
          internal_reference: internalRef || null,
          include_word: includeWord,
          include_excel: includeExcel,
        },
      });
      clearInterval(tickInt);
      if (error) {
        setGenerating(false);
        // Don't block on missing edge function — surface a soft error.
        console.error("generate-ropa-document failed:", error);
      } else {
        // Mark all steps complete
        setGenSteps({
          client: "done",
          activities: "done",
          transfers: "done",
          pdf: "done",
          docx: includeWord ? "done" : "pending",
          xlsx: includeExcel ? "done" : "pending",
        });
        setTimeout(
          () =>
            navigate(
              withSession("/ropa/documents", sessionId ?? currentSession?.id)
            ),
          600
        );
      }
    } catch (e) {
      clearInterval(tickInt);
      setGenerating(false);
      console.error(e);
    }
  };

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
    if (currentSession.payment_confirmed) {
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
              className="text-sm font-semibold text-brand-teal hover:underline"
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
              className="text-sm font-semibold text-brand-teal hover:underline"
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
                          className="mt-2 inline-flex items-center gap-1 text-brand-teal font-semibold hover:underline"
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
          </div>
        </Section>

        {/* Section 5 — Generate */}
        <Section title="Generate">
          <p className="text-meta text-muted-foreground mb-3">
            PDF is the default format. You can also generate Word and Excel versions.
          </p>
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeWord}
                onChange={(e) => setIncludeWord(e.target.checked)}
              />
              Also generate Word document (Included)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeExcel}
                onChange={(e) => setIncludeExcel(e.target.checked)}
              />
              Also generate Excel worksheet (Included)
            </label>
          </div>

          {/* Pricing block */}
          <div className="border border-border rounded-lg p-4 bg-muted/30 mb-4">
            <p className="text-meta font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Document generation
            </p>
            <div className="flex items-center justify-between text-sm">
              <span>
                PDF · {allActivities.length} activit{allActivities.length === 1 ? "y" : "ies"}
              </span>
              <span className="font-semibold text-brand-navy">
                {pricing.loading
                  ? "…"
                  : currentSession?.payment_confirmed
                    ? "Paid"
                    : `$${pricing.price}`}
                {!currentSession?.payment_confirmed && !pricing.loading && (
                  <span className="text-meta text-muted-foreground ml-2">
                    {pricing.isSubscriber ? "subscriber" : "standalone"}
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-meta text-muted-foreground mt-1">
              <span>+ Word document</span><span>Included</span>
            </div>
            <div className="flex justify-between text-meta text-muted-foreground">
              <span>+ Excel worksheet</span><span>Included</span>
            </div>
            {!pricing.isSubscriber && !currentSession?.payment_confirmed && (
              <p className="text-meta text-brand-teal mt-2">
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
              : currentSession?.payment_confirmed
                ? "Generate RoPA documents"
                : `Continue to payment — $${pricing.price}`}
          </button>
        </Section>
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
            <h3 className="text-brand-navy mb-4">Building your RoPA…</h3>
            <ul className="space-y-2 text-sm">
              <GenStepRow done={genSteps.client === "done"} label="Client record" />
              <GenStepRow done={genSteps.activities === "done"} label={`${allActivities.length} processing activities`} />
              <GenStepRow done={genSteps.transfers === "done"} label="Cross-border transfer register" />
              <GenStepRow done={genSteps.pdf === "done"} label="Generating PDF" pending={genSteps.pdf !== "done"} />
              {includeWord && <GenStepRow done={genSteps.docx === "done"} label="Generating Word document" pending={genSteps.docx !== "done"} />}
              {includeExcel && <GenStepRow done={genSteps.xlsx === "done"} label="Generating Excel worksheet" pending={genSteps.xlsx !== "done"} />}
            </ul>
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
