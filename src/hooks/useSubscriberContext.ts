import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import type { SubscriberContext } from '@/lib/generateResearchInvestigationPrompt';

export function useSubscriberContext(): {
  context: SubscriberContext | null;
  loading: boolean;
} {
  const { isPremium, user, isLoading: authLoading } = usePremiumStatus();
  const [context, setContext] = useState<SubscriberContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isPremium || !user) {
      setLoading(false);
      return;
    }

    Promise.all([
      supabase.from('profiles').select('brief_role').eq('id', user.id).maybeSingle(),
      supabase
        .from('user_brief_preferences')
        .select('industries, jurisdictions, topics')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]).then(([profileResult, prefsResult]) => {
      const role = (profileResult.data as any)?.brief_role ?? undefined;
      const prefs = prefsResult.data as any;
      setContext({
        role,
        industries: prefs?.industries ?? [],
        jurisdictions: prefs?.jurisdictions ?? [],
        topics: prefs?.topics ?? [],
      });
      setLoading(false);
    });
  }, [isPremium, user, authLoading]);

  return { context, loading };
}
