import { Link } from "react-router-dom";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle } from "lucide-react";

const SubscribeSuccess = () => {
  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <Navbar />
      <div className="flex items-center justify-center py-24 px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-accent mx-auto mb-6" />
          <h1 className="font-display text-[28px] text-foreground mb-3">
            You're now a Premium Member
          </h1>
          <p className="text-muted-foreground text-[15px] mb-8">
            Thank you for subscribing. You now have full access to the Enforcement Tracker, Weekly Brief, and all premium content.
          </p>
          <Link
            to="/account"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg text-[14px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Go to My Account
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SubscribeSuccess;
