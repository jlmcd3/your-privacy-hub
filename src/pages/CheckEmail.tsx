import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CheckEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="min-h-screen bg-paper">
      <Helmet><title>Check Your Email | End User Privacy</title></Helmet>
      <Navbar />
      <div className="flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-card border border-fog rounded-2xl shadow-eup-sm p-8 text-center">
          <div className="text-5xl mb-5">📧</div>
          <h1 className="font-display text-[24px] text-navy mb-2">
            Check your inbox
          </h1>
          <p className="text-slate text-[14px] leading-relaxed mb-2">
            We sent a confirmation link to
          </p>
          {email ? (
            <p className="font-semibold text-navy text-[15px] mb-5">{email}</p>
          ) : (
            <p className="text-slate text-[14px] mb-5">your registered email address</p>
          )}
          <p className="text-slate text-[13px] leading-relaxed mb-7">
            Click the link in that email to confirm your account and proceed to checkout.
            The link expires in 24 hours.
          </p>

          <div className="bg-fog rounded-xl p-4 mb-6 text-left">
            <p className="text-[12px] font-semibold text-navy mb-2">Didn't get it?</p>
            <ul className="text-[12px] text-slate space-y-1">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure you used the right email address</li>
              <li>• Wait up to 2 minutes for delivery</li>
            </ul>
          </div>

          <Link
            to="/login"
            className="block text-center text-[13px] text-blue hover:text-navy no-underline"
          >
            Already confirmed? Sign in →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
