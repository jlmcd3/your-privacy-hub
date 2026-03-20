import { Link } from "react-router-dom";

const tools = [
  {
    icon: "📅",
    title: "Compliance Calendar",
    sub: "Countdown timers for every regulatory deadline",
    href: "/calendar",
  },
  {
    icon: "📜",
    title: "Legislation Tracker",
    sub: "Bills tracked globally across jurisdictions",
    href: "/legislation-tracker",
  },
  {
    icon: "📊",
    title: "State Law Comparison",
    sub: "Compare 20 enacted US laws side by side",
    href: "/compare/us-states",
  },
];

export default function ToolkitSection() {
  return (
    <section className="py-12 px-4 md:px-8 bg-paper">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-navy text-[20px] mb-2">
            Professional Toolkit
          </h2>
          <p className="text-slate text-[13px]">
            Structured tools for planning and compliance. Always free.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tools.map((t) => (
            <Link
              key={t.href}
              to={t.href}
              className="group bg-card border border-fog rounded-2xl p-6 no-underline hover:shadow-eup-md hover:-translate-y-0.5 transition-all text-center"
            >
              <span className="text-3xl block mb-3">{t.icon}</span>
              <h3 className="font-display font-bold text-navy text-[15px] mb-1 group-hover:text-blue transition-colors">
                {t.title}
              </h3>
              <p className="text-slate text-[12px] leading-relaxed mb-3">{t.sub}</p>
              <span className="text-blue text-[12px] font-semibold">Explore →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
