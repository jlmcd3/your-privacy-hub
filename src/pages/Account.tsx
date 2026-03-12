import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Account = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />
      <div className="flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-card border border-fog rounded-2xl shadow-eup-sm p-8">
          <h1 className="font-display text-[24px] text-navy text-center mb-7">My Account</h1>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center py-3 px-4 bg-paper rounded-lg border border-fog">
              <span className="text-[13px] font-medium text-slate">Email</span>
              <span className="text-[13px] text-navy">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-3 px-4 bg-paper rounded-lg border border-fog">
              <span className="text-[13px] font-medium text-slate">Subscription</span>
              <span className="text-[12px] font-semibold text-slate bg-fog px-2.5 py-1 rounded-full">Free</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-3 text-[14px] font-medium text-slate bg-paper border border-silver rounded-lg hover:bg-fog hover:text-navy transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Account;
