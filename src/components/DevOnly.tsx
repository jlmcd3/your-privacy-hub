import type { ReactNode } from "react";
import { isDevHost } from "@/lib/env";

interface DevOnlyProps {
  children: ReactNode;
  /** Optional fallback to render on production. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Renders children only on dev/preview surfaces (localhost or `*.lovable.app`).
 * On the production custom domain, renders `fallback` (default: null).
 *
 * Use to wrap debug banners, admin scaffolding, scanner UIs, and any
 * test-only component that must never render for real end users.
 */
export function DevOnly({ children, fallback = null }: DevOnlyProps) {
  if (!isDevHost()) return <>{fallback}</>;
  return <>{children}</>;
}

export default DevOnly;
