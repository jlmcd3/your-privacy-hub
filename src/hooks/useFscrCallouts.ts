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
        const { data } = await (supabase as any)
          .from("cppa_fsor_commentary")
          .select("regulation_citation, agency_position_summary")
          .in("regulation_citation", citations)
          .not("agency_position_summary", "is", null)
          .limit(citations.length * 3);

        if (cancelled || !data) return;

        const map: FscrCalloutMap = {};
        for (const row of data) {
          const cite = row.regulation_citation as string;
          if (!map[cite] && row.agency_position_summary) {
            map[cite] = row.agency_position_summary as string;
          }
        }
        setCallouts(map);
      } catch {
        // Silent — callouts are enhancement only
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return callouts;
}
