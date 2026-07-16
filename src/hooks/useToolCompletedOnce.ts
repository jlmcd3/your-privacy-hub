// PRIV-4 — fires `tool_completed` exactly once per mount when the caller
// transitions into a loaded-complete view. Reuses the PP-1
// useConversionEvent pathway (track-geo) — no new hook, no new endpoint.
//
// Contract: call from a result page with the tool slug (matching the
// PP-1 tool_start_click slug space) and a boolean that becomes true when
// row.status === "complete" AND the row's report body is present. Once
// true, the event fires; subsequent renders/poll settles are ignored.
import { useEffect, useRef } from "react";
import { useConversionEvent } from "@/hooks/useConversionEvent";

export function useToolCompletedOnce(toolSlug: string, isComplete: boolean) {
  const fire = useConversionEvent();
  const firedRef = useRef(false);
  useEffect(() => {
    if (!isComplete || firedRef.current) return;
    firedRef.current = true;
    fire("tool_completed", {
      tool_slug: toolSlug,
      page_path: typeof window !== "undefined" ? window.location.pathname : "",
    });
  }, [isComplete, toolSlug, fire]);
}
