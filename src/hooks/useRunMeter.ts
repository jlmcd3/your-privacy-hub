import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RunMeter {
  runsAllowed: number;
  runsUsed: number;
  runsRemaining: number;
  lockedFields: Record<string, unknown> | null;
  extensionCount: number;
}

export function useRunMeter(toolType: string, assessmentId: string | undefined) {
  const [meter, setMeter] = useState<RunMeter | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!assessmentId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("tool_run_meter")
        .select("runs_allowed, runs_used, locked_fields, extension_count")
        .eq("tool_type", toolType)
        .eq("assessment_id", assessmentId)
        .maybeSingle();
      if (data)
        setMeter({
          runsAllowed: data.runs_allowed,
          runsUsed: data.runs_used,
          runsRemaining: data.runs_allowed - data.runs_used,
          lockedFields: data.locked_fields,
          extensionCount: data.extension_count,
        });
      setLoading(false);
    })();
  }, [toolType, assessmentId]);
  return { meter, loading };
}
