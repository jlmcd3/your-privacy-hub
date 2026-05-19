import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { EUNoticeShell } from "@/components/eu-notices/EUNoticeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEuNoticeSessionGuard } from "@/hooks/useEuNoticeSessionGuard";
import { EU_NOTICE_PRICING } from "@/config/pricing";

interface SessionRow {
  id: string;
  client_id: string;
  scope: string | null;
  version_number: number | null;
  completed_at: string | null;
}

export default function EUNoticeRefresh() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authorized } = useEuNoticeSessionGuard(sessionId);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [session, setSession] = useState<SessionRow | null>(null);

  useEffect(() => {
    if (!sessionId || !authorized) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("eu_notice_sessions")
        .select("id, client_id, scope, version_number, completed_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (error || !data) {
        toast({ title: "Session not found", variant: "destructive" });
        navigate("/eu-notices");
        return;
      }
      setSession(data as SessionRow);
      setLoading(false);
    })();
  }, [sessionId, authorized, navigate, toast]);

  async function handleStartRefresh() {
    if (!session) return;
    setCreating(true);
    // 1. Create new session as a refresh of the parent
    const { data: newSession, error: sessionErr } = await supabase
      .from("eu_notice_sessions")
      .insert({
        client_id: session.client_id,
        mode: "standalone",
        is_refresh: true,
        parent_session_id: session.id,
        scope: session.scope ?? "single",
      })
      .select("id")
      .single();
    if (sessionErr || !newSession) {
      setCreating(false);
      toast({ title: "Could not start refresh", description: sessionErr?.message, variant: "destructive" });
      return;
    }
    // 2. Copy framework selections
    const { data: priorFw } = await supabase
      .from("eu_notice_framework_selections")
      .select("framework_code, framework_name, region")
      .eq("session_id", session.id);
    if (priorFw && priorFw.length > 0) {
      await supabase.from("eu_notice_framework_selections").insert(
        priorFw.map((f) => ({ ...f, session_id: newSession.id })),
      );
    }
    // 3. Copy answers as starting point
    const { data: priorAns } = await supabase
      .from("eu_notice_answers")
      .select("question_key, answer_value, ropa_activity_id")
      .eq("session_id", session.id)
      .is("ropa_activity_id", null);
    if (priorAns && priorAns.length > 0) {
      await supabase.from("eu_notice_answers").insert(
        priorAns.map((a) => ({ ...a, session_id: newSession.id })),
      );
    }
    setCreating(false);
    navigate(`/eu-notices/questions/${newSession.id}`);
  }

  if (loading || !session) {
    return (
      <EUNoticeShell title="Refresh — EU & Global Notice Builder" heading="Refresh your notices" step="refresh" sessionId={sessionId}>
        <Skeleton className="h-32 w-full" />
      </EUNoticeShell>
    );
  }

  return (
    <EUNoticeShell title="Refresh — EU & Global Notice Builder" heading="Refresh your notices" step="refresh" sessionId={sessionId}>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 p-3"><RefreshCw className="h-6 w-6 text-primary" /></div>
            <div>
              <h2 className="font-serif mb-1">Annual refresh</h2>
              <p className="text-sm text-muted-foreground">
                We'll copy your prior answers and frameworks into a new session so you only need to update what's changed.
                Last generated: {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : "—"} · v{session.version_number ?? 1}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Refresh from <span className="font-medium text-foreground">{EU_NOTICE_PRICING.refreshSubscriber()}</span> (subscriber) ·{" "}
            <span className="font-medium text-foreground">{EU_NOTICE_PRICING.refreshStandalone()}</span> standalone.
          </p>
          <div className="flex justify-between">
            <Button asChild variant="ghost"><Link to="/eu-notices"><ArrowLeft className="h-4 w-4 mr-1.5" /> Cancel</Link></Button>
            <Button onClick={handleStartRefresh} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start refresh <ArrowRight className="h-4 w-4 ml-1.5" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </EUNoticeShell>
  );
}
