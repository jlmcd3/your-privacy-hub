import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-20">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
        <div className="prose prose-sm max-w-none text-foreground/90 space-y-4">
          <p>
            EndUserPrivacy.com is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.
          </p>
          <p>
            For questions, contact{" "}
            <a href="mailto:hello@enduserprivacy.com" className="text-primary hover:underline">
              hello@enduserprivacy.com
            </a>.
          </p>
          <p>Full policy coming soon.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
