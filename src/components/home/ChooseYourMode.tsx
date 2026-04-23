import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const MODES = [
  {
    icon: "🔍",
    label: "Research a question",
    desc: "Search 150+ jurisdictions, laws, and enforcement cases",
    href: "/updates",
    cta: "Start searching",
  },
  {
    icon: "🌍",
    label: "Explore global privacy",
    desc: "Interactive map, jurisdiction profiles, topic hubs",
    href: "/jurisdictions",
    cta: "Open map",
  },
  {
    icon: "⚡",
    label: "Track enforcement",
    desc: "Live enforcement tracker, fines, regulatory trends",
    href: "/enforcement-tracker",
    cta: "View tracker",
  },
  {
    icon: "🧠",
    label: "Get Intelligence",
    desc: "Weekly brief written for your industry & jurisdictions — $29/month",
    href: "/subscribe",
    cta: "See Plans →",
    premium: true,
  },
];

export default function ChooseYourMode() {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const modes = MODES
    .filter((m) => !(m.premium && isPremium)) // hide upgrade tile for premium users
    .map((m) => ({
      ...m,
      href: m.premium && user ? "/dashboard" : m.href,
      cta: m.premium && user ? "My Dashboard" : m.cta,
    }));

  return (
    <div className="py-6">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate mb-3">
        How do you want to use this?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {modes.map((m) => (
          <Link
            key={m.label}
            to={m.href}
            className={`flex flex-col gap-1.5 p-4 rounded-xl border no-underline hover:shadow-eup-sm transition-all group ${
              m.premium
                ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                : "border-fog bg-paper hover:bg-fog"
            }`}
          >
            <span className="text-[20px]">{m.icon}</span>
            <span className="text-[14px] font-semibold text-navy">{m.label}</span>
            <span className="text-[12px] text-slate leading-snug">{m.desc}</span>
            <span
              className={`text-[12px] font-semibold mt-1 ${
                m.premium
                  ? "text-amber-700"
                  : "text-blue group-hover:text-navy"
              }`}
            >
              {m.cta} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
