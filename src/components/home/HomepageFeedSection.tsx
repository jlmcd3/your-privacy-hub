import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { HomepageFeedPanel } from "./HomepageFeedPanel";
import SectionShell from "./SectionShell";

export default function HomepageFeedSection() {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();

  return (
    <SectionShell
      eyebrow="Privacy Intelligence Feed"
      headline="Daily developments, with analysis beside the story"
      subline="Live regulatory monitoring paired with the intelligence layer that explains what matters."
      ctaLabel="Open feed →"
      ctaHref="/updates"
    >
      <HomepageFeedPanel isPremium={isPremium} isAuthenticated={!!user} embedded />
    </SectionShell>
  );
}