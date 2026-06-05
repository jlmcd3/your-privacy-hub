import { Navigate, useLocation } from "react-router-dom";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import ProtectedRoute from "@/components/ProtectedRoute";

/**
 * Subscriber-only route gate. Wraps ProtectedRoute (which handles auth +
 * onboarding) and additionally requires an active Intelligence or
 * Professional subscription (monthly or annual). Non-subscribers are
 * redirected to /subscribe with a contextual message.
 *
 * Used for tools that are bundled with subscriptions and never sold
 * standalone (RoPA Builder, US Privacy Notice Builder, EU/Global Privacy
 * Notice Builder).
 */
export default function SubscriberRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <SubscriberGuard>{children}</SubscriberGuard>
    </ProtectedRoute>
  );
}

function SubscriberGuard({ children }: { children: React.ReactNode }) {
  const { isPremium, isLoading } = useSubscriptionTier();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-cloud flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-teal/30 border-t-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!isPremium) {
    const message =
      "This tool is included with an Intelligence or Professional subscription.";
    return (
      <Navigate
        to={`/subscribe?from=${encodeURIComponent(location.pathname)}&msg=${encodeURIComponent(message)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
