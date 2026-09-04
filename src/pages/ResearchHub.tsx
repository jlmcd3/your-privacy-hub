import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Compass,
  Lock,
  Radar,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShotFrame from "@/components/ShotFrame";

type QuickLink = { label: string; href: string };

type ResearchGroup = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  image: string;
  imageAlt: string;
  icon: ReactNode;
  linkGroups: { label: string; links: QuickLink[] }[];
};

const groups: ResearchGroup[] = [
  {
    eyebrow: "Privacy laws & frameworks",
    title: "Start with the law. Compare how privacy rules differ by jurisdiction.",
    body:
      "Research U.S., EU/UK, global, and AI privacy frameworks, and track legislation still " +
      "moving toward enactment.",
    href: "/global-privacy-laws",
    cta: "Browse privacy-law research",
    image: "/images/research/privacy-laws.webp",
    imageAlt: "Global Privacy Laws research page showing jurisdiction directory and coverage stats",
    icon: <BookOpen className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />,
    linkGroups: [
      {
        label: "Laws & frameworks",
        links: [
          { label: "U.S. Privacy Laws", href: "/us-privacy-laws" },
          { label: "GDPR & UK GDPR", href: "/gdpr-enforcement" },
          { label: "Global Privacy Laws", href: "/global-privacy-laws" },
          { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
          { label: "Legislation in Progress", href: "/legislation-tracker" },
        ],
      },
    ],
  },
  {
    eyebrow: "Authorities & practitioner research",
    title: "Find the regulator, then move directly into the practical issue.",
    body:
      "Locate privacy authorities and official sources, define key terms, and use practitioner " +
      "guides for cross-border transfers, biometrics, health data, cookies, and breach response.",
    href: "/cross-border-transfers",
    cta: "Start with cross-border transfers",
    image: "/images/research/cross-border-transfers.webp",
    imageAlt: "Cross-Border Data Transfers guide showing transfer-mechanism decision tool",
    icon: <Building2 className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />,
    linkGroups: [
      {
        label: "Directories",
        links: [
          { label: "Global Privacy Authorities", href: "/global-privacy-authorities" },
          { label: "Key Privacy Terms", href: "/glossary" },
        ],
      },
      {
        label: "Practitioner guides",
        links: [
          { label: "Cross-Border Transfers Guide", href: "/cross-border-transfers" },
          { label: "Biometric Privacy Guide", href: "/biometric-privacy" },
          { label: "Health Data Privacy Guide", href: "/health-data-privacy" },
          { label: "Cookie Consent Guide", href: "/cookie-consent" },
          { label: "Breach Response Guide", href: "/breach-notification" },
        ],
      },
    ],
  },
];

type PremiumItem = {
  title: string;
  deck: string;
  body: string;
  href: string;
  cta: string;
  image: string;
  imageAlt: string;
};

const premiumItems: PremiumItem[] = [
  {
    title: "Regulatory Trend Forecast",
    deck: "See what regulators are likely to do next — before it happens.",
    body:
      "Enforcement signals synthesized from primary regulator output and updated weekly, each " +
      "with a confidence rating, source analysis, and recommended action. Included with an " +
      "Intelligence subscription.",
    href: "/horizon",
    cta: "Preview the forecast",
    image: "/images/research/regulatory-trend-forecast.webp",
    imageAlt: "Regulatory Trend Forecast showing locked forward-looking enforcement signals",
  },
  {
    title: "Global Enforcement Database — Full Archive",
    deck: "Search the complete enforcement record: 3,700+ decisions.",
    body:
      "The free Enforcement Tracker above covers the last 60 days. The full historical archive " +
      "— every decision, sector, and violation taxonomy since tracking began — is included " +
      "with an Intelligence subscription.",
    href: "/enforcement?view=archive",
    cta: "Preview the archive",
    image: "/images/research/enforcement-database-archive.webp",
    imageAlt: "Global Enforcement Database full archive showing the subscriber upgrade panel",
  },
];

function SubscriberBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal-text border border-brand-teal/20">
      <Lock className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
      Subscriber experience
    </span>
  );
}

function ResearchGroupRow({ group, index }: { group: ResearchGroup; index: number }) {
  const reverse = index % 2 === 1;
  return (
    <section className="border-t border-brand-cloud first:border-t-0 py-9 md:py-14">
      <Link
        to={group.href}
        className="group block rounded-2xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-4"
        aria-label={`${group.cta}: ${group.title}`}
      >
        <div
          className={[
            "grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-12 items-center",
            reverse ? "lg:[&>*:first-child]:order-2" : "",
          ].join(" ")}
        >
          <ShotFrame src={group.image} alt={group.imageAlt} eager={index === 0} />
          <div className="lg:px-4">
            <RowBody group={group} />
          </div>
        </div>
      </Link>

      <div className="mt-6 lg:mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-4 lg:pl-[calc(50%+1.5rem)]">
        {group.linkGroups.map((lg) => (
          <div key={lg.label}>
            <p className="text-eyebrow text-brand-mist mb-2">{lg.label}</p>
            <div className="flex flex-wrap gap-2">
              {lg.links.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="inline-flex items-center rounded-full border border-brand-cloud bg-white px-3 py-1.5 text-sm text-brand-navy font-medium no-underline hover:border-brand-teal hover:text-brand-globe-light transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RowBody({ group }: { group: ResearchGroup }) {
  return (
    <>
      <div className="w-12 h-12 rounded-full bg-brand-cloud flex items-center justify-center text-brand-teal-text mb-4">
        {group.icon}
      </div>
      <p className="text-eyebrow text-brand-steel mb-2">{group.eyebrow}</p>
      <h2 className="font-semibold text-2xl md:text-3xl text-brand-navy mb-3">{group.title}</h2>
      <p className="text-slate leading-relaxed mb-1 max-w-xl">{group.body}</p>
      <span className="inline-flex items-center gap-2 mt-4 text-brand-globe-light font-semibold group-hover:underline underline-offset-4">
        {group.cta}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </>
  );
}

function PremiumRow({ item, index }: { item: PremiumItem; index: number }) {
  const reverse = index % 2 === 1;
  return (
    <Link
      to={item.href}
      className="group block rounded-2xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-4"
      aria-label={`${item.cta}: ${item.title} (subscriber experience)`}
    >
      <section className="border-t border-brand-cloud py-9 md:py-14">
        <div
          className={[
            "grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-12 items-center",
            reverse ? "lg:[&>*:first-child]:order-2" : "",
          ].join(" ")}
        >
          <ShotFrame src={item.image} alt={item.imageAlt} />
          <div className="lg:px-4">
            <div className="mb-4">
              <SubscriberBadge />
            </div>
            <h2 className="font-semibold text-2xl md:text-3xl text-brand-navy mb-2">{item.title}</h2>
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

export default function ResearchHub() {
  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>Privacy Laws & Regulatory Research | End User Privacy</title>
        <meta
          name="description"
          content="Research privacy laws, authorities, enforcement decisions, regulatory trends, and practitioner guidance across major jurisdictions."
        />
        <link rel="canonical" href="https://enduserprivacy.com/research" />
      </Helmet>

      <Navbar />

      <main id="main-content">
        <header className="bg-[#2d7a8a] text-white py-12">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
              <Compass aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Privacy
              laws & research
            </span>
            <h1 className="text-hero-h1 text-white mb-3">
              Research privacy laws, enforcement, and regulatory trends.
            </h1>
            <p className="text-slate-300 text-lg max-w-3xl">
              Move from the governing law to the regulator, enforcement record, and practical
              guidance — plus the forward-looking intelligence available with a subscription.
            </p>
          </div>
        </header>

        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-7">
          <ResearchGroupRow group={groups[0]} index={0} />
          <PremiumRow item={premiumItems[0]} index={1} />
          <PremiumRow item={premiumItems[1]} index={2} />
          <ResearchGroupRow group={groups[1]} index={3} />

          <section className="py-8 md:py-12">
            <div className="bg-card border border-brand-cloud border-l-4 border-l-brand-teal rounded-2xl shadow-eup-md p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-eyebrow text-brand-steel mb-2">Personalized intelligence</p>
                <h2 className="font-semibold text-2xl text-brand-navy mb-2">
                  Build a sample Weekly Brief around the issues you follow.
                </h2>
                <p className="text-slate max-w-3xl">
                  Select your jurisdiction, role, and topic tracks to preview the depth and
                  format of the subscriber Weekly Brief.
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
