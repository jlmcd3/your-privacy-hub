import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const tools = [
  {
    icon: "📅",
    title: "Compliance Calendar",
    description: "Regulatory deadlines with countdown timers. Know exactly when new laws take effect, enforcement begins, and comment periods close.",
    href: "/calendar",
  },
  {
    icon: "📜",
    title: "Legislation Tracker",
    description: "Track privacy bills globally from introduction through enactment. Filter by jurisdiction, topic, and bill stage.",
    href: "/legislation-tracker",
  },
  {
    icon: "📊",
    title: "US State Law Comparison",
    description: "Compare 20 enacted US state privacy laws across 12 key provisions side by side. The most comprehensive free comparison available.",
    href: "/compare/us-states",
  },
  {
    icon: "🌐",
    title: "Global Jurisdiction Map",
    description: "Interactive map of 160+ jurisdictions with law status, regulator info, and consumer rights. Click any country to explore.",
    href: "/jurisdictions",
  },
  {
    icon: "⚖️",
    title: "Enforcement Tracker",
    description: "Live enforcement database tracking fines and actions from 119+ regulatory authorities worldwide. Updated as actions are confirmed.",
    href: "/enforcement-tracker",
  },
  {
    icon: "⏱️",
    title: "Regulatory Timelines",
    description: "Visual milestone timelines for major regulatory frameworks — GDPR enforcement history, EU AI Act rollout, US state law progression.",
    href: "/timelines",
  },
];

export default function Tools() {
  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Privacy Professional's Toolkit | EndUserPrivacy</title>
        <meta name="description" content="Free structured tools for privacy professionals: Compliance Calendar, Legislation Tracker, US State Comparison, Global Map, Enforcement Tracker, and Timelines." />
      </Helmet>
      <Topbar />
      <Navbar />

      <section className="bg-gradient-to-br from-navy via-navy-light to-navy py-14 px-4">
        <div className="max-w-[860px] mx-auto text-center">
          <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1 mb-4">
            🧰 Professional Toolkit
          </span>
          <h1 className="font-display text-[28px] md:text-[40px] font-extrabold text-white leading-tight mb-3">
            The Privacy Professional's Toolkit
          </h1>
          <p className="text-blue-200 text-[15px] max-w-[520px] mx-auto">
            Structured tools built for practitioners. Everything free — no account required.
          </p>
        </div>
      </section>

      <div className="max-w-[960px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              to={tool.href}
              className="group bg-card border border-fog rounded-2xl p-6 no-underline hover:shadow-eup-md hover:-translate-y-0.5 transition-all"
            >
              <span className="text-3xl mb-3 block">{tool.icon}</span>
              <h2 className="font-display font-bold text-navy text-[17px] mb-2 group-hover:text-blue transition-colors">
                {tool.title}
              </h2>
              <p className="text-slate text-[13px] leading-relaxed mb-4">
                {tool.description}
              </p>
              <span className="text-blue text-[13px] font-semibold">
                Explore →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate text-[13px] mb-1">
            Enterprise data-guidance platforms charge quote-based annual rates for features you access here free.
          </p>
          <p className="text-slate-light text-[11px]">
            All tools are free with no account required. Premium ($20/month) adds a personalized weekly analyst brief.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
