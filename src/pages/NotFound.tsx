import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const destinations = [
  { icon: "📰", title: "Latest Updates", desc: "Today's privacy regulatory developments", href: "/updates" },
  { icon: "🗺️", title: "Global Law Map", desc: "150+ jurisdictions mapped and profiled", href: "/jurisdictions" },
  { icon: "⚖️", title: "Enforcement Tracker", desc: "Fines, orders, and regulatory actions", href: "/enforcement-tracker" },
  { icon: "📋", title: "Sample Brief", desc: "See a full Intelligence Brief example", href: "/sample-brief" },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Helmet>
        <title>Page Not Found | Your Privacy Hub</title>
      </Helmet>
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-[560px] w-full text-center">
          <p className="text-[48px] font-bold text-navy mb-2">404</p>
          <h1 className="font-display text-[20px] font-bold text-navy mb-2">
            Page not found
          </h1>
          <p className="text-[14px] text-slate mb-8">
            The page <span className="font-mono text-[13px] bg-muted px-1.5 py-0.5 rounded">{location.pathname}</span> doesn't exist or has moved.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {destinations.map((d) => (
              <Link
                key={d.href}
                to={d.href}
                className="group bg-card border border-fog rounded-xl p-4 no-underline hover:shadow-eup-sm hover:-translate-y-0.5 transition-all text-left"
              >
                <span className="text-2xl block mb-2">{d.icon}</span>
                <p className="font-display font-bold text-navy text-[14px] mb-0.5 group-hover:text-blue transition-colors">
                  {d.title}
                </p>
                <p className="text-slate text-[12px]">{d.desc}</p>
              </Link>
            ))}
          </div>

          <Link
            to="/"
            className="text-blue text-[13px] font-semibold hover:text-navy transition-colors no-underline"
          >
            ← Back to homepage
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NotFound;