import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Loader2, Info, Check } from "lucide-react";
import { USNoticeShell } from "@/components/us-notices/USNoticeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { US_NOTICE_PRICING } from "@/config/pricing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUsNoticeSessionGuard } from "@/hooks/useUsNoticeSessionGuard";

interface StateLaw {
  state_code: string;
  state_name: string;
  law_name: string;
  framework_type: "ccpa" | "virginia_model" | "maryland" | "florida" | "pending";
  effective_date: string | null;
  is_active: boolean;
  applicability_threshold: string | null;
  notes: string | null;
}

type ConsumerVolume = "<35k" | "35k-100k" | "100k-175k" | ">175k" | "unsure";
type RevenueShare = "none" | "<20" | "20-25" | ">=50" | "unsure_no_sale";

const VOLUME_OPTIONS: { value: ConsumerVolume; label: string }[] = [
  { value: "<35k", label: "Under 35,000" },
  { value: "35k-100k", label: "35,000–100,000" },
  { value: "100k-175k", label: "100,000–175,000" },
  { value: ">175k", label: "Over 175,000" },
  { value: "unsure", label: "Not sure" },
];

const REVENUE_OPTIONS: { value: RevenueShare; label: string }[] = [
  { value: "none", label: "None" },
  { value: "<20", label: "Less than 20%" },
  { value: "20-25", label: "20–25%" },
  { value: ">=50", label: "50% or more" },
  { value: "unsure_no_sale", label: "Not sure — I don't sell data" },
];

/**
 * Heuristic: does the user likely meet this state's applicability threshold?
 * Conservative — only marks states as obligated when both consumer volume and
 * revenue-share signals clearly cross the line.
 */
function isLikelyObligated(
  law: StateLaw,
  volume: ConsumerVolume,
  revenue: RevenueShare,
): { obligated: boolean; reason: string } {
  if (!law.is_active) return { obligated: false, reason: "" };

  // Texas: any business
  if (law.state_code === "TX") {
    return { obligated: true, reason: "Texas applies to any business with no consumer threshold." };
  }
  // Florida: $1B+ revenue only — never auto-select
  if (law.state_code === "FL") {
    return { obligated: false, reason: "" };
  }

  const lowThreshold = ["DE", "NH", "MD", "RI"].includes(law.state_code); // 35k consumer floors
  const veryLowMT = law.state_code === "MT"; // 50k floor
  const tnHigh = law.state_code === "TN"; // 175k floor

  const volumeMeets =
    volume === ">175k" ||
    (volume === "100k-175k" && !tnHigh) ||
    (volume === "35k-100k" && (lowThreshold || veryLowMT)) ||
    (volume === "35k-100k" && law.state_code === "MT");

  const revenueDriven =
    (revenue === ">=50" || revenue === "20-25") &&
    (volume === "35k-100k" || volume === "100k-175k" || volume === ">175k");

  if (volumeMeets) {
    return {
      obligated: true,
      reason: `Threshold likely met: ${law.applicability_threshold ?? law.law_name}.`,
    };
  }
  if (revenueDriven && !lowThreshold) {
    return {
      obligated: true,
      reason: "Revenue-driven threshold likely met based on data-sale share.",
    };
  }
  return { obligated: false, reason: "" };
}

export default function USNoticeStates() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { verifying: verifyingClient, authorized } = useUsNoticeSessionGuard(sessionId);

  const [loading, setLoading] = useState(true);
  const [laws, setLaws] = useState<StateLaw[]>([]);
  const [volume, setVolume] = useState<ConsumerVolume | null>(null);
  const [revenue, setRevenue] = useState<RevenueShare | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [autoReasons, setAutoReasons] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("us_state_privacy_laws")
        .select("*")
        .order("state_name");
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load state laws", description: error.message, variant: "destructive" });
      } else {
        setLaws((data ?? []) as StateLaw[]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [toast, authorized]);

  const showGrid = volume !== null && revenue !== null;

  const grouped = useMemo(() => {
    return {
      ccpa: laws.filter((l) => l.framework_type === "ccpa"),
      virginia: laws.filter((l) => l.framework_type === "virginia_model"),
      maryland: laws.filter((l) => l.framework_type === "maryland"),
      florida: laws.filter((l) => l.framework_type === "florida"),
      pending: laws.filter((l) => l.framework_type === "pending"),
    };
  }, [laws]);

  const activeLaws = useMemo(() => laws.filter((l) => l.is_active), [laws]);

  const virginiaSelectedCount = useMemo(
    () => grouped.virginia.filter((l) => selected.has(l.state_code)).length,
    [grouped.virginia, selected],
  );

  // Florida gate state: null = not asked, true = passed gate, false = explicitly excluded.
  const [floridaGateAnswered, setFloridaGateAnswered] = useState<boolean | null>(null);
  const [floridaGateOpen, setFloridaGateOpen] = useState(false);

  function toggle(code: string) {
    // Florida applicability gate — $1B+ revenue threshold.
    if (code === "FL" && !selected.has(code) && floridaGateAnswered !== true) {
      setFloridaGateOpen(true);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
        // Clear any auto-reason if the user manually unselects
        setAutoReasons((r) => {
          const { [code]: _, ...rest } = r;
          return rest;
        });
      } else {
        next.add(code);
      }
      return next;
    });
  }

  function handleFloridaGate(include: boolean) {
    setFloridaGateAnswered(include);
    setFloridaGateOpen(false);
    if (include) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.add("FL");
        return next;
      });
    }
  }

  function loadObligations() {
    if (!volume || !revenue) return;
    const next = new Set(selected);
    const reasons: Record<string, string> = { ...autoReasons };
    for (const law of activeLaws) {
      const { obligated, reason } = isLikelyObligated(law, volume, revenue);
      if (obligated) {
        next.add(law.state_code);
        reasons[law.state_code] = reason;
      }
    }
    setSelected(next);
    setAutoReasons(reasons);
  }

  function selectAllActive() {
    setSelected(new Set(activeLaws.map((l) => l.state_code)));
  }

  async function handleContinue() {
    if (!sessionId || selected.size === 0) return;
    setSubmitting(true);

    const rows = Array.from(selected).map((code) => {
      const law = laws.find((l) => l.state_code === code)!;
      return {
        session_id: sessionId,
        state_code: law.state_code,
        state_name: law.state_name,
        framework_type: law.framework_type,
      };
    });

    const { error: insertErr } = await supabase
      .from("us_notice_state_selections")
      .insert(rows);
    if (insertErr) {
      setSubmitting(false);
      toast({ title: "Could not save selections", description: insertErr.message, variant: "destructive" });
      return;
    }

    const allActiveSelected = activeLaws.every((l) => selected.has(l.state_code));
    const scope = selected.size === 1 ? "single" : allActiveSelected ? "all_states" : "single";

    const { error: updateErr } = await supabase
      .from("us_notice_sessions")
      .update({ scope, last_activity_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (updateErr) {
      setSubmitting(false);
      toast({ title: "Could not update session", description: updateErr.message, variant: "destructive" });
      return;
    }

    navigate(`/us-notices/${sessionId}/questions`);
  }

  if (verifyingClient) {
    return (
      <USNoticeShell
        title="Select States — US Notice Builder"
        heading="Which states do your customers live in?"
        step="states"
        sessionId={sessionId}
      >
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </USNoticeShell>
    );
  }

  return (
    <USNoticeShell
      title="Select States — US Notice Builder"
      heading="Which states do your customers live in?"
      step="states"
      sessionId={sessionId}
    >
      <p className="text-muted-foreground text-base mb-8 max-w-2xl">
        Select all that apply. We'll generate a separate notice for each, optimised
        for that state's requirements.
      </p>

      {/* Pre-questions */}
      <div className="grid gap-6 md:grid-cols-2 mb-10">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-foreground mb-3">
              How many consumers' data do you process annually?
            </h3>
            <RadioGroup value={volume ?? ""} onValueChange={(v) => setVolume(v as ConsumerVolume)}>
              {VOLUME_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2 py-1">
                  <RadioGroupItem value={opt.value} id={`vol-${opt.value}`} />
                  <Label htmlFor={`vol-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="text-foreground mb-3">
              What percentage of your revenue comes from selling personal data?
            </h3>
            <RadioGroup value={revenue ?? ""} onValueChange={(v) => setRevenue(v as RevenueShare)}>
              {REVENUE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2 py-1">
                  <RadioGroupItem value={opt.value} id={`rev-${opt.value}`} />
                  <Label htmlFor={`rev-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {!showGrid && (
        <p className="text-sm text-muted-foreground italic">
          Answer both questions above to see the state grid.
        </p>
      )}

      {showGrid && loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {showGrid && !loading && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button onClick={loadObligations} variant="default">
              Load all states where I'm legally obligated →
            </Button>
            <button
              type="button"
              onClick={selectAllActive}
              className="text-sm text-primary hover:underline"
            >
              Select all 20 states
            </button>
          </div>

          {/* California */}
          <section className="mb-6">
            {grouped.ccpa.map((law) => (
              <StateCard
                key={law.state_code}
                law={law}
                selected={selected.has(law.state_code)}
                onToggle={() => toggle(law.state_code)}
                autoReason={autoReasons[law.state_code]}
                emphasized
                tagline="CCPA/CPRA — Unique Framework"
              />
            ))}
          </section>

          {/* Virginia model */}
          <section className="mb-6">
            <h3 className="text-foreground mb-3">
              Virginia model states ({grouped.virginia.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.virginia.map((law) => (
                <StateCard
                  key={law.state_code}
                  law={law}
                  selected={selected.has(law.state_code)}
                  onToggle={() => toggle(law.state_code)}
                  autoReason={autoReasons[law.state_code]}
                  tagline={law.law_name}
                />
              ))}
            </div>
            {virginiaSelectedCount >= 2 && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm text-foreground">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p>
                  These states share a common notice structure. We'll ask the
                  questions once and generate separate notices for each state. You
                  don't answer the same questions {grouped.virginia.length} times.
                </p>
              </div>
            )}
          </section>

          {/* Maryland */}
          <section className="mb-6">
            {grouped.maryland.map((law) => (
              <StateCard
                key={law.state_code}
                law={law}
                selected={selected.has(law.state_code)}
                onToggle={() => toggle(law.state_code)}
                autoReason={autoReasons[law.state_code]}
                tagline="Stricter — data minimisation requirement"
              />
            ))}
          </section>

          {/* Florida — applicability gate ($1B+ revenue) */}
          <section className="mb-6">
            {grouped.florida.map((law) => (
              <div key={law.state_code}>
                <StateCard
                  law={law}
                  selected={selected.has(law.state_code)}
                  onToggle={() => toggle(law.state_code)}
                  autoReason={autoReasons[law.state_code]}
                  tagline="Very narrow scope — $1B+ revenue only"
                />
                {floridaGateAnswered === false && (
                  <p className="text-xs text-muted-foreground italic mt-2">
                    Florida excluded from this notice set — FDBR does not apply
                    to your business.{" "}
                    <button
                      type="button"
                      className="underline hover:text-foreground"
                      onClick={() => {
                        setFloridaGateAnswered(null);
                        setFloridaGateOpen(true);
                      }}
                    >
                      Reconsider
                    </button>
                  </p>
                )}
              </div>
            ))}
          </section>

          {/* Pending */}
          <section className="mb-24">
            <h3 className="text-foreground mb-3">Pending states</h3>
            <div className="flex flex-wrap gap-2">
              {grouped.pending.map((law) => (
                <Badge key={law.state_code} variant="secondary" className="opacity-60">
                  {law.state_name} · Coming soon
                </Badge>
              ))}
            </div>
          </section>

          <p className="text-xs text-muted-foreground text-center mb-24">
            Answering questions is free · Notices from {US_NOTICE_PRICING.singleSubscriber()}
          </p>

          {/* Sticky bottom bar */}
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur px-4 py-3">
            <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm">
                <span className="font-semibold text-foreground">{selected.size}</span>{" "}
                <span className="text-muted-foreground">
                  state{selected.size === 1 ? "" : "s"} selected
                </span>
              </p>
              <Button
                onClick={handleContinue}
                disabled={selected.size === 0 || submitting}
                className="w-full sm:w-auto min-h-[44px]"
                aria-label="Continue to questions"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <>Continue to questions <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden /></>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
      <Dialog open={floridaGateOpen} onOpenChange={setFloridaGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Does Florida's FDBR apply to you?</DialogTitle>
            <DialogDescription className="pt-2">
              Florida's Digital Bill of Rights applies only to controllers with
              over <strong>$1 billion in global annual revenue</strong> AND
              specific data processing thresholds. Does this describe your business?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => handleFloridaGate(false)}>
              No — skip Florida
            </Button>
            <Button onClick={() => handleFloridaGate(true)}>
              Yes — include Florida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </USNoticeShell>
  );
}

function StateCard({
  law,
  selected,
  onToggle,
  autoReason,
  emphasized,
  tagline,
}: {
  law: StateLaw;
  selected: boolean;
  onToggle: () => void;
  autoReason?: string;
  emphasized?: boolean;
  tagline?: string;
}) {
  const descId = `state-${law.state_code}-desc`;
  return (
    <button
      type="button"
      onClick={onToggle}
      role="checkbox"
      aria-checked={selected}
      aria-describedby={descId}
      aria-label={`${law.state_name} — ${law.law_name}${tagline ? `, ${tagline}` : ""}`}
      className={`w-full min-h-[52px] text-left rounded-lg border-2 transition-colors p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"
      } ${emphasized ? "shadow-sm" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} className="mt-1 pointer-events-none" aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h4 className={`font-semibold text-foreground ${emphasized ? "text-lg" : "text-sm"}`}>
              {law.state_name}
            </h4>
            <span className="text-xs text-muted-foreground">— {law.law_name}</span>
          </div>
          <div id={descId}>
            {tagline && (
              <p className="text-xs text-muted-foreground mt-0.5 italic">{tagline}</p>
            )}
            {law.applicability_threshold && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Threshold: {law.applicability_threshold}
              </p>
            )}
            {law.effective_date && (
              <p className="text-xs text-muted-foreground">
                Effective: {new Date(law.effective_date).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            {autoReason && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-primary">
                <Check className="h-3 w-3 mt-0.5 shrink-0" aria-hidden />
                <span>{autoReason}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
