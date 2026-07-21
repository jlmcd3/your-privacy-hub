import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EUNoticeShell } from "@/components/eu-notices/EUNoticeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/hooks/useActiveClient";
import { formatDistanceToNow } from "date-fns";
import { EU_NOTICE_PRICING } from "@/config/pricing";
import { ArrowRight, Clock, FileText, Plus, RefreshCw, Globe2, Globe } from 'lucide-react';

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
  framework_count?: number;
}

const STATUS_LABELS: Record<string, { label: string; tone: "default" | "secondary" | "outline" }> = {
  in_progress: { label: "In progress", tone: "secondary" },
  review: { label: "Ready to review", tone: "secondary" },
  generated: { label: "Completed", tone: "default" },
  archived: { label: "Archived", tone: "outline" },
};

export default function EUNoticeHome() {
  const { user } = useAuth();
  const { clientId, clientName, isMultiClient } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!user) return;
    setSessions([]);
    (async () => {
      setLoading(true);
      try {
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
          .from("eu_notice_sessions")
          .select(
            "id, status, scope, mode, version_number, is_refresh, started_at, last_activity_at, completed_at",
          )
          .in("client_id", clientIds)
          .order("last_activity_at", { ascending: false });
        if (sessionErr) throw sessionErr;

        const ids = (sessionRows ?? []).map((s) => s.id);
        const countsBySession: Record<string, number> = {};
        if (ids.length > 0) {
          const { data: fwRows } = await supabase
            .from("eu_notice_framework_selections")
            .select("session_id")
            .in("session_id", ids);
          for (const r of fwRows ?? []) {
            countsBySession[r.session_id] = (countsBySession[r.session_id] ?? 0) + 1;
          }
        }

        setSessions(
          (sessionRows ?? []).map((s) => ({
            ...s,
            framework_count: countsBySession[s.id] ?? 0,
          })) as SessionRow[],
        );
      } catch (err) {
        console.error("[EUNoticeHome] load error", err);
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
      case "generated":
      case "archived":
        return `/eu-notices/documents`;
      case "review":
        return `/eu-notices/review/${s.id}`;
      default:
        return s.framework_count && s.framework_count > 0
          ? `/eu-notices/questions/${s.id}`
          : `/eu-notices/frameworks/${s.id}`;
    }
  }

  const heading =
    isMultiClient && clientName
      ? `EU & Global Notices — ${clientName}`
      : "EU & Global Notice Builder";

  if (loading) {
    return (
      <EUNoticeShell title="EU & Global Notice Builder — End User Privacy" heading={heading}>
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </EUNoticeShell>
    );
  }

  const activeSession = sessions.find(
    (s) => s.status !== "generated" && s.status !== "archived",
  );

  return (
    <EUNoticeShell
      title="EU & Global Notice Builder — End User Privacy"
      heading={heading}
      chip=" Global Notice Builder"
      description="Generate aligned privacy notices for the EU GDPR, UK GDPR, Swiss FADP, Brazil LGPD, Japan APPI, India DPDPA, South Africa POPIA and five other global frameworks — in a single guided session, calibrated to each regulator's disclosure expectations."
    >
      <p className="text-sm text-muted-foreground mb-8">
        From <span className="font-medium text-foreground">{EU_NOTICE_PRICING.singleSubscriber()}</span> (subscriber) ·{" "}
        <span className="font-medium text-foreground">{EU_NOTICE_PRICING.singleStandalone()}</span> standalone per framework ·
        Full international from <span className="font-medium text-foreground">{EU_NOTICE_PRICING.fullInternationalSubscriber()}</span>
      </p>

      {sessions.length === 0 && (
        <Card className="border-dashed mb-8">
          <CardContent className="p-8 text-center">
            <Globe2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" aria-hidden />
            <h2 className="font-serif mb-1">No EU or global notices yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
              Pick the frameworks you operate under and we'll generate a tailored
              privacy notice for each.
            </p>
            <Button asChild>
              <Link to="/eu-notices/mode">
                <Plus className="h-4 w-4 mr-2" />
                Start your first notice
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
                  <Globe2 className="h-3 w-3" aria-hidden />
                  {activeSession.framework_count ?? 0} framework
                  {activeSession.framework_count === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  Updated {formatDistanceToNow(new Date(activeSession.last_activity_at))} ago
                </span>
              </div>
            </div>
            <Button asChild>
              <Link to={resumeRoute(activeSession)}>
                Resume <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h3 className="">Start a new notice</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Pick from 12 global frameworks. Single, EU Suite, or Full International.
            </p>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/eu-notices/mode">
                <Plus className="h-4 w-4 mr-2" />
                New notice
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h3 className="">Your generated notices</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              View, download, and embed every notice you've generated.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/eu-notices/documents">
                <FileText className="h-4 w-4 mr-2" />
                Open library
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {sessions.length > 0 && (
        <Card>
          <CardContent className="p-4 md:p-6">
            <h2 className="font-serif mb-4">All notice projects</h2>
            <ul className="divide-y">
              {sessions.map((s) => {
                const status = STATUS_LABELS[s.status] ?? { label: s.status, tone: "outline" as const };
                return (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={status.tone}>{status.label}</Badge>
                        {s.is_refresh && (
                          <Badge variant="outline" className="text-meta">Refresh</Badge>
                        )}
                        {s.version_number && s.version_number > 0 && (
                          <span className="text-xs text-muted-foreground">v{s.version_number}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Globe2 className="h-3 w-3" aria-hidden />
                          {s.framework_count ?? 0} framework{s.framework_count === 1 ? "" : "s"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden />
                          Updated {formatDistanceToNow(new Date(s.last_activity_at))} ago
                        </span>
                        {s.scope && <span className="capitalize">{s.scope.replace("_", " ")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {s.status === "generated" && (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/eu-notices/refresh/${s.id}`}>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            Refresh
                          </Link>
                        </Button>
                      )}
                      <Button asChild variant="ghost" size="sm">
                        <Link to={resumeRoute(s)}>
                          {s.status === "generated" ? "View" : "Resume"}
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </EUNoticeShell>
  );
}
// satisfy unused-import for navigate (kept for future routing)
void useNavigate;
