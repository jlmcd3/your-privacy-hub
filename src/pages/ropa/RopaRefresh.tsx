import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RopaShell } from "@/components/ropa/RopaShell";
import { RopaBreadcrumb } from "@/components/ropa/RopaBreadcrumb";
import { getRopaSteps } from "@/components/ropa/ropaFlowSteps";
import { withSession } from "@/lib/ropaSession";
import { RopaRegulatoryUpdates } from "@/components/ropa/RopaRegulatoryUpdates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  CheckCircle2,
  PencilLine,
  Plus,
  ArrowRight,
  Info,
} from "lucide-react";

type SourceSession = {
  id: string;
  version_number: number;
  client_id: string;
  total_activities: number;
  completed_at: string | null;
};

type SourceActivity = {
  id: string;
  display_name: string;
  category: string;
  is_high_risk: boolean;
};

type CycleRow = {
  id: string;
  new_session_id: string | null;
  initiated_at: string;
};

export default function RopaRefresh() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [source, setSource] = useState<SourceSession | null>(null);
  const [activities, setActivities] = useState<SourceActivity[]>([]);
  const [existingCycle, setExistingCycle] = useState<CycleRow | null>(null);
  const [activeNewSessionId, setActiveNewSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"intro" | "regulatory">("intro");

  useEffect(() => {
    if (!sessionId) return;
    void loadSource();
  }, [sessionId]);

  const loadSource = async () => {
    setLoading(true);
    try {
      const { data: s, error: sErr } = await supabase
        .from("ropa_sessions")
        .select("id, version_number, client_id, total_activities, completed_at")
        .eq("id", sessionId!)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!s) throw new Error("Source session not found");
      setSource(s as SourceSession);

      const { data: acts } = await supabase
        .from("ropa_processing_activities")
        .select("id, display_name, category, is_high_risk")
        .eq("session_id", sessionId!)
        .order("display_order", { ascending: true });
      setActivities((acts || []) as SourceActivity[]);

      // Existing in-progress refresh cycle?
      const { data: cycles } = await supabase
        .from("ropa_refresh_cycles")
        .select("id, new_session_id, initiated_at")
        .eq("source_session_id", sessionId!)
        .order("initiated_at", { ascending: false })
        .limit(1);
      if (cycles && cycles.length > 0) setExistingCycle(cycles[0] as CycleRow);
    } catch (err) {
      console.error("Load refresh source failed:", err);
      toast({
        title: "Failed to load session",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartRefresh = async () => {
    if (!sessionId) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("start-ropa-refresh", {
        body: { source_session_id: sessionId },
      });
      if (error) throw error;
      const newId = data?.new_session_id as string | undefined;
      if (!newId) throw new Error("No new session returned");
      toast({
        title: "Refresh started",
        description: `Version ${data.version_number} ready for review.`,
      });
      setActiveNewSessionId(newId);
      setPhase("regulatory");
    } catch (err) {
      console.error("Start refresh failed:", err);
      toast({
        title: "Failed to start refresh",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const handleResumeExisting = () => {
    if (existingCycle?.new_session_id) {
      setActiveNewSessionId(existingCycle.new_session_id);
      setPhase("regulatory");
    }
  };

  const goToActivities = () => {
    if (activeNewSessionId) navigate(withSession("/ropa/activities", activeNewSessionId));
  };

  if (loading) {
    return (
      <RopaShell title="Annual Refresh — RoPA Builder" heading="Annual Refresh">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </RopaShell>
    );
  }

  if (!source) {
    return (
      <RopaShell title="Annual Refresh — RoPA Builder" heading="Annual Refresh">
        <Alert variant="destructive">
          <AlertTitle>Session not found</AlertTitle>
          <AlertDescription>
            We couldn't find this RoPA session.{" "}
            <Link to="/ropa/documents" className="underline">
              Return to documents
            </Link>
            .
          </AlertDescription>
        </Alert>
      </RopaShell>
    );
  }

  // Phase 4: regulatory updates review
  if (phase === "regulatory" && activeNewSessionId) {
    return (
      <RopaShell
        title="Regulatory updates — RoPA Refresh"
        heading={`Refresh v${source.version_number + 1}: Regulatory updates`}
      >
        <p className="font-body text-muted-foreground mb-6">
          Before reviewing your activities, here's what's changed in your monitored
          jurisdictions since your last RoPA was generated.
        </p>
        <RopaRegulatoryUpdates
          newSessionId={activeNewSessionId}
          clientId={source.client_id}
          lastGeneratedDate={source.completed_at}
          onContinue={goToActivities}
        />
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setPhase("intro")}>
            ← Back
          </Button>
          <Button variant="outline" onClick={goToActivities}>
            Skip and go to activities
          </Button>
        </div>
      </RopaShell>
    );
  }

  return (
    <RopaShell
      title="Annual Refresh — RoPA Builder"
      heading={`Refresh: Version ${source.version_number}`}
    >
      {(() => {
        const { steps, currentIndex } = getRopaSteps("refresh");
        return <RopaBreadcrumb steps={steps} currentIndex={currentIndex} />;
      })()}
      <div className="mb-6">
        <p className="font-body text-muted-foreground">
          Confirm what's still accurate, update what changed, and add new processing
          activities. We'll clone everything from your previous version so you only
          need to review the differences.
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle className="font-heading">How refresh works</AlertTitle>
        <AlertDescription className="font-body text-sm">
          Starting a refresh creates a new version (v{source.version_number + 1}) with
          all {source.total_activities}{" "}
          {source.total_activities === 1 ? "activity" : "activities"} pre-populated.
          You'll go through each one to confirm or update answers, then generate
          updated documents. Your original v{source.version_number} stays available.
        </AlertDescription>
      </Alert>

      {existingCycle?.new_session_id && (
        <Alert className="mb-6 border-primary/40">
          <RefreshCw className="h-4 w-4" />
          <AlertTitle className="font-heading">Refresh already in progress</AlertTitle>
          <AlertDescription className="font-body text-sm flex flex-wrap items-center justify-between gap-3">
            <span>You started a refresh on this version already.</span>
            <Button size="sm" onClick={handleResumeExisting}>
              Continue refresh <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            What you'll review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border p-4">
              <CheckCircle2 className="h-5 w-5 text-primary mb-2" />
              <p className="font-heading text-sm">Confirm</p>
              <p className="font-body text-xs text-muted-foreground">
                Activities still accurate as documented.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <PencilLine className="h-5 w-5 text-primary mb-2" />
              <p className="font-heading text-sm">Update</p>
              <p className="font-body text-xs text-muted-foreground">
                Activities where details have changed.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <Plus className="h-5 w-5 text-primary mb-2" />
              <p className="font-heading text-sm">Add</p>
              <p className="font-body text-xs text-muted-foreground">
                New processing activities since last review.
              </p>
            </div>
          </div>

          <h4 className="font-heading text-sm mb-3">
            Activities from v{source.version_number}
          </h4>
          {activities.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">
              No activities to review.
            </p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="font-body text-sm">{a.display_name}</span>
                  <div className="flex gap-2">
                    {a.is_high_risk && (
                      <Badge variant="destructive" className="text-xs">
                        High risk
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                      {a.category.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link to="/ropa/documents">Cancel</Link>
        </Button>
        <Button
          onClick={handleStartRefresh}
          disabled={starting || !!existingCycle?.new_session_id}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {starting ? "Starting refresh…" : "Start Refresh"}
        </Button>
      </div>
    </RopaShell>
  );
}
