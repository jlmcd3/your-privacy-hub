import { useParams, Link } from "react-router-dom";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const categoryMeta: Record<string, { title: string; icon: string; description: string }> = {
  "us-federal": {
    title: "U.S. Federal",
    icon: "🇺🇸",
    description: "Federal privacy regulatory updates from the FTC, HHS, FCC, CFPB, and other federal agencies. Covers COPPA, HIPAA, FTC enforcement actions, and federal privacy bill activity.",
  },
  "us-states": {
    title: "U.S. States",
    icon: "🗺️",
    description: "State-level privacy regulatory updates covering all 50 states. Includes new legislation, enforcement actions by state attorneys general, and regulatory guidance from state privacy agencies.",
  },
  "eu-uk": {
    title: "EU & UK",
    icon: "🇪🇺",
    description: "Privacy regulatory updates from EU member state DPAs, the EDPB, and the UK's ICO. Covers GDPR enforcement, guidance, and regulatory developments across the European Economic Area.",
  },
  "global": {
    title: "Global",
    icon: "🌐",
    description: "Privacy regulatory developments from jurisdictions outside the U.S. and EU, including Asia-Pacific, Latin America, Middle East, and Africa. Covers new legislation, enforcement, and cross-border transfer developments.",
  },
  "enforcement": {
    title: "Enforcement Actions",
    icon: "⚖️",
    description: "Privacy enforcement actions worldwide including fines, sanctions, orders, and settlements from all monitored regulators. The definitive source for global privacy enforcement intelligence.",
  },
  "ai-privacy": {
    title: "AI & Privacy",
    icon: "🤖",
    description: "Regulatory developments at the intersection of artificial intelligence and data privacy. Covers the EU AI Act, automated decision-making regulations, AI training data guidance, and biometric data processing.",
  },
};

// Sample updates per category
const sampleUpdates: Record<string, { title: string; regulator: string; date: string; bullets: string[] }[]> = {
  "us-federal": [
    { title: "FTC Proposes Rule Expanding Children's Privacy Protections Under COPPA", regulator: "Federal Trade Commission", date: "Mar 6, 2026", bullets: ["FTC proposed rule would require verifiable parental consent for targeted advertising directed at children under 16.", "Proposed rule expands the definition of personal information to include biometric identifiers.", "Public comment period open for 90 days."] },
    { title: "HHS Proposes Updates to HIPAA Privacy Rule for Reproductive Health Data", regulator: "Department of Health & Human Services", date: "Mar 1, 2026", bullets: ["Proposed rule would prohibit use of PHI for investigations into lawful reproductive health care.", "New attestation requirement for disclosures of reproductive health information.", "60-day comment period."] },
  ],
  "us-states": [
    { title: "CPPA Approves Final Automated Decisionmaking Regulations", regulator: "California Privacy Protection Agency", date: "Mar 7, 2026", bullets: ["CPPA board approved final ADMT regulations requiring pre-use notices.", "Consumers gain opt-out rights for ADM in employment, housing, and credit.", "Regulations take effect January 1, 2027."] },
    { title: "Texas AG Files First TDPSA Enforcement Action Against Data Broker", regulator: "Texas Attorney General", date: "Mar 9, 2026", bullets: ["Texas AG filed suit for selling sensitive data without consent.", "TDPSA authorizes civil penalties of up to $7,500 per violation.", "First enforcement action under the Texas Data Privacy and Security Act."] },
  ],
  "eu-uk": [
    { title: "EDPB Adopts Binding Guidance on Personal Data Use in AI Model Training", regulator: "European Data Protection Board", date: "Mar 10, 2026", bullets: ["Training LLMs on scraped personal data without valid legal basis constitutes GDPR violation.", "Controllers must identify legal basis for each processing phase.", "Guidance applies regardless of controller establishment location."] },
    { title: "ICO Publishes Updated Guidance on Biometric Data in Workplace AI Systems", regulator: "UK Information Commissioner's Office", date: "Mar 8, 2026", bullets: ["Biometric data processed by workplace AI is special category data.", "Employers must complete DPIA before deploying biometric systems.", "90-day grace period for existing deployments."] },
  ],
  "global": [
    { title: "ANPD Issues Guidance on International Data Transfers Under LGPD", regulator: "Brazil ANPD", date: "Mar 5, 2026", bullets: ["Standard contractual clauses for cross-border data transfers established.", "Controllers must maintain records of all international transfers.", "Effective September 1, 2026."] },
  ],
  "enforcement": [
    { title: "CNIL Fines Clearview AI €20M for Unlawful Biometric Processing", regulator: "CNIL (France)", date: "Mar 8, 2026", bullets: ["Unlawful biometric data processing without consent.", "Clearview AI ordered to delete all data on French individuals.", "Fine reflects severity and systematic nature of violations."] },
    { title: "Texas AG Files First TDPSA Enforcement Action Against Data Broker", regulator: "Texas Attorney General", date: "Mar 9, 2026", bullets: ["Selling sensitive personal data without required consumer consent.", "Failure to honor opt-out requests.", "Civil penalties of up to $7,500 per violation."] },
  ],
  "ai-privacy": [
    { title: "EDPB Adopts Binding Guidance on AI Training Data", regulator: "EDPB", date: "Mar 10, 2026", bullets: ["LLMs trained on scraped personal data require valid GDPR legal basis.", "Legitimate interest cannot be automatically assumed for AI training.", "Applies to all controllers processing EU residents' data."] },
    { title: "ICO Updated Guidance on Biometric Data in Workplace AI", regulator: "ICO (UK)", date: "Mar 8, 2026", bullets: ["Biometric data from workplace AI classified as special category.", "DPIA required before deployment.", "90-day grace period for compliance."] },
  ],
};

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const meta = slug ? categoryMeta[slug] : null;
  const updates = slug ? sampleUpdates[slug] || [] : [];

  if (!meta) {
    return (
      <div className="min-h-screen bg-paper">
        <Topbar />
        <Navbar />
        <div className="max-w-[860px] mx-auto px-4 md:px-8 py-20 text-center">
          <h1 className="font-display text-3xl text-navy mb-4">Category Not Found</h1>
          <Link to="/" className="text-blue hover:underline">Return to homepage →</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            {meta.icon} Category
          </div>
          <h1 className="font-display text-[28px] md:text-[36px] text-white mb-3">{meta.title}</h1>
          <p className="text-sm md:text-base text-slate-light max-w-[700px]">{meta.description}</p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        <div className="space-y-5">
          {updates.map((update, i) => (
            <div key={i} className="bg-card border border-fog rounded-xl p-5 md:p-6 shadow-eup-sm hover:shadow-eup-md hover:-translate-y-0.5 transition-all">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                <div className="text-[11px] font-semibold tracking-wide uppercase text-slate">{update.regulator}</div>
                <span className="text-[11px] text-slate-light">{update.date}</span>
              </div>
              <h3 className="font-display text-[16px] md:text-[18px] text-navy mb-3">{update.title}</h3>
              <ul className="list-none space-y-1.5">
                {update.bullets.map((b, bi) => (
                  <li key={bi} className="text-[13px] text-slate leading-relaxed pl-3.5 relative">
                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-blue-light" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {updates.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate text-[14px]">No updates available yet for this category.</p>
          </div>
        )}

        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Premium Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Get all {meta.title} updates in your weekly brief</h3>
          <p className="text-[13px] text-slate-light mb-5 max-w-[500px] mx-auto">Premium subscribers receive a structured weekly intelligence brief with analysis across all categories.</p>
          <Link to="/#premium" className="inline-block px-6 py-3 text-sm font-semibold text-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline">
            View Premium Plans →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CategoryPage;
