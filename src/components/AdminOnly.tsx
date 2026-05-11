import type { ReactNode } from "react";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface AdminOnlyProps {
  children: ReactNode;
  /** Rendered while the role check is in flight. */
  loadingFallback?: ReactNode;
  /** Rendered for non-admin users (default: null → typically a 404). */
  fallback?: ReactNode;
}

/**
 * Renders children only for users with the `admin` or `moderator` role
 * in `public.user_roles`. Works on production — unlike DevOnly, which is
 * gated on hostname and 404s real users on the custom domain.
 */
export function AdminOnly({ children, loadingFallback = null, fallback = null }: AdminOnlyProps) {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) return <>{loadingFallback}</>;
  if (!isAdmin) return <>{fallback}</>;
  return <>{children}</>;
}

export default AdminOnly;
