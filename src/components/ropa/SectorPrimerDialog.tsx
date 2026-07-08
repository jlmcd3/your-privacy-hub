import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Scale, AlertTriangle, Compass, Clock, Sparkles } from "lucide-react";
import { getSectorPrimer } from "@/config/sectorPrimers";

interface Props {
  open: boolean;
  sector: string;
  onDismiss: () => void;
  onUseSampleActivity?: (sample: { label: string; description: string }) => void;
}

/**
 * Sector primer — appears once per RoPA session immediately after sector
 * selection, before the first activity is added. Five approved fields:
 * rule preview, watch-outs, scope guardrail, effort estimate, sample
 * activity CTA. Dismissed via "Start first activity" and never reshown for
 * the session.
 */
export default function SectorPrimerDialog({
  open,
  sector,
  onDismiss,
  onUseSampleActivity,
}: Props) {
  const primer = getSectorPrimer(sector);
  const sectorLabel = sector || "your sector";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Before you start: {sectorLabel} primer
          </DialogTitle>
          <DialogDescription>
            A 60-second orientation so you know what to expect from your RoPA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <PrimerSection
            icon={<Scale className="w-4 h-4" />}
            title="Rules most likely to apply"
          >
            <ul className="space-y-1.5 text-sm">
              {primer.rulePreview.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-brand-teal-text mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </PrimerSection>

          <PrimerSection
            icon={<AlertTriangle className="w-4 h-4" />}
            title={`${sectorLabel} watch-outs`}
          >
            <ul className="space-y-1.5 text-sm">
              {primer.watchOuts.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </PrimerSection>

          <PrimerSection
            icon={<Compass className="w-4 h-4" />}
            title="Keep it in scope"
          >
            <p className="text-sm">{primer.scopeGuardrail}</p>
          </PrimerSection>

          <PrimerSection
            icon={<Clock className="w-4 h-4" />}
            title="Effort estimate"
          >
            <p className="text-sm">{primer.effortEstimate}</p>
          </PrimerSection>

          <PrimerSection
            icon={<Sparkles className="w-4 h-4" />}
            title="Suggested first activity"
          >
            <div className="border border-border rounded-lg p-3 bg-muted/30">
              <p className="text-sm font-semibold">{primer.sampleActivity.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {primer.sampleActivity.description}
              </p>
              {onUseSampleActivity && (
                <button
                  type="button"
                  onClick={() => onUseSampleActivity(primer.sampleActivity)}
                  className="mt-2 text-xs font-semibold text-brand-teal-text hover:underline"
                >
                  Use this as my first activity →
                </button>
              )}
            </div>
          </PrimerSection>
        </div>

        <DialogFooter className="mt-4">
          <button
            type="button"
            onClick={onDismiss}
            className="bg-primary text-primary-foreground font-semibold text-sm px-4 py-2 rounded-lg"
          >
            Start first activity
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrimerSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5 text-brand-navy dark:text-white">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="pl-6 text-foreground">{children}</div>
    </div>
  );
}
