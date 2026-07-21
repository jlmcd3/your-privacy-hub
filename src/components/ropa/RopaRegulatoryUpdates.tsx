import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, Info, ArrowRight, ExternalLink } from 'lucide-react';
import { format } from "date-fns";

export interface RegulatoryUpdate {
  article_id: string;
  title: string;
  summary: string;
  url: string;
  jurisdiction_code: string;
  jurisdiction_name: string;
  affected_template_keys: string[];
  affected_question_keys: string[];
  urgency: "high" | "medium";
  action_required: string;
  source_date: string;
}

interface Props {
  newSessionId: string;
  clientId: string;
  lastGeneratedDate: string | null;
  onContinue: () => void;
}

export function RopaRegulatoryUpdates({ newSessionId, clientId, lastGeneratedDate, onContinue }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<RegulatoryUpdate[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Array<{ code: string; name: string }>>([]);
  const [notedIds, setNotedIds] = useState<Set<string>>(new Set());
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    void loadUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSessionId]);

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-ropa-regulatory-updates", {
        body: { session_id: newSessionId, last_generated_date: lastGeneratedDate },
      });
      if (error) throw error;
      setUpdates((data?.updates || []) as RegulatoryUpdate[]);
      setJurisdictions((data?.jurisdictions_monitored || []) as Array<{ code: string; name: string }>);

      // Already noted in this session?
      const { data: noted } = await supabase
        .from("ropa_noted_regulatory_updates")
        .select("article_id")
        .eq("session_id", newSessionId);
      setNotedIds(new Set((noted || []).map((n) => n.article_id)));
    } catch (err) {
      console.error("Failed to load regulatory updates:", err);
      toast({
        title: "Couldn't load regulatory updates",
        description: err instanceof Error ? err.message : "Continuing without them.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewActivity = async (update: RegulatoryUpdate) => {
    if (update.affected_template_keys.length === 0) return;
    setActingId(update.article_id);
    try {
      // Find the activity in this session matching the first affected template_key
      const { data: activity } = await supabase
        .from("ropa_processing_activities")
        .select("id")
        .eq("session_id", newSessionId)
        .in("template_key", update.affected_template_keys)
        .limit(1)
        .maybeSingle();
      if (!activity) {
        toast({
          title: "No matching activity",
          description: "Continue and add this manually if relevant.",
        });
        return;
      }
      const qKey = update.affected_question_keys[0];
      const url = qKey
        ? `/ropa/activity/${activity.id}?highlight=${encodeURIComponent(qKey)}`
        : `/ropa/activity/${activity.id}`;
      navigate(url);
    } catch (err) {
      console.error(err);
    } finally {
      setActingId(null);
    }
  };

  const handleNoteAndContinue = async (update: RegulatoryUpdate) => {
    setActingId(update.article_id);
    try {
      const { error: noteErr } = await supabase
        .from("ropa_noted_regulatory_updates")
        .upsert(
          {
            session_id: newSessionId,
            client_id: clientId,
            article_id: update.article_id,
            article_title: update.title,
            article_url: update.url,
            jurisdiction_code: update.jurisdiction_code,
            urgency: update.urgency,
          },
          { onConflict: "session_id,article_id" },
        );
      if (noteErr) throw noteErr;

      // Also create an info flag for visibility in the review screen
      await supabase.from("ropa_flags").insert({
        session_id: newSessionId,
        activity_id: null,
        flag_type: "recommendation",
        severity: "info",
        question_key: null,
        flag_message: `Noted regulatory update: ${update.title} (${update.jurisdiction_name})`,
        consequence: update.action_required,
        action_label: "Open source",
        action_route: update.url,
        resolved: false,
      });

      setNotedIds((s) => new Set([...s, update.article_id]));
      toast({ title: "Noted", description: "Will appear in your document appendix." });
    } catch (err) {
      console.error("Note failed:", err);
      toast({
        title: "Couldn't save note",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Checking regulatory updates…</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (updates.length === 0) {
    return (
      <Card className="mb-6 border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-1 shrink-0" />
            <div className="flex-1">
              <p className="font-heading text-base mb-1">
                No regulatory changes require action for your jurisdictions since your last RoPA.
              </p>
              {jurisdictions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="font-mono text-xs text-muted-foreground mr-1">
                    Jurisdictions monitored:
                  </span>
                  {jurisdictions.map((j) => (
                    <Badge key={j.code} variant="outline" className="text-xs">
                      {j.name}
                    </Badge>
                  ))}
                </div>
              )}
              <Button onClick={onContinue} className="mt-4 gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="font-heading text-lg">
          Regulatory updates to review ({updates.length})
        </CardTitle>
        <p className="font-body text-sm text-muted-foreground">
          New developments in your monitored jurisdictions since your last RoPA.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {updates.map((u) => {
          const isNoted = notedIds.has(u.article_id);
          const isHigh = u.urgency === "high";
          return (
            <div
              key={u.article_id}
              className={`rounded-lg border p-4 ${
                isHigh
                  ? "border-orange-500/40 bg-orange-50/30 dark:bg-orange-950/10"
                  : "border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/10"
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                {isHigh ? (
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                )}
                <Badge variant={isHigh ? "destructive" : "secondary"} className="text-xs uppercase">
                  {isHigh ? "High relevance" : "Medium relevance"}
                </Badge>
              </div>

              <a
                href={u.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading text-base hover:underline inline-flex items-center gap-1"
              >
                {u.title}
                <ExternalLink className="h-3 w-3" />
              </a>

              <p className="font-mono text-xs text-muted-foreground mt-1">
                {u.jurisdiction_name} · {format(new Date(u.source_date), "MMM d, yyyy")}
              </p>

              {u.affected_template_keys.length > 0 && (
                <p className="font-body text-xs text-muted-foreground mt-2">
                  <span className="font-medium">Affects:</span>{" "}
                  {u.affected_template_keys.map((k) => k.replace(/_/g, " ")).join(", ")}
                </p>
              )}

              {u.summary && (
                <p className="font-body text-sm mt-3 line-clamp-3">{u.summary}</p>
              )}

              <p className="font-body text-sm mt-3">
                <span className="font-medium">What this may mean:</span> {u.action_required}
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actingId === u.article_id}
                  onClick={() => handleReviewActivity(u)}
                >
                  Review this activity →
                </Button>
                <Button
                  size="sm"
                  variant={isNoted ? "secondary" : "default"}
                  disabled={isNoted || actingId === u.article_id}
                  onClick={() => handleNoteAndContinue(u)}
                >
                  {isNoted ? "Noted " : "Note and continue"}
                </Button>
              </div>
            </div>
          );
        })}

        <div className="flex justify-end pt-2">
          <Button onClick={onContinue} className="gap-2">
            Continue to review <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
