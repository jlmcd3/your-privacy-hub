import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRunMeter } from "./useRunMeter";

// Maps a tool_type to the result table where its intake_data lives.
const TABLE_MAP: Record<string, string> = {
  li_assessment: "li_assessments",
  governance_assessment: "governance_assessments",
  dpia_framework: "dpia_frameworks",
  dpa_generator: "dpa_documents",
  ir_playbook: "ir_playbooks",
  biometric_checker: "biometric_assessments",
  cppa_admt: "cppa_assessments",
  cppa_risk_assessment: "cppa_assessments",
  cppa_cybersecurity: "cppa_assessments",
};

export interface RefineMode {
  isRefine: boolean;
  assessmentId: string | undefined;
  intake: Record<string, unknown> | null;
  lockedFields: Record<string, unknown> | null;
  runsRemaining: number;
  loading: boolean;
}

export function useRefineMode(toolType: string): RefineMode {
  const [params] = useSearchParams();
  const assessmentId = params.get("refine") || undefined;
  const [intake, setIntake] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(!!assessmentId);
  const { meter } = useRunMeter(toolType, assessmentId);

  useEffect(() => {
    if (!assessmentId) return;
    const table = TABLE_MAP[toolType];
    if (!table) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from(table)
        .select("intake_data")
        .eq("id", assessmentId)
        .maybeSingle();
      setIntake((data?.intake_data as Record<string, unknown>) ?? null);
      setLoading(false);
    })();
  }, [assessmentId, toolType]);

  return {
    isRefine: !!assessmentId,
    assessmentId,
    intake,
    lockedFields: meter?.lockedFields ?? null,
    runsRemaining: meter?.runsRemaining ?? 0,
    loading,
  };
}
