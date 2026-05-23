import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Signup = () => {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Helmet>
        <title>Account Creation Paused | End User Privacy</title>
        <meta name="description" content="New account creation is temporarily paused while End User Privacy is in private beta." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-card border border-fog rounded-2xl shadow-eup-sm p-8 text-center opacity-95">
          <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-fog flex items-center justify-center">
            <Lock className="w-5 h-5 text-slate" aria-hidden="true" />
          </div>
          <h1 className="font-display text-navy mb-2">Account creation paused</h1>
          <p className="text-sm text-slate mb-6 leading-relaxed">
            End User Privacy is currently in <span className="font-semibold text-navy">private beta</span>.
            New public sign-ups are temporarily disabled while we onboard our initial group of testers.
          </p>

          {/* Greyed-out form preview */}
          <div className="space-y-3 mb-6 pointer-events-none select-none opacity-40" aria-hidden="true">
            <div className="text-left">
              <label className="block text-sm font-medium text-navy mb-1.5">Email</label>
              <input
                type="email"
                disabled
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 text-[14px] bg-fog/50 border border-silver rounded-lg text-slate cursor-not-allowed"
              />
            </div>
            <div className="text-left">
              <label className="block text-sm font-medium text-navy mb-1.5">Password</label>
              <input
                type="password"
                disabled
                placeholder="Min. 6 characters"
                className="w-full px-3.5 py-2.5 text-[14px] bg-fog/50 border border-silver rounded-lg text-slate cursor-not-allowed"
              />
            </div>
            <button
              type="button"
              disabled
              className="w-full py-3 text-[14px] font-semibold text-white bg-slate-light rounded-lg cursor-not-allowed border-none"
            >
              Create Account
            </button>
          </div>

          <p className="text-sm text-slate mb-2">
            Already have a beta account?{" "}
            <Link to="/login" className="text-blue font-medium hover:underline no-underline">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-slate-light">
            Interested in beta access?{" "}
            <Link to="/contact" className="text-blue hover:underline no-underline">
              Contact us
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Signup;
