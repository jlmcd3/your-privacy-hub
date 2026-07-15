import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Contact | End User Privacy</title>
        <meta name="description" content="Contact End User Privacy for general inquiries, subscription questions, or data and privacy questions." />
      </Helmet>
      <Navbar />
      <main id="main-content" aria-label="Contact" className="flex-1">
        <section className="bg-gradient-to-br from-brand-navy via-brand-slate-teal to-brand-navy py-16 px-4">
          <div className="max-w-[760px] mx-auto text-center">
            <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-brand-mist bg-brand-mist/10 border border-brand-mist/20 rounded-full px-3 py-1 mb-4">
              ✉️ CONTACT
            </span>
            <h1 className="font-display text-white leading-tight mb-4">
              Get in Touch
            </h1>
            <p className="text-brand-mist text-[15px] max-w-[520px] mx-auto">
              We'd love to hear from you. Reach out with questions, feedback, or partnership inquiries.
            </p>
          </div>
        </section>
        <section className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="bg-card border border-brand-cloud rounded-2xl p-8 max-w-[480px] mx-auto">
            <h2 className="font-display text-brand-navy mb-2">Email Us</h2>
            <p className="text-[14px] text-slate mb-6">
              Our team typically responds within 24 hours.
            </p>
            <a
              href="mailto:hello@enduserprivacy.com"
              className="inline-block px-6 py-3 bg-brand-navy text-white font-semibold rounded-lg hover:opacity-90 transition-all no-underline text-[14px]"
            >
              hello@enduserprivacy.com →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
