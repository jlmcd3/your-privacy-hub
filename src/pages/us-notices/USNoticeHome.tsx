import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { USNoticeShell } from "@/components/us-notices/USNoticeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/hooks/useActiveClient";
import { formatDistanceToNow } from "date-fns";
import { US_NOTICE_PRICING } from "@/config/pricing";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";

interface SessionRow {
  id: string;
  status: string;
  scope: string | null;
  mode: string | null;
  version_number: number | null;
  is_refresh: boolean;
  started_at: string;
  last_activity_at: string;
  completed_at: string | null;
  state_count?: number;
}

const STATUS_LABELS: Record<string, { label: string; tone: "default" | "secondary" | "outline" }> = {
  in_progress: { label: "In progress", tone: "secondary" },
  questions_complete: { label: "Ready to review", tone: "secondary" },
  ready_to_generate: { label: "Ready to generate", tone: "secondary" },
  completed: { label: "Completed", tone: "default" },
  abandoned: { label: "Abandoned", tone: "outline" },
};

export default function USNoticeHome() {
  const { user } = useAuth();
  const { clientId, clientName, isMultiClient } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!user) return;
    // Reset list immediately so the user sees a loading state when switching clients.
    setSessions([]);
    (async () => {
      setLoading(true);
      try {
        // Determine which client(s) to scope to.
        let clientIds: string[] = [];
        if (clientId) {
          clientIds = [clientId];
        } else {
          const { data: clients } = await supabase
            .from("clients")
            .select("id")
            .eq("owner_id", user.id)
            .eq("is_active", true);
          clientIds = (clients ?? []).map((c) => c.id);
        }
        if (clientIds.length === 0) {
          setSessions([]);
          return;
        }

        const { data: sessionRows, error: sessionErr } = await supabase
          .from("us_notice_sessions")
          .select(
            "id, status, scope, mode, version_number, is_refresh, started_at, last_activity_at, completed_at",
          )
          .in("client_id", clientIds)
          .order("last_activity_at", { ascending: false });
        if (sessionErr) throw sessionErr;

        const ids = (sessionRows ?? []).map((s) => s.id);
        let countsBySession: Record<string, number> = {};
        if (ids.length > 0) {
          const { data: stateRows } = await supabase
            .from("us_notice_state_selections")
            .select("session_id")
            .in("session_id", ids);
          for (const r of stateRows ?? []) {
            countsBySession[r.session_id] = (countsBySession[r.session_id] ?? 0) + 1;
          }
        }

        setSessions(
          (sessionRows ?? []).map((s) => ({
            ...s,
            state_count: countsBySession[s.id] ?? 0,
          })) as SessionRow[],
        );
      } catch (err) {
        console.error("[USNoticeHome] load error", err);
        toast({
          title: "Couldn't load your notice projects",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, clientId, toast]);

  function resumeRoute(s: SessionRow): string {
    switch (s.status) {
      case "completed":
        return `/us-notices/${s.id}/documents`;
      case "ready_to_generate":
        return `/us-notices/${s.id}/documents`;
      case "questions_complete":
        return `/us-notices/${s.id}/review`;
      default:
        // Resume in flow: states -> questions
        return s.state_count && s.state_count > 0
          ? `/us-notices/${s.id}/questions`
          : `/us-notices/${s.id}/states`;
    }
  }

  async function handleCreateNew() {
    if (!user) {
      navigate("/login?redirect=/us-notices");
      return;
    }
    setCreating(true);
    try {
      // Prefer the active client; otherwise fall back to the user's primary active client.
      let targetClientId = clientId;
      if (!targetClientId) {
        const { data: clients, error: clientsErr } = await supabase
          .from("clients")
          .select("id")
          .eq("owner_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1);
        if (clientsErr) throw clientsErr;
        targetClientId = clients?.[0]?.id ?? null;
      }
      if (!targetClientId) {
        toast({
          title: "No client profile found",
          description: "Set up a client profile before starting a notice.",
          variant: "destructive",
        });
        return;
      }

      const { data: created, error: insertErr } = await supabase
        .from("us_notice_sessions")
        .insert({
          client_id: targetClientId,
          status: "in_progress",
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      navigate(`/us-notices/${created.id}/mode`);
    } catch (err) {
      console.error("[USNoticeHome] create error", err);
      toast({
        title: "Couldn't start a new notice",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  const activeSession = sessions.find(
    (s) => s.status !== "completed" && s.status !== "abandoned",
  );
  const latestCompleted = sessions.find((s) => s.status === "completed");

  const heading =
    isMultiClient && clientName
      ? `US Privacy Notices — ${clientName}`
      : "US Privacy Notice Builder";

  if (loading) {
    return (
      <USNoticeShell
        title="US Privacy Notice Builder — End User Privacy"
        heading={heading}
      >
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </USNoticeShell>
    );
  }

  return (
    <USNoticeShell
      title="US Privacy Notice Builder — End User Privacy"
      heading={heading}
      chip="📍 US State Notice Builder"
      description="Generate state-specific privacy notices that match your data practices and the laws that apply to you — California (CCPA/CPRA), the Virginia model (16 states), Maryland (MODPA), and Florida (FDBR) — in one guided session, with version control and refresh built in."
    >
      <p className="text-sm text-muted-foreground mb-8">
        From <span className="font-medium text-foreground">{US_NOTICE_PRICING.singleSubscriber()}</span> (Intelligence subscriber) ·{" "}
        <span className="font-medium text-foreground">{US_NOTICE_PRICING.singleStandalone()}</span> standalone per state
      </p>

      {/* Empty state */}
      {sessions.length === 0 && (
        <Card className="border-dashed mb-8">
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" aria-hidden />
            <h2 className="font-serif mb-1">No notice projects yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
              Start a new project to determine which US states apply to you and generate
              a notice for each.
            </p>
            <Button onClick={handleCreateNew} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Start your first notice
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active session highlight */}
      {activeSession && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                Pick up where you left off
              </div>
              <h2 className="font-serif mb-1">In-progress notice</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={STATUS_LABELS[activeSession.status]?.tone ?? "secondary"}>
                  {STATUS_LABELS[activeSession.status]?.label ?? activeSession.status}
                </Badge>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {activeSession.state_count ?? 0} state
                  {activeSession.state_count === 1 ? "" : "s"} selected
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  Updated {formatDistanceToNow(new Date(activeSession.last_activity_at))} ago
                </span>
              </div>
            </div>
            <Button asChild>
              <Link to={resumeRoute(activeSession)}>
                Resume
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Start new + latest completed CTA row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h3 className="">Start a new notice</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Begin a fresh state-by-state notice project from scratch.
            </p>
            <Button onClick={handleCreateNew} disabled={creating} className="w-full sm:w-auto">
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              New notice
            </Button>
          </CardContent>
        </Card>

        {latestCompleted ? (
          <Card>
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="">Latest completed</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {latestCompleted.state_count ?? 0} state
                {latestCompleted.state_count === 1 ? "" : "s"} · v
                {latestCompleted.version_number ?? 1} · completed{" "}
                {latestCompleted.completed_at
                  ? formatDistanceToNow(new Date(latestCompleted.completed_at)) + " ago"
                  : "—"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/us-notices/${latestCompleted.id}/documents`}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    View documents
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/us-notices/${latestCompleted.id}/refresh`}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Refresh
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="">Generated notices appear here</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Once you finish a notice project, your latest version shows up for quick
                access and refresh.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* All sessions list */}
      {sessions.length > 0 && (
        <Card>
          <CardContent className="p-4 md:p-6">
            <h2 className="font-serif mb-4">All notice projects</h2>
            <ul className="divide-y">
              {sessions.map((s) => {
                const status = STATUS_LABELS[s.status] ?? {
                  label: s.status,
                  tone: "outline" as const,
                };
                return (
                  <li
                    key={s.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={status.tone}>{status.label}</Badge>
                        {s.is_refresh && (
                          <Badge variant="outline" className="text-meta">
                            Refresh
                          </Badge>
                        )}
                        {s.version_number && s.version_number > 0 && (
                          <span className="text-xs text-muted-foreground">
                            v{s.version_number}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {s.state_count ?? 0} state
                          {s.state_count === 1 ? "" : "s"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden />
                          Updated {formatDistanceToNow(new Date(s.last_activity_at))} ago
                        </span>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={resumeRoute(s)}>
                        {s.status === "completed" ? "View" : "Resume"}
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </USNoticeShell>
  );
}
