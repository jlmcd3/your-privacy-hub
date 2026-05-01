interface BreadcrumbStep {
  label: string;
  route?: string;
}

interface RopaBreadcrumbProps {
  steps: BreadcrumbStep[];
  currentIndex: number;
}

export function RopaBreadcrumb({ steps, currentIndex }: RopaBreadcrumbProps) {
  return (
    <>
      {/* Desktop: horizontal steps with chevrons */}
      <nav
        className="hidden md:flex items-center gap-2 text-xs mb-6"
        aria-label="Progress"
      >
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">›</span>}
            {step.route && i < currentIndex ? (
              <a
                href={step.route}
                className="text-primary underline hover:text-foreground"
              >
                {step.label}
              </a>
            ) : (
              <span
                className={
                  i === currentIndex
                    ? "font-bold text-foreground"
                    : "text-muted-foreground"
                }
                aria-current={i === currentIndex ? "step" : undefined}
              >
                {step.label}
              </span>
            )}
          </div>
        ))}
      </nav>
      {/* Mobile: step text */}
      <p className="md:hidden text-xs text-muted-foreground mb-4">
        Step {currentIndex + 1} of {steps.length} — {steps[currentIndex]?.label}
      </p>
    </>
  );
}
