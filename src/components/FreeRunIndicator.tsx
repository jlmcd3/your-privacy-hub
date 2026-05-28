import { useEffect, useState } from "react";
import { getFreeRunPoolStatus } from "@/lib/freeConvenienceRun";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { isConvenienceTool } from "@/config/pricing";

interface Props {
  /** Tool key (snake_case or camelCase). Indicator only renders for Convenience Tools. */
  toolKey: string;
}

/**
 * Small pool indicator shown on Convenience Tool intake pages.
 * Renders only for logged-in subscribers whose tier has a non-zero free-run pool
 * AND when the tool itself is a Convenience Tool.
 */
export default function FreeRunIndicator({ toolKey }: Props) {
  const { user, granularTier, isLoading } = useSubscriptionTier();
  const [status, setStatus] = useState<{ used: number; total: number; resetDate: string | null } | null>(null);

  useEffect(() => {
    if (isLoading || !user || !granularTier) return;
    if (!isConvenienceTool(toolKey)) return;
    let cancelled = false;
    getFreeRunPoolStatus(user.id, granularTier).then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => { cancelled = true; };
  }, [user, granularTier, isLoading, toolKey]);

  if (!status || status.total === 0) return null;
  const remaining = status.total - status.used;

  return (
    <p className="text-sm font-medium text-brand-teal">
      {remaining > 0
        ? `✓ ${remaining} free run${remaining !== 1 ? "s" : ""} remaining this month (resets ${status.resetDate})`
        : `Free runs used for this month — resets ${status.resetDate}`}
    </p>
  );
}
