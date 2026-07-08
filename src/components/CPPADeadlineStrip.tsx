import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

// Module-level flag persists for the lifetime of the JS module (i.e. until
// full page reload) — per spec, no localStorage / sessionStorage.
let dismissedThisSession = false;

const DATES = [
  { label: "ADMT disclosures", date: "Jan 1, 2027" },
  { label: "Risk-assessment lookback", date: "Dec 31, 2027" },
  { label: "First audit certifications", date: "Apr 1, 2028" },
];

export default function CPPADeadlineStrip() {
  const [dismissed, setDismissed] = useState(dismissedThisSession);
  if (dismissed) return null;

  return (
    <div className="bg-brand-navy text-white border-b border-white/10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
        <p className="font-semibold whitespace-nowrap">
          CPPA's Audits Division is active.
        </p>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 flex-1 min-w-0">
          {DATES.map((d) => (
            <li
              key={d.date}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-xs whitespace-nowrap"
            >
              <span className="text-white/80">{d.label}</span>
              <span className="font-semibold text-white">— {d.date}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 md:ml-auto">
          <Link
            to="/cppa-scope-checker"
            className="text-brand-teal-on-navy hover:text-white font-semibold whitespace-nowrap no-underline"
          >
            Check your scope free →
          </Link>
          <button
            type="button"
            aria-label="Dismiss CPPA deadline strip"
            onClick={() => {
              dismissedThisSession = true;
              setDismissed(true);
            }}
            className="text-white/60 hover:text-white bg-transparent border-none cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
