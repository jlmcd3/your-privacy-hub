import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ENQUIRY_TYPES = [
  "General",
  "Enterprise pricing",
  "Partnership",
  "Technical support",
  "Press",
] as const;

type EnquiryType = typeof ENQUIRY_TYPES[number];

const Contact = () => {
  const [enquiryType, setEnquiryType] = useState<EnquiryType>("General");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Deferred server-side pathway: no submission endpoint wired. Fall back to a
    // pre-populated mailto so the enquiry still reaches the team. See D-C1.
    const subject = `[${enquiryType}] Contact — ${name || "no name"}`;
    const body = `Enquiry type: ${enquiryType}\nName: ${name}\nEmail: ${email}\n\n${message}`;
    const mailto = `mailto:support@enduserprivacy.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitted(true);
  };

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

        <section className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-card border border-brand-cloud rounded-2xl p-8 max-w-[560px] mx-auto">
            {submitted ? (
              <div role="status" aria-live="polite" className="text-center py-4">
                <div className="text-4xl mb-4" aria-hidden="true">✉️</div>
                <h2 className="font-display text-brand-navy mb-2">Thanks. Your message is on its way.</h2>
                <p className="text-slate text-[14px] leading-relaxed mb-4">
                  Your email client should have opened with a pre-filled message. If it didn't, you can email us directly at{" "}
                  <a href="mailto:support@enduserprivacy.com" className="text-brand-teal-text hover:underline no-underline">
                    support@enduserprivacy.com
                  </a>
                  .
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setName("");
                    setEmail("");
                    setMessage("");
                    setEnquiryType("General");
                  }}
                  className="text-sm text-brand-teal-text hover:text-brand-navy bg-transparent border-none cursor-pointer p-0"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="contact-type" className="block text-sm font-medium text-brand-navy mb-1.5">
                    Enquiry type
                  </label>
                  <select
                    id="contact-type"
                    value={enquiryType}
                    onChange={(e) => setEnquiryType(e.target.value as EnquiryType)}
                    required
                    aria-required="true"
                    className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
                  >
                    {ENQUIRY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-brand-navy mb-1.5">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    aria-required="true"
                    autoComplete="name"
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none placeholder:text-brand-mist focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-brand-navy mb-1.5">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    aria-required="true"
                    autoComplete="email"
                    maxLength={255}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none placeholder:text-brand-mist focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-brand-navy mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    aria-required="true"
                    maxLength={2000}
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none placeholder:text-brand-mist focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors resize-y"
                    placeholder="How can we help?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 text-[14px] font-semibold text-white bg-teal-action rounded-md hover:opacity-90 transition-all cursor-pointer border-none"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
