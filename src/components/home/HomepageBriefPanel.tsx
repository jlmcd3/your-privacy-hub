import BriefBuilder from "@/components/subscribe/BriefBuilder";

const LANGUAGES = [
  "English", "French", "German", "Spanish", "Italian", "Dutch", "Polish",
  "Portuguese", "Japanese", "Korean", "Chinese", "Arabic", "Turkish",
  "Danish", "Norwegian", "Finnish", "Czech", "Romanian", "Greek", "Thai",
  "Indonesian", "Hindi", "Hebrew", "Swedish",
];

export default function HomepageBriefPanel() {
  return (
    <aside className="bg-white border border-fog rounded-2xl shadow-eup-sm p-5 md:p-6 h-full flex flex-col">
      <p className="text-eyebrow text-[hsl(var(--accent))] mb-2">Privacy Intelligence Report</p>
      <h3 className="font-display text-[22px] text-navy leading-tight mb-1">
        Your briefing, built for your practice.
      </h3>
      <p className="text-[13px] text-slate leading-relaxed mb-4">
        Personalised to your jurisdiction, role, and tracked topics. Every Monday.
      </p>
      <div className="flex-1">
        <BriefBuilder />
      </div>
      <div className="mt-5 pt-4 border-t border-fog">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate mb-2">
          Available in 24 languages
        </p>
        <div className="flex flex-wrap gap-1">
          {LANGUAGES.map((l) => (
            <span
              key={l}
              className="text-[11px] text-slate bg-fog/60 px-2 py-0.5 rounded"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
