// Fetches agency_position_summary from cppa_fsor_commentary for specific regulation citations.
// Pre-fetched on page load and cached in component state.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FscrCalloutMap = Record<string, string>;

export function useFscrCallouts(citations: string[]): FscrCalloutMap {
  const [callouts, setCallouts] = useState<FscrCalloutMap>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("cppa_fsor_callouts")
          .select("regulation_citation, agency_position_summary")
          .in("regulation_citation", citations)
          .limit(citations.length * 3);

        if (error) {
          console.warn("[useFscrCallouts] query failed:", error.message);
          return;
        }
        if (cancelled || !data) return;

        const map: FscrCalloutMap = {};
        for (const row of data) {
          const cite = row.regulation_citation as string;
          if (!map[cite] && row.agency_position_summary) {
            map[cite] = row.agency_position_summary as string;
          }
        }
        setCallouts(map);
      } catch (e) {
        console.warn("[useFscrCallouts] unexpected error:", (e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return callouts;
}
