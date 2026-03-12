import { Link } from "react-router-dom";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

interface PillarPageProps {
  title: string;
  subtitle: string;
  icon: string;
  lastUpdated: string;
  intro: string;
  sections: { heading: string; content: string }[];
  relatedLinks: { label: string; href: string }[];
  directoryLink?: { label: string; href: string };
}

const PillarPage = ({ title, subtitle, icon, lastUpdated, intro, sections, relatedLinks, directoryLink }: PillarPageProps) => {
  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            {icon} Research Topic
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-3 leading-tight">{title}</h1>
          <p className="text-sm md:text-base text-slate-light max-w-[700px]">{subtitle}</p>
          <div className="text-[11px] text-slate-light mt-4">Last updated: {lastUpdated}</div>
        </div>
      </div>

      <AdBanner variant="leaderboard" className="py-5" />

      <div className="max-w-[860px] mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="bg-card border border-fog rounded-2xl p-5 md:p-8 shadow-eup-sm mb-8">
          <p className="text-[15px] text-navy leading-relaxed">{intro}</p>
        </div>

        <div className="space-y-8">
          {sections.map((sec, i) => (
            <React.Fragment key={i}>
              <div>
                <h2 className="font-display text-[20px] md:text-[24px] text-navy mb-3">{sec.heading}</h2>
                <p className="text-[14px] text-slate leading-relaxed">{sec.content}</p>
              </div>
              {i === Math.floor(sections.length / 2) - 1 && (
                <AdBanner variant="inline" className="py-4" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Related links */}
        <div className="mt-12 pt-8 border-t border-fog">
          <h3 className="font-display text-lg text-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedLinks.map((link, i) => (
              <Link key={i} to={link.href} className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
                <span className="text-blue">→</span> {link.label}
              </Link>
            ))}
          </div>
          {directoryLink && (
            <div className="mt-6">
              <Link to={directoryLink.href} className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-eup-sm hover:opacity-90 transition-all no-underline">
                {directoryLink.label} →
              </Link>
            </div>
          )}
        </div>

        <AdBanner variant="leaderboard" className="py-6" />

        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Premium Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Get the full picture every week</h3>
          <p className="text-[13px] text-slate-light mb-5 max-w-[500px] mx-auto">Premium subscribers receive a structured weekly intelligence brief covering all developments across every jurisdiction.</p>
          <Link to="/#premium" className="inline-block px-6 py-3 text-sm font-semibold text-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline">
            View Premium Plans →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PillarPage;
