import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RopaShell } from "@/components/ropa/RopaShell";
import { withSession } from "@/lib/ropaSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import {
  FileText,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Trash2,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { adminDelete } from "@/lib/adminDelete";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionRow {
  id: string;
  status: string;
  is_refresh: boolean;
  version_number: number;
  total_activities: number;
  completed_activities: number;
  open_flags_count: number;
  started_at: string;
  last_activity_at: string;
  completed_at: string | null;
  paid_at: string | null;
  payment_confirmed: boolean;
  generated_docx_path: string | null;
  generated_pdf_path: string | null;
  generated_xlsx_path: string | null;
}

const REFRESH_REMINDER_DAYS = 335; // ~11 months

export default function RopaHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [latestGenerated, setLatestGenerated] = useState<SessionRow | null>(null);
  const [allSessions, setAllSessions] = useState<SessionRow[]>([]);
  const [pendingDelete, setPendingDelete] = useState<SessionRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    if (!user) return;
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .eq("owner_id", user.id)
      .eq("is_active", true);
    const clientIds = (clients ?? []).map((c) => c.id);
    if (clientIds.length === 0) {
      setAllSessions([]);
      setActiveSession(null);
      setLatestGenerated(null);
      return;
    }
    const { data: sessions } = await supabase
      .from("ropa_sessions")
      .select(
        "id,status,is_refresh,version_number,total_activities,completed_activities,open_flags_count,started_at,last_activity_at,completed_at,paid_at,payment_confirmed,generated_docx_path,generated_pdf_path,generated_xlsx_path"
      )
      .in("client_id", clientIds)
      .order("last_activity_at", { ascending: false });
    const rows = (sessions ?? []) as SessionRow[];
    setAllSessions(rows);
    setActiveSession(
      rows.find((r) => r.status === "in_progress" || r.status === "review") ?? null
    );
    setLatestGenerated(
      rows.find(
        (r) => r.status === "generated" && (r.generated_docx_path || r.generated_pdf_path)
      ) ?? null
    );
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminDelete("ropa_session", pendingDelete.id);
      toast({ title: "RoPA session deleted" });
      setPendingDelete(null);
      await reload();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: clients } = await supabase
          .from("clients")
          .select("id")
          .eq("owner_id", user.id)
          .eq("is_active", true);
        const clientIds = (clients ?? []).map((c) => c.id);
        if (clientIds.length === 0) {
          setLoading(false);
          return;
        }
        const { data: sessions } = await supabase
          .from("ropa_sessions")
          .select(
            "id,status,is_refresh,version_number,total_activities,completed_activities,open_flags_count,started_at,last_activity_at,completed_at,paid_at,payment_confirmed,generated_docx_path,generated_pdf_path,generated_xlsx_path"
          )
          .in("client_id", clientIds)
          .order("last_activity_at", { ascending: false });

        const rows = (sessions ?? []) as SessionRow[];
        setAllSessions(rows);
        setActiveSession(
          rows.find((r) => r.status === "in_progress" || r.status === "review") ?? null
        );
        setLatestGenerated(
          rows.find(
            (r) => r.status === "generated" && (r.generated_docx_path || r.generated_pdf_path)
          ) ?? null
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const refreshDue =
    latestGenerated?.completed_at &&
    differenceInDays(new Date(), new Date(latestGenerated.completed_at)) >= REFRESH_REMINDER_DAYS;

  const downloadDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("ropa-documents")
      .createSignedUrl(path, 60);
    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <RopaShell
      title="RoPA Builder — End User Privacy"
      heading="RoPA Builder"
      chip="📒 Article 30 Record Builder"
      description="Build and maintain the Article 30 GDPR Record of Processing Activities your DPO is expected to produce on request — a guided wizard captures each processing activity, legal basis, data category, and transfer detail, then outputs the documented record in .docx, .pdf, and .xlsx."
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Refresh-due banner */}
          {refreshDue && latestGenerated && (
            <Card className="border-warning/40 bg-warning/5">
              <CardContent className="py-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    Your RoPA is due for an annual refresh.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generated{" "}
                    {formatDistanceToNow(new Date(latestGenerated.completed_at!), {
                      addSuffix: true,
                    })}
                    . Article 30 GDPR requires keeping records up to date.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link to={`/ropa/refresh/${latestGenerated.id}`}>Start refresh</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Active session */}
          {activeSession ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="font-serif text-xl">
                    {activeSession.is_refresh
                      ? `Refresh in progress (v${activeSession.version_number})`
                      : "RoPA in progress"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Last edited{" "}
                    {formatDistanceToNow(new Date(activeSession.last_activity_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {activeSession.status.replace("_", " ")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      {activeSession.completed_activities} of{" "}
                      {activeSession.total_activities} activities complete
                    </span>
                    {activeSession.open_flags_count > 0 && (
                      <span className="text-warning flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {activeSession.open_flags_count} open flag
                        {activeSession.open_flags_count === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <Progress
                    value={
                      activeSession.total_activities > 0
                        ? (activeSession.completed_activities /
                            activeSession.total_activities) *
                          100
                        : 0
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to={withSession("/ropa/activities", activeSession.id)}>
                      Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/ropa/review/${activeSession.id}`}>Review</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h2 className="font-serif text-foreground mb-2">
                  Build your Record of Processing Activities
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                  An Article 30 GDPR-compliant record, generated from a guided wizard
                  customized to your organisation.
                </p>
                <Button onClick={() => navigate("/ropa/setup")} size="lg">
                  <Plus className="mr-1.5 h-4 w-4" /> Start RoPA
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  $40 for subscribers · $79 standalone
                </p>
              </CardContent>
            </Card>
          )}

          {/* Latest generated documents */}
          {latestGenerated && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Latest generated RoPA
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Version {latestGenerated.version_number} •{" "}
                  {latestGenerated.completed_at &&
                    format(new Date(latestGenerated.completed_at), "MMM d, yyyy")}
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {latestGenerated.generated_docx_path && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDoc(latestGenerated.generated_docx_path!)}
                  >
                    <Download className="mr-1.5 h-4 w-4" /> .docx
                  </Button>
                )}
                {latestGenerated.generated_pdf_path && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDoc(latestGenerated.generated_pdf_path!)}
                  >
                    <Download className="mr-1.5 h-4 w-4" /> .pdf
                  </Button>
                )}
                {latestGenerated.generated_xlsx_path && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDoc(latestGenerated.generated_xlsx_path!)}
                  >
                    <Download className="mr-1.5 h-4 w-4" /> .xlsx
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className="ml-auto">
                  <Link to="/ropa/documents">All documents</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {allSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl">History</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {allSessions.slice(0, 6).map((s) => (
                    <li key={s.id} className="py-3 flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {s.is_refresh ? "Refresh" : "Initial"} • v{s.version_number}
                          <span className="text-muted-foreground">
                            {" "}
                            — {format(new Date(s.started_at), "MMM d, yyyy")}
                          </span>
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs">
                        {s.status.replace("_", " ")}
                      </Badge>
                      {s.status === "generated" ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/ropa/refresh/${s.id}`}>
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/ropa/review/${s.id}`}>Open</Link>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </RopaShell>
  );
}
