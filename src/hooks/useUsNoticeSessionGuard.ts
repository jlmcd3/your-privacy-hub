import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClient } from "@/hooks/useActiveClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Defence-in-depth client-scope check for US Notice session pages.
 *
 * RLS is the primary security mechanism (us_notice_sessions enforces
 * `client_id IN my_client_ids()`); this hook adds a defensive front-end
 * verification so that switching the active client mid-flow doesn't surface
 * a session belonging to a different client. If a mismatch is detected, the
 * user is bounced back to the US Notices home with a toast.
 *
 * Returns the verification status so pages can render a skeleton until the
 * check has resolved.
 */
export function useUsNoticeSessionGuard(sessionId: string | undefined): {
  verifying: boolean;
  authorized: boolean;
} {
  const { clientId } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) {
      setVerifying(false);
      setAuthorized(false);
      return;
    }
    setVerifying(true);
    (async () => {
      const { data, error } = await supabase
        .from("us_notice_sessions")
        .select("client_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        // RLS will return null for sessions the user can't see; treat as unauthorized.
        setAuthorized(false);
        setVerifying(false);
        toast({
          title: "Notice session not available",
          description: "This session isn't accessible from your current account.",
          variant: "destructive",
        });
        navigate("/us-notices");
        return;
      }
      // If an active client is selected and it doesn't match, bounce.
      if (clientId && data.client_id !== clientId) {
        setAuthorized(false);
        setVerifying(false);
        toast({
          title: "Different client selected",
          description:
            "This notice session belongs to a different client. Switch clients to view it.",
        });
        navigate("/us-notices");
        return;
      }
      setAuthorized(true);
      setVerifying(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, clientId, navigate, toast]);

  return { verifying, authorized };
}
