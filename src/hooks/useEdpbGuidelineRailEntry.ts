// src/hooks/useEdpbGuidelineRailEntry.ts
// WP248-PINNING (2026-08-01) — narrow sibling of useGdprRailEntry.
//
// Why a sibling hook and not an extension of useGdprRailEntry: that hook's
// contract is article/recital-shaped (`article`, `jurisdiction`, `recital`) and
// is consumed by three intake pages (DPIA, Governance, LIA). EDPB guidance rows
// have no article number and no jurisdiction axis — they are keyed by
// `guideline_ref` and matched by verbatim excerpt. Widening the GDPR hook would
// change a shared contract for two fields; a sibling keeps the blast radius at
// the two DPIA fields this task touches.
//
// Scope: DPIA intake only, for "0.5.reasons" (high_risk_criteria_edpb_wp248)
// and "4.1.c" (risk_severity_edpb_wp248). Not a general EDPB-everywhere rail.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EdpbGuidelineRailOpts {
  /** e.g. "WP248 rev.01" */
  guidelineRef: string;
  /** The registry verbatim_quote — used to select the containing corpus row. */
  verbatimQuote: string;
}

export interface EdpbGuidelineRailState {
  /** Verbatim corpus text for the "Regulation text (verbatim)" block, or null. */
  regulationText: string | null;
  loading: boolean;
}

export function useEdpbGuidelineRailEntry(
  opts: EdpbGuidelineRailOpts | null
): EdpbGuidelineRailState {
  const [regulationText, setRegulationText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opts) { setRegulationText(null); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("edpb_guidelines")
          .select("guideline_ref, section_ref, body_text, status")
          .eq("guideline_ref", opts.guidelineRef)
          .eq("status", "final")
          .limit(200);

        if (cancelled) return;

        const row = (data ?? []).find(
          (r: any) => typeof r?.body_text === "string" && r.body_text.includes(opts.verbatimQuote)
        );

        // Fall back to the pinned registry quote itself — it is verbatim by
        // construction, so the rail never shows a paraphrase.
        setRegulationText(row?.body_text ?? opts.verbatimQuote);
      } catch {
        if (!cancelled) setRegulationText(opts.verbatimQuote);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [opts?.guidelineRef, opts?.verbatimQuote]);

  return { regulationText, loading };
}
