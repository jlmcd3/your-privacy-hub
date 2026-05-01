import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  user_role: string | null;
  primary_jurisdiction: string | null;
  sector: string | null;
  action_brief_salutation: string; // e.g. 'you as DPO'
}

const ROLE_SALUTATIONS: Record<string, string> = {
  dpo: 'you as DPO',
  cpo: 'you as CPO',
  privacy_counsel: 'you as privacy counsel',
  compliance: 'your compliance team',
  privacy_manager: 'your privacy team',
  consultant: 'you as a privacy consultant',
  other: 'your team',
};

export function useUserProfile(): UserProfile {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    user_role: null,
    primary_jurisdiction: null,
    sector: null,
    action_brief_salutation: 'your team',
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('user_role, primary_jurisdiction, sector')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setProfile({
          user_role: data.user_role,
          primary_jurisdiction: data.primary_jurisdiction,
          sector: data.sector,
          action_brief_salutation:
            ROLE_SALUTATIONS[data.user_role || ''] || 'your team',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return profile;
}
