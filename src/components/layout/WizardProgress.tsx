import { Check } from "lucide-react";

interface WizardProgressProps {
  steps: string[];
  /** 0-indexed current step */
  currentStep: number;
  className?: string;
}

export default function WizardProgress({ steps, currentStep, className = "" }: WizardProgressProps) {
  return (
    <nav aria-label="Wizard progress" className={`flex items-center flex-wrap gap-1 mb-4 ${className}`}>
      {steps.map((label, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        return (
          <div key={label} className="flex items-center gap-1">
            {isActive ? (
              <span className="bg-navy text-white text-xs font-semibold px-3 py-1 rounded-full">
                {label}
              </span>
            ) : isDone ? (
              <span className="bg-fog text-steel text-xs px-3 py-1 rounded-full inline-flex items-center gap-1">
                <Check className="w-3 h-3" />
                {label}
              </span>
            ) : (
              <span className="text-slate-light text-xs px-3 py-1">{label}</span>
            )}
            {i < steps.length - 1 && (
              <span className="text-slate-light text-xs px-1" aria-hidden="true">›</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
