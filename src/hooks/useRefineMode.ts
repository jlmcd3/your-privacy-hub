import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRunMeter } from "./useRunMeter";
import { deriveResolveFields, type ResolveFieldMap } from "@/lib/rerunHighlighting";

// Maps a tool_type to the result table where its intake lives.
export const TABLE_MAP: Record<string, string> = {
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

// Per-tool client-side read map. Mirrors HAS_INTAKE_DATA and EDITABLE_COLUMNS
// in supabase/functions/regenerate-assessment/index.ts. Empty array = read the
// intake_data JSON blob; non-empty = the tool has no intake_data column and
// its "intake" is assembled from dedicated columns (li_assessment only, today).
export const INTAKE_READ_MAP: Record<string, string[]> = {
  li_assessment: [
    "organization_name", "subject_anchor", "processing_description",
    "data_categories", "relationship_type", "jurisdictions",
    "sector", "stated_purpose", "alternatives_considered",
    "purpose_details", "necessity_details", "balancing_details",
  ],
  governance_assessment: [],
  dpia_framework: [],
  dpa_generator: [],
  ir_playbook: [],
  biometric_checker: [],
  cppa_admt: [],
  cppa_risk_assessment: [],
  cppa_cybersecurity: [],
};

export interface InfoNeededEntry {
  field: string;
  dimensions?: string;
  provision?: string;
  enables?: string;
  [k: string]: unknown;
}

export interface RefineMode {
  isRefine: boolean;
  assessmentId: string | undefined;
  intake: Record<string, unknown> | null;
  lockedFields: Record<string, unknown> | null;
  runsRemaining: number;
  runsAllowed: number;
  runsUsed: number;
  loading: boolean;
  infoNeeded: InfoNeededEntry[];
  infoNeededKeys: string[];
  // Doc Q: fields referenced by inconsistency_flags[].source_fields or
  // information_needed[].field on the prior report. Strengthen items are
  // NEVER included (P3/D5 binding). Consumers must additionally gate
  // rendering on IMPROVEMENT_KIT_ENABLED && isPro.
  resolveFields: ResolveFieldMap;
}

export function useRefineMode(toolType: string): RefineMode {
  const [params] = useSearchParams();
  const assessmentId = params.get("refine") || undefined;
  const [intake, setIntake] = useState<Record<string, unknown> | null>(null);
  const [infoNeeded, setInfoNeeded] = useState<InfoNeededEntry[]>([]);
  const [resolveFields, setResolveFields] = useState<ResolveFieldMap>({ fields: {}, fieldOrder: [], count: 0 });
  const [loading, setLoading] = useState(!!assessmentId);
  const { meter } = useRunMeter(toolType, assessmentId);

  useEffect(() => {
    if (!assessmentId) return;
    const table = TABLE_MAP[toolType];
    if (!table) {
      setLoading(false);
      return;
    }
    const cols = INTAKE_READ_MAP[toolType] ?? [];
    // Always fetch report_data too so we can extract information_needed.
    const selectExpr = (cols.length ? cols.join(",") : "intake_data") + ",report_data";
    (async () => {
      const { data } = await (supabase as any)
        .from(table)
        .select(selectExpr)
        .eq("id", assessmentId)
        .maybeSingle();
      if (!data) {
        setIntake(null);
      } else if (cols.length) {
        // Assemble a virtual intake object from dedicated columns.
        const assembled: Record<string, unknown> = {};
        for (const k of cols) if (k in data) assembled[k] = (data as any)[k];
        setIntake(assembled);
      } else {
        setIntake(((data as any).intake_data as Record<string, unknown>) ?? null);
      }
      const rd = (data as any)?.report_data;
      const arr = Array.isArray(rd?.information_needed) ? rd.information_needed : [];
      setInfoNeeded(arr as InfoNeededEntry[]);
      // Doc Q: derive RESOLVE-field map from the prior report_data.
      // strengthen_items is intentionally never inspected here.
      setResolveFields(deriveResolveFields(rd));
      setLoading(false);
    })();
  }, [assessmentId, toolType]);

  return {
    isRefine: !!assessmentId,
    assessmentId,
    intake,
    lockedFields: meter?.lockedFields ?? null,
    runsRemaining: meter?.runsRemaining ?? 0,
    runsAllowed: meter?.runsAllowed ?? 0,
    runsUsed: meter?.runsUsed ?? 0,
    loading,
    infoNeeded,
    infoNeededKeys: infoNeeded.map((e) => (e as any).field).filter(Boolean),
    resolveFields,
  };
}
