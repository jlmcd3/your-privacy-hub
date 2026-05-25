// Temporary preview page to compare the current logo vs the proposed new logo.
// Visit /logo-preview to review. Safe to delete once a decision is made.

export default function LogoPreview() {
  const Row = ({ label, src, bg }: { label: string; src: string; bg: string }) => (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-muted text-xs text-muted-foreground">{label}</div>
      <div className={`${bg} p-8 flex items-center justify-center`}>
        <img src={src} alt="" style={{ height: 48 }} />
      </div>
      <div className={`${bg} p-8 flex items-center justify-center border-t border-white/10`}>
        <img src={src} alt="" style={{ height: 28 }} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-serif mb-2">Logo preview</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Comparing the current production logo (left) with the proposed new lockup (right),
          shown on white and brand-navy backgrounds at 48px and 28px heights.
        </p>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-6">
            <h2 className="text-base font-semibold">Current</h2>
            <Row label="On white" src="/brand/logo-light.svg" bg="bg-white" />
            <Row label="On navy" src="/brand/logo-dark.svg" bg="bg-brand-navy" />
          </div>
          <div className="space-y-6">
            <h2 className="text-base font-semibold">Proposed</h2>
            <Row label="On white" src="/brand/logo-light-v2.svg" bg="bg-white" />
            <Row label="On navy (light variant inverted bg)" src="/brand/logo-light-v2.svg" bg="bg-brand-navy" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          Note: the proposed lockup is currently a single "light" variant (navy ink on white).
          If approved, a dark/reversed variant for navy backgrounds should be produced before rollout.
        </p>
      </div>
    </div>
  );
}
