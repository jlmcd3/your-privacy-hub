interface PlaybookStep {
  number: number;
  heading: string;
  description: string;
}

interface PlaybookProps {
  steps: PlaybookStep[];
  accentColor?: "navy" | "sky" | "teal";
}

export function Playbook({ steps, accentColor = "navy" }: PlaybookProps) {
  const circleColor = {
    navy: "bg-navy text-white",
    sky: "bg-sky-600 text-white",
    teal: "bg-teal-600 text-white",
  }[accentColor];

  return (
    <div className="my-6 space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4 pb-6 relative">
          {i < steps.length - 1 && (
            <div className="absolute left-[18px] top-9 bottom-0 w-px bg-fog" />
          )}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${circleColor} relative z-10`}>
            {step.number}
          </div>
          <div className="flex-1 pt-1">
            <p className="text-[14px] font-semibold text-navy mb-1">{step.heading}</p>
            <p className="text-[13px] text-slate leading-relaxed">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
