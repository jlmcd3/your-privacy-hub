import { Link } from "react-router-dom";
import { BarChart3, Calendar, ScrollText } from 'lucide-react';

const tools = [
  {
    icon: "",
    title: "Compliance Calendar",
    sub: "Countdown timers for every regulatory deadline",
    href: "/calendar",
  },
  {
    icon: "",
    title: "Legislation Tracker",
    sub: "Bills tracked globally across jurisdictions",
    href: "/legislation-tracker",
  },
  {
    icon: "",
    title: "State Law Comparison",
    sub: "Compare 20 enacted US laws side by side",
    href: "/compare/us-states",
  },
];

export default function ToolkitSection() {
  return (
    <section className="py-12 px-4 md:px-8 bg-brand-cloud">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display text-brand-navy mb-2">
            Intelligence Toolkit
          </h2>
          <p className="text-slate text-sm">
            Structured tools for planning and compliance. Always free.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tools.map((t) => (
            <Link
              key={t.href}
              to={t.href}
              className="group bg-card border border-brand-cloud rounded-2xl p-6 no-underline hover:shadow-eup-md hover:-translate-y-0.5 transition-all text-center"
            >
              <span className="text-3xl block mb-3">{t.icon}</span>
              <h3 className="text-brand-navy text-[15px] mb-1 group-hover:text-brand-teal-text transition-colors">
                {t.title}
              </h3>
              <p className="text-slate text-meta leading-relaxed mb-3">{t.sub}</p>
              <span className="text-brand-teal-text text-meta font-semibold">Explore →</span>
            </Link>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link
            to="/tools"
            className="text-brand-teal-text text-sm font-semibold hover:text-brand-navy transition-colors no-underline"
          >
            See all tools →
          </Link>
        </div>
      </div>
    </section>
  );
}
