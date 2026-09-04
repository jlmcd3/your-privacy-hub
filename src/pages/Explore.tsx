import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Building2,
  CalendarDays,
  Compass,
  Globe2,
  Scale,
  TableProperties,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShotFrame from "@/components/ShotFrame";

type ExploreItem = {
  title: string;
  deck: string;
  body: string;
  href: string;
  cta: string;
  image: string;
  imageAlt: string;
  icon: ReactNode;
};

const items: ExploreItem[] = [
  {
    title: "Global Privacy Law Map",
    deck: "Explore 150+ jurisdictions around the world.",
    body:
      "See where comprehensive, sectoral, partial, and proposed privacy laws apply. Open any " +
      "country to review its law, regulator, and recent developments.",
    href: "/jurisdictions",
    cta: "Open the map",
    image: "/images/explore/global-privacy-map.webp",
    imageAlt: "Global Privacy Law Map showing privacy-law status across jurisdictions",
    icon: <Globe2 className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />,
  },
  {
    title: "Global Privacy Authorities",
    deck: "Find the regulator responsible for each jurisdiction.",
    body:
      "Search 73 privacy and data protection authorities worldwide, ranked by enforcement " +
      "activity, and jump directly to each one's complaint portal.",
    href: "/global-privacy-authorities",
    cta: "Explore authorities",
    image: "/images/explore/global-privacy-authorities.webp",
    imageAlt: "Global Privacy Authorities directory showing regulator cards by country",
    icon: <Building2 className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />,
  },
  {
    title: "U.S. State Privacy Laws Comparison",
    deck: "Compare state privacy requirements side by side.",
    body:
      "All 21 enacted U.S. comprehensive state privacy laws, compared across 12 standard " +
      "provisions — consumer rights, DPIA triggers, enforcement authority, and more.",
    href: "/compare/us-states",
    cta: "Compare state laws",
    image: "/images/explore/us-state-comparison.webp",
    imageAlt: "U.S. State Privacy Laws Comparison table across 21 state privacy statutes",
    icon: <TableProperties className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />,
  },
  {
    title: "Enforcement Tracker",
    deck: "See how regulators are applying privacy law in practice.",
    body:
      "Search the last 60 days of enforcement actions, free for everyone. Filter by " +
      "jurisdiction, sector, data category, and violation type.",
    href: "/enforcement",
    cta: "Browse enforcement",
    image: "/images/explore/enforcement-tracker.webp",
    imageAlt: "Enforcement Tracker showing recent privacy enforcement actions and filters",
    icon: <Archive className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />,
  },
  {
    title: "Compliance Calendar",
    deck: "Keep upcoming privacy deadlines in view.",
    body:
      "Effective dates, enforcement start dates, and compliance milestones for 2026–2027, " +
      "enhanced with key dates extracted from our news feed.",
    href: "/calendar",
    cta: "Open the calendar",
    image: "/images/explore/compliance-calendar.webp",
    imageAlt: "Compliance Calendar showing upcoming regulatory deadlines",
    icon: <CalendarDays className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />,
  },
  {
    title: "Legitimate Interest Enforcement Tracker",
    deck: "See which legitimate-interest arguments regulators accept — and reject.",
    body:
      "Enforcement decisions and official guidance from EU and UK authorities, organized by " +
      "the three-part test: purpose, necessity, and balancing.",
    href: "/legitimate-interest-tracker",
    cta: "Explore LI decisions",
    image: "/images/explore/li-enforcement-tracker.webp",
    imageAlt: "Legitimate Interest Tracker showing accepted and rejected enforcement positions",
    icon: <Scale className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />,
  },
];

function ExploreRow({ item, index }: { item: ExploreItem; index: number }) {
  const reverse = index % 2 === 1;

  return (
    <Link
      to={item.href}
      className="group block rounded-2xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-4"
      aria-label={`${item.title} — ${item.cta}`}
    >
      <section
        className="border-t border-brand-cloud first:border-t-0 py-9 md:py-14"
        aria-labelledby={`explore-${index}`}
      >
        <div
          className={[
            "grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-12 items-center",
            reverse ? "lg:[&>*:first-child]:order-2" : "",
          ].join(" ")}
        >
          <ShotFrame src={item.image} alt={item.imageAlt} eager={index === 0} />

          <div className="lg:px-4">
            <div className="w-12 h-12 rounded-full bg-brand-cloud flex items-center justify-center text-brand-teal-text mb-4">
              {item.icon}
            </div>
            <h2 id={`explore-${index}`} className="font-semibold text-2xl md:text-3xl text-brand-navy mb-2">
              {item.title}
            </h2>
            <p className="text-brand-steel font-semibold mb-3">{item.deck}</p>
            <p className="text-slate leading-relaxed max-w-xl">{item.body}</p>
            <span className="inline-flex items-center gap-2 mt-5 text-brand-globe-light font-semibold group-hover:underline underline-offset-4">
              {item.cta}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </section>
    </Link>
  );
}

export default function Explore() {
  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>Free Privacy Exploration Tools | End User Privacy</title>
        <meta
          name="description"
          content="Explore privacy laws, regulators, enforcement actions, compliance deadlines, and jurisdiction comparisons with free End User Privacy research tools."
        />
        <link rel="canonical" href="https://enduserprivacy.com/explore" />
      </Helmet>

      <Navbar />

      <main id="main-content">
        <header className="bg-[#2d7a8a] text-white py-12">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
              <Compass aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Free
              exploration tools
            </span>
            <h1 className="text-hero-h1 text-white mb-3">
              Explore privacy laws, regulators, and enforcement for free.
            </h1>
            <p className="text-slate-300 text-lg max-w-3xl">
              Browse interactive tools for privacy laws, authorities, enforcement activity,
              deadlines, and jurisdiction comparisons. No subscription is required to explore
              these resources.
            </p>
          </div>
        </header>

        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-7">
          {items.map((item, index) => (
            <ExploreRow key={item.href} item={item} index={index} />
          ))}

          <section className="py-8 md:py-12">
            <div className="bg-card border border-brand-cloud border-l-4 border-l-brand-teal rounded-2xl shadow-eup-md p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-eyebrow text-brand-steel mb-2">From exploration to intelligence</p>
                <h2 className="font-semibold text-2xl text-brand-navy mb-2">
                  Want the analysis too? Build your sample Weekly Brief.
                </h2>
                <p className="text-slate max-w-3xl">
                  See how End User Privacy turns regulatory developments into practical
                  intelligence organized around the jurisdictions and issues that matter to you.
                </p>
              </div>
              <Link
                to="/get-intelligence"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-brand-navy text-white font-semibold no-underline hover:opacity-95"
              >
                Build my sample Weekly Brief
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
