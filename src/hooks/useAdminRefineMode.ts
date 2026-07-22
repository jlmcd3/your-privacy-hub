// useAdminRefineMode — admin variant of useRefineMode. Fetches through the
// admin-fetch-assessment edge proxy (service role, no ownership gate). Kept
// separate from the customer useRefineMode hook by design.
import { useEffect, useState } from "react";
import { adminFetchAssessment, type AdminAssessment } from "@/lib/adminRevisionApi";

export interface AdminRefineState {
  loading: boolean;
  error: string | null;
  row: AdminAssessment | null;
}

export function useAdminRefineMode(toolType: string, assessmentId: string | undefined): AdminRefineState & {
  reload: () => void;
} {
  const [row, setRow] = useState<AdminAssessment | null>(null);
  const [loading, setLoading] = useState<boolean>(!!assessmentId);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!assessmentId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      const res = await adminFetchAssessment({ toolType, assessmentId });
      if (!alive) return;
      if (res.kind === "ok") setRow(res.row);
      else setError(res.message);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [toolType, assessmentId, tick]);

  return { loading, error, row, reload: () => setTick((n) => n + 1) };
}
