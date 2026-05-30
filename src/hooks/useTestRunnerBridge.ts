// Bridge that lets a TestXxx page report results to a parent orchestrator
// (the /admin/tests-output page) when loaded inside an iframe with ?embed=runner.
// In normal standalone use this hook is a no-op.

import { useEffect, useRef } from "react";

type BridgePayload = {
  testId: string;
  status: "running" | "complete" | "failed";
  result?: unknown;
  assertions?: Array<{ label: string; passed: boolean | null }>;
  log?: string[];
  elapsedMs?: number;
  resultUrl?: string | null;
};

export function isEmbedRunner(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("embed") === "runner";
}

/**
 * Posts test-runner updates to the parent window. Caller is responsible for
 * passing fresh values on every render — the hook posts whenever they change.
 */
export function useTestRunnerBridge(payload: BridgePayload) {
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    if (!isEmbedRunner()) return;
    if (typeof window === "undefined" || window.parent === window) return;

    // Only post when the meaningful shape changes (status, assertion summary,
    // or log length). Avoids spamming the parent with identical messages.
    const sig = JSON.stringify({
      s: payload.status,
      a: (payload.assertions || []).map((x) => x.passed),
      l: payload.log?.length || 0,
      r: !!payload.result,
    });
    if (sig === lastSentRef.current) return;
    lastSentRef.current = sig;

    window.parent.postMessage(
      {
        source: "lovable-test-runner",
        version: 1,
        ...payload,
      },
      "*",
    );
  }, [payload]);
}
