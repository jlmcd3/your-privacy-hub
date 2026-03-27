import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FollowButtonProps {
  followType: "regulator" | "jurisdiction" | "topic";
  followKey: string;
  label: string;
}

const FollowButton = ({ followType, followKey, label }: FollowButtonProps) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState(user?.email || "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate">("idle");

  const handleFollow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("loading");

    const { error } = await supabase.from("regulator_follows").insert({
      email: email.toLowerCase().trim(),
      follow_type: followType,
      follow_key: followKey,
    });

    if (error?.code === "23505") {
      setStatus("duplicate");
    } else {
      setStatus("success");
    }
  };

  if (status === "success") {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent bg-accent/10 rounded-lg border border-accent/20">
        <BellRing className="w-4 h-4" />
        Following {label}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary/10 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer text-slate-50"
      >
        <Bell className="w-4 h-4" />
        Follow {label}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground mb-2">Follow {label}</h3>
            <p className="text-xs text-muted-foreground mb-4">Get email alerts when new articles are published about {label}.</p>

            {status === "duplicate" ? (
              <p className="text-sm text-primary font-medium">You're already following {label}!</p>
            ) : (
              <form onSubmit={handleFollow} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:border-primary transition-colors"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {status === "loading" ? "…" : "Follow"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FollowButton;