import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Topbar />
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-navy via-navy-light to-navy py-16 px-4">
          <div className="max-w-[760px] mx-auto text-center">
            <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-sky bg-sky/10 border border-sky/20 rounded-full px-3 py-1 mb-4">
              🏢 ABOUT US
            </span>
            <h1 className="font-display text-[32px] md:text-[40px] font-extrabold text-white leading-tight mb-4">
              About End User Privacy
            </h1>
            <p className="text-slate-light text-[15px] max-w-[520px] mx-auto">
              The most comprehensive privacy regulatory intelligence platform — built for privacy professionals who need to stay ahead.
            </p>
          </div>
        </section>
        <section className="max-w-[760px] mx-auto px-4 py-12">
          <div className="space-y-6 text-[15px] text-slate leading-relaxed">
            <p>
              End User Privacy monitors 250+ regulatory authorities across 150+ jurisdictions worldwide, delivering daily updates on enforcement actions, legislative developments, and regulatory guidance.
            </p>
            <p>
              Our platform uses AI to ingest, filter, and summarize primary source material — press releases, regulatory announcements, and authoritative news coverage — so privacy professionals can focus on what matters most.
            </p>
            <p>
              Whether you're a Chief Privacy Officer at a Fortune 500 company, a privacy attorney at a global law firm, or a consultant advising clients on compliance, End User Privacy gives you the intelligence you need in one place.
            </p>
            <h2 className="font-display text-[20px] font-bold text-navy pt-4">Our Mission</h2>
            <p>
              To make privacy regulatory intelligence accessible, comprehensive, and actionable — at any price point. We believe that staying informed about the global privacy landscape shouldn't require expensive enterprise subscriptions or hours of manual research.
            </p>
            <h2 className="font-display text-[20px] font-bold text-navy pt-4">Contact</h2>
            <p>
              Have questions or feedback? Reach us at{" "}
              <a href="mailto:hello@enduserprivacy.com" className="text-sky hover:underline">
                hello@enduserprivacy.com
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
