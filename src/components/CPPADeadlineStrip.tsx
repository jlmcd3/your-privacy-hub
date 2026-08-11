import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

// Module-level flag persists for the lifetime of the JS module (i.e. until
// full page reload) — per spec, no localStorage / sessionStorage.
let dismissedThisSession = false;

// Single current priority — the nearest CPPA deadline on the clock.
const CURRENT_PRIORITY = {
  label: "ADMT disclosures",
  date: "Jan 1, 2027",
};

export default function CPPADeadlineStrip() {
  const [dismissed, setDismissed] = useState(dismissedThisSession);
  if (dismissed) return null;

  return (
    <div className="bg-brand-navy text-white border-b border-white/10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <p className="font-semibold">
          Next CPPA deadline: {CURRENT_PRIORITY.label} —{" "}
          <span className="text-brand-teal-on-navy">{CURRENT_PRIORITY.date}</span>
        </p>
        <div className="flex items-center gap-3 ml-auto">
          <Link
            to="/cppa-scope-checker"
            className="inline-flex items-center rounded-md bg-brand-teal-deep px-4 py-1.5 font-semibold text-white no-underline transition-opacity hover:opacity-90"
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
