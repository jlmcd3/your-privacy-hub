import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClient } from "@/hooks/useActiveClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Defence-in-depth client-scope check for EU & Global Notice session pages.
 * Mirrors useUsNoticeSessionGuard. Bounces to /eu-notices on mismatch.
 */
export function useEuNoticeSessionGuard(sessionId: string | undefined): {
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
        .from("eu_notice_sessions")
        .select("client_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setAuthorized(false);
        setVerifying(false);
        toast({
          title: "Notice session not available",
          description: "This session isn't accessible from your current account.",
          variant: "destructive",
        });
        navigate("/eu-notices");
        return;
      }
      if (clientId && data.client_id !== clientId) {
        setAuthorized(false);
        setVerifying(false);
        toast({
          title: "Different client selected",
          description:
            "This notice session belongs to a different client. Switch clients to view it.",
        });
        navigate("/eu-notices");
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
