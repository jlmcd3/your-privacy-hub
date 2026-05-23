import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { EUNoticeShell } from "@/components/eu-notices/EUNoticeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EU_NOTICE_PRICING } from "@/config/pricing";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEuNoticeSessionGuard } from "@/hooks/useEuNoticeSessionGuard";

interface Framework {
  framework_code: string;
  framework_name: string;
  region: string;
  full_law_name: string;
  template_type: string;
  is_active: boolean;
}

const EU_SUITE_CODES = ["EU_GDPR", "UK_GDPR", "CH_FADP"];

export default function EUNoticeFrameworks() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { verifying, authorized } = useEuNoticeSessionGuard(sessionId);

  const [loading, setLoading] = useState(true);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("eu_privacy_frameworks")
        .select("*")
        .eq("is_active", true)
        .order("region");
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load frameworks", description: error.message, variant: "destructive" });
      } else {
        setFrameworks((data ?? []) as Framework[]);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [toast, authorized]);

  const grouped = useMemo(() => {
    const out: Record<string, Framework[]> = {};
    for (const f of frameworks) {
      (out[f.region] ??= []).push(f);
    }
    return out;
  }, [frameworks]);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function selectEUSuite() {
    setSelected(new Set(EU_SUITE_CODES));
  }
  function selectAll() {
    setSelected(new Set(frameworks.map((f) => f.framework_code)));
  }

  async function handleContinue() {
    if (!sessionId || selected.size === 0) return;
    setSubmitting(true);

    // Wipe prior selections (idempotent re-entry)
    await supabase.from("eu_notice_framework_selections").delete().eq("session_id", sessionId);

    const rows = Array.from(selected).map((code) => {
      const fw = frameworks.find((f) => f.framework_code === code)!;
      return {
        session_id: sessionId,
        framework_code: fw.framework_code,
        framework_name: fw.framework_name,
        region: fw.region,
      };
    });

    const { error: insertErr } = await supabase.from("eu_notice_framework_selections").insert(rows);
    if (insertErr) {
      setSubmitting(false);
      toast({ title: "Could not save selections", description: insertErr.message, variant: "destructive" });
      return;
    }

    let scope: "single" | "suite" | "full_international" = "single";
    if (selected.size === frameworks.length) scope = "full_international";
    else if (selected.size > 1) scope = "suite";

    await supabase
      .from("eu_notice_sessions")
      .update({ scope, last_activity_at: new Date().toISOString() })
      .eq("id", sessionId);

    setSubmitting(false);
    navigate(`/eu-notices/questions/${sessionId}`);
  }

  if (verifying || loading) {
    return (
      <EUNoticeShell title="Frameworks — EU & Global Notice Builder" heading="Pick your frameworks" step="frameworks" sessionId={sessionId}>
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </EUNoticeShell>
    );
  }

  return (
    <EUNoticeShell title="Frameworks — EU & Global Notice Builder" heading="Which frameworks apply to you?" step="frameworks" sessionId={sessionId}>
      <p className="text-muted-foreground text-base mb-6 max-w-2xl">
        Select every privacy framework you need to comply with. We'll generate a separate notice for each, plus an optional combined international notice.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button onClick={selectEUSuite} variant="default" size="sm">EU Suite (GDPR + UK + Swiss)</Button>
        <Button onClick={selectAll} variant="outline" size="sm">Select all 12 frameworks</Button>
        <Button onClick={() => setSelected(new Set())} variant="ghost" size="sm">Clear</Button>
      </div>

      {Object.entries(grouped).map(([region, fws]) => (
        <section key={region} className="mb-6">
          <h3 className="text-foreground mb-3">{region}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fws.map((fw) => {
              const isSelected = selected.has(fw.framework_code);
              return (
                <Card
                  key={fw.framework_code}
                  onClick={() => toggle(fw.framework_code)}
                  className={`cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox checked={isSelected} className="mt-1" onCheckedChange={() => toggle(fw.framework_code)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{fw.framework_name}</span>
                          {EU_SUITE_CODES.includes(fw.framework_code) && (
                            <Badge variant="secondary" className="text-meta">EU Suite</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{fw.full_law_name}</p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-xs text-muted-foreground text-center mb-24">
        Single framework from {EU_NOTICE_PRICING.singleSubscriber()} · Suite from {EU_NOTICE_PRICING.suiteSubscriber()} · Full international from {EU_NOTICE_PRICING.fullInternationalSubscriber()}
      </p>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm">
            <span className="font-semibold text-foreground">{selected.size}</span>{" "}
            <span className="text-muted-foreground">framework{selected.size === 1 ? "" : "s"} selected</span>
          </p>
          <Button onClick={handleContinue} disabled={selected.size === 0 || submitting} className="w-full sm:w-auto min-h-[44px]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue to questions <ArrowRight className="ml-1.5 h-4 w-4" /></>}
          </Button>
        </div>
      </div>
    </EUNoticeShell>
  );
}
