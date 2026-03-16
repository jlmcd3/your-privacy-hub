import { Helmet } from "react-helmet-async";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Contact | EndUserPrivacy</title>
        <meta name="description" content="Contact EndUserPrivacy for general inquiries, subscription questions, or data and privacy questions." />
      </Helmet>
      <Topbar />
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-navy via-navy-light to-navy py-16 px-4">
          <div className="max-w-[760px] mx-auto text-center">
            <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-sky bg-sky/10 border border-sky/20 rounded-full px-3 py-1 mb-4">
              ✉️ CONTACT
            </span>
            <h1 className="font-display text-[32px] md:text-[40px] font-extrabold text-white leading-tight mb-4">
              Get in Touch
            </h1>
            <p className="text-slate-light text-[15px] max-w-[520px] mx-auto">
              We'd love to hear from you. Reach out with questions, feedback, or partnership inquiries.
            </p>
          </div>
        </section>
        <section className="max-w-[760px] mx-auto px-4 py-12 text-center">
          <div className="bg-card border border-fog rounded-2xl p-8 max-w-[480px] mx-auto">
            <h2 className="font-display text-[20px] font-bold text-navy mb-2">Email Us</h2>
            <p className="text-[14px] text-slate mb-6">
              Our team typically responds within 24 hours.
            </p>
            <a
              href="mailto:hello@enduserprivacy.com"
              className="inline-block px-6 py-3 bg-navy text-white font-semibold rounded-lg hover:opacity-90 transition-all no-underline text-[14px]"
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
