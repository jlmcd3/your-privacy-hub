import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Account = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setIsPremium(data.is_premium);
      });
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <Navbar />
      <div className="flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8">
          <h1 className="font-display text-[24px] text-foreground text-center mb-7">My Account</h1>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center py-3 px-4 bg-background rounded-lg border border-border">
              <span className="text-[13px] font-medium text-muted-foreground">Email</span>
              <span className="text-[13px] text-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-3 px-4 bg-background rounded-lg border border-border">
              <span className="text-[13px] font-medium text-muted-foreground">Subscription</span>
              {isPremium ? (
                <span className="text-[12px] font-semibold text-accent-foreground bg-accent px-2.5 py-1 rounded-full">
                  Premium
                </span>
              ) : (
                <span className="text-[12px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  Free
                </span>
              )}
            </div>
          </div>

          {!isPremium && (
            <button
              onClick={() => navigate("/subscribe")}
              className="w-full py-3 text-[14px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors cursor-pointer mb-3"
            >
              Upgrade to Premium
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="w-full py-3 text-[14px] font-medium text-muted-foreground bg-background border border-border rounded-lg hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
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
