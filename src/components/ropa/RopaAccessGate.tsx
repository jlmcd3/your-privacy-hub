import { Link, useLocation } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import type { ReactNode } from "react";

interface RopaAccessGateProps {
  children: ReactNode;
}

/**
 * Gates all /ropa/* pages. RoPA Builder requires an active subscription.
 * v12 (2026-08-11): access is no longer free-for-all inside the gate —
 * annual plans get the first build plus one update a year at no charge,
 * everything else is $49 per generation ($39 annual-additional), priced
 * server-side in create-tool-checkout (v13 launch repricing).
 * Free / unauthenticated users still see the upgrade wall.
 */
export function RopaAccessGate({ children }: RopaAccessGateProps) {
  const { user, isPremium, isLoading } = useSubscriptionTier();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  const isSignedIn = !!user;

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="border border-border rounded-2xl bg-brand-cloud p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-navy/10 text-brand-navy mb-4">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="font-serif text-brand-navy mb-3">
          RoPA Builder requires a subscription
        </h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          The Record of Processing Activities builder is available to
          Intelligence and Professional subscribers. On annual plans the first
          build is free and each subscription year includes one free update;
          additional updates are $39. On monthly plans every build or update is
          $49. It is not sold as a standalone product.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="bg-brand-navy text-white hover:bg-brand-navy/90">
            <Link to="/get-intelligence">View subscription plans</Link>
          </Button>
          {!isSignedIn && (
            <Button asChild size="lg" variant="outline">
              <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>Sign in</Link>
            </Button>
          )}
        </div>
        <p className="text-meta text-muted-foreground mt-6">
          Already subscribed?{" "}
          <Link to="/account" className="underline">
            Check your account
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
