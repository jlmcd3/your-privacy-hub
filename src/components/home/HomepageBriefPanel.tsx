import BriefBuilder from "@/components/subscribe/BriefBuilder";

export default function HomepageBriefPanel() {
  return (
    <div className="p-4 bg-slate-50/60">
      <div className="mb-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
          Privacy Intelligence Report
        </p>
        <p className="font-display font-bold text-[13px] text-navy leading-snug">
          Your briefing, built for your practice.
        </p>
        <p className="text-[10px] text-slate mt-0.5">
          Personalised to your jurisdiction, role, and tracked topics. Every Monday.
        </p>
      </div>

      <BriefBuilder />

      <div className="mt-3 pt-3 border-t border-slate-200">
        <p className="text-[8px] font-bold uppercase tracking-widest text-slate mb-2">
          Available in 24 languages
        </p>
        <div className="flex flex-wrap gap-1">
          {["English","French","German","Spanish","Italian","Dutch","Polish","Portuguese","Japanese","Korean","Chinese","Arabic","Turkish","Danish","Norwegian","Finnish","Czech","Romanian","Greek","Thai","Indonesian","Hindi","Hebrew","Swedish"].map(l => (
            <span
              key={l}
              className="text-[7px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
