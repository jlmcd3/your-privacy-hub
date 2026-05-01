import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function USNoticeLanding() {
  useEffect(() => {
    document.title = "US Privacy Notice Builder | End User Privacy";
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          US Privacy Notice Builder
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Generate audit-ready US state privacy notices covering CCPA, the Virginia model
          (VCDPA, CPA, CTDPA, and 14 more), Maryland MODPA, and Florida FDBR.
        </p>
        <p className="text-sm text-muted-foreground mt-8">
          Full landing page implementation in progress.
        </p>
      </main>
      <Footer />
    </div>
  );
}
