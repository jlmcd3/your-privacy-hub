import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, ClipboardList, ArrowRight, Loader2 } from "lucide-react";
import { EUNoticeShell } from "@/components/eu-notices/EUNoticeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClient } from "@/hooks/useActiveClient";
import { format } from "date-fns";

interface RopaSessionOption {
  id: string;
  version_number: number;
  completed_at: string | null;
}

export default function EUNoticeMode() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clientId, clientName } = useActiveClient();
  const [searchParams] = useSearchParams();

  const presetMode = searchParams.get("mode");
  const presetRopaId = searchParams.get("ropa_session_id");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<"ropa_powered" | "standalone" | null>(null);
  const [completedRopas, setCompletedRopas] = useState<RopaSessionOption[]>([]);
  const [selectedRopaId, setSelectedRopaId] = useState<string | null>(presetRopaId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!clientId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("ropa_sessions")
        .select("id, version_number, completed_at, status")
        .eq("client_id", clientId)
        .in("status", ["generated", "review"])
        .order("completed_at", { ascending: false, nullsFirst: false });

      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load RoPA sessions", description: error.message, variant: "destructive" });
        setCompletedRopas([]);
      } else {
        const rows = (data ?? []) as RopaSessionOption[];
        setCompletedRopas(rows);
        if (!selectedRopaId && rows.length === 1) {
          setSelectedRopaId(rows[0].id);
        }
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const hasCompletedRopa = completedRopas.length > 0;
  const showRopaPicker = completedRopas.length > 1;

  const effectiveRopaId = useMemo(() => {
    if (selectedRopaId && completedRopas.some((r) => r.id === selectedRopaId)) return selectedRopaId;
    if (completedRopas.length === 1) return completedRopas[0].id;
    return null;
  }, [selectedRopaId, completedRopas]);

  async function handleStart(mode: "ropa_powered" | "standalone") {
    if (!clientId) {
      toast({ title: "Select a client first", description: "Choose an active client from the switcher.", variant: "destructive" });
      return;
    }
    if (mode === "ropa_powered" && !effectiveRopaId) {
      toast({ title: "Pick a RoPA", description: "Select which RoPA to use.", variant: "destructive" });
      return;
    }

    setCreating(mode);
    const { data, error } = await supabase
      .from("eu_notice_sessions")
      .insert({
        client_id: clientId,
        mode,
        ropa_session_id: mode === "ropa_powered" ? effectiveRopaId : null,
      })
      .select("id")
      .single();

    if (error || !data) {
      setCreating(null);
      toast({ title: "Could not start session", description: error?.message ?? "Unknown error", variant: "destructive" });
      return;
    }
    navigate(`/eu-notices/frameworks/${data.id}`);
  }

  return (
    <EUNoticeShell title="Choose Your Path — EU & Global Notice Builder" heading="EU & Global Notice Builder" step="mode">
      <p className="text-muted-foreground text-base mb-2">Choose how you'd like to start.</p>
      {clientName && (
        <p className="text-xs text-muted-foreground mb-8">
          Active client: <span className="font-medium text-foreground">{clientName}</span>
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className={`relative border-2 transition-colors ${hasCompletedRopa || presetMode === "ropa_powered" ? "hover:border-primary" : "opacity-60"} ${presetMode === "ropa_powered" ? "border-primary" : "border-border"}`}>
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="rounded-lg bg-primary/10 p-3"><FileText className="h-6 w-6 text-primary" /></div>
              {hasCompletedRopa && <Badge variant="default">Recommended</Badge>}
            </div>
            <h2 className="font-serif mb-2">From my RoPA</h2>
            <p className="text-sm text-muted-foreground mb-4 flex-1">
              Pre-populated from your existing data map. Fastest path if you've completed a RoPA.
            </p>
            <p className="text-xs text-muted-foreground mb-4">⏱ ~10 minutes</p>

            {hasCompletedRopa ? (
              <>
                {showRopaPicker && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-foreground mb-1 block">Which RoPA?</label>
                    <Select value={selectedRopaId ?? undefined} onValueChange={(v) => setSelectedRopaId(v)}>
                      <SelectTrigger><SelectValue placeholder="Select a RoPA session" /></SelectTrigger>
                      <SelectContent>
                        {completedRopas.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            v{r.version_number}{r.completed_at ? ` · ${format(new Date(r.completed_at), "MMM d, yyyy")}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={() => handleStart("ropa_powered")} disabled={creating !== null || loading || (showRopaPicker && !selectedRopaId)} className="w-full">
                  {creating === "ropa_powered" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Get started <ArrowRight className="ml-1.5 h-4 w-4" /></>}
                </Button>
              </>
            ) : (
              <div className="rounded-md bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">Complete your RoPA first to use this mode.</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/ropa")}>Build your RoPA <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary transition-colors">
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="rounded-lg bg-primary/10 p-3"><ClipboardList className="h-6 w-6 text-primary" /></div>
            </div>
            <h2 className="font-serif mb-2">Start fresh</h2>
            <p className="text-sm text-muted-foreground mb-4 flex-1">
              Answer a curated set of universal + framework-specific questions. No RoPA required.
            </p>
            <p className="text-xs text-muted-foreground mb-4">⏱ ~15–25 minutes</p>
            <Button onClick={() => handleStart("standalone")} disabled={creating !== null} variant="outline" className="w-full">
              {creating === "standalone" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Get started <ArrowRight className="ml-1.5 h-4 w-4" /></>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        ✓ 12 global frameworks · ✓ EU GDPR · UK GDPR · Swiss FADP · ✓ LGPD · APPI · DPDPA · POPIA · PIPEDA · AU Privacy · PIPA · PDPA · PDPL
      </div>
    </EUNoticeShell>
  );
}
