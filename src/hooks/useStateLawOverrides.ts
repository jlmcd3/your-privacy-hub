import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StateLawOverride = {
  state_slug: string;
  state_name: string;
  statute_status: string;
  statute_name: string | null;
  effective_date: string | null;
  authority_name: string | null;
  statute_url: string | null;
};

/**
 * Loads admin-confirmed overrides for US state privacy law data.
 * Returns a Map keyed by state slug. Overrides reflect newly-enacted laws
 * confirmed via /admin/law-updates and apply to both the US Privacy Laws
 * cards and the per-jurisdiction page.
 */
export function useStateLawOverrides() {
  const [overrides, setOverrides] = useState<Map<string, StateLawOverride>>(new Map());
  useEffect(() => {
    (supabase as any)
      .from("state_law_overrides")
      .select("*")
      .then(({ data }: any) => {
        if (Array.isArray(data)) {
          setOverrides(new Map(data.map((o: StateLawOverride) => [o.state_slug, o])));
        }
      });
  }, []);
  return overrides;
}

export function applyOverride<T extends Record<string, any>>(
  state: T,
  overrides: Map<string, StateLawOverride>,
): T {
  const slug = state.slug || (state.state ? state.state.toLowerCase().replace(/\s+/g, "-") : null);
  if (!slug) return state;
  const ov = overrides.get(slug);
  if (!ov) return state;
  return {
    ...state,
    statute_status: ov.statute_status || state.statute_status,
    statute_name: ov.statute_name ?? state.statute_name,
    effective_date: ov.effective_date ?? state.effective_date,
    authority_name: ov.authority_name ?? state.authority_name,
    statute_url: ov.statute_url ?? state.statute_url,
  };
}
