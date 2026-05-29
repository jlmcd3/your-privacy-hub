import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { HomepageFeedPanel } from "./HomepageFeedPanel";
import SectionShell from "./SectionShell";

export default function HomepageFeedSection() {
  const { user } = useAuth();
  const { isPremium } = useSubscriptionTier();

  return (
    <SectionShell
      eyebrow="Privacy Intelligence Feed"
      headline="Daily developments, with analysis beneath the story"
      subline="Live regulatory monitoring paired with the intelligence layer that explains what matters."
      ctaLabel="Open feed →"
      ctaHref="/updates"
    >
      <HomepageFeedPanel isPremium={isPremium} isAuthenticated={!!user} embedded />
    </SectionShell>
  );
}