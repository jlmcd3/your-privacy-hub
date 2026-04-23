// Premium-only edge function: returns enforcement actions older than 45 days
// (the public RLS policy already serves the last 45 days directly to the client).
// Premium gating is enforced server-side by checking profiles.is_premium / is_pro.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface ListBody {
  q?: string;
  jurisdiction?: string;
  sector?: string;
  data_category?: string;
  violation?: string;
  significance?: string;
  page?: number;
  pageSize?: number;
  // If true, return ALL enforcement actions (premium archive view).
  // If false (default), return only rows older than 45 days (premium "older history" extension).
  includeRecent?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    // Service role for bypassing RLS once premium is verified
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify premium
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('is_premium, is_pro')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      return new Response(JSON.stringify({ error: 'Profile lookup failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isPremium = profile?.is_premium === true || profile?.is_pro === true;
    if (!isPremium) {
      return new Response(
        JSON.stringify({ error: 'Premium subscription required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = (await req.json().catch(() => ({}))) as ListBody;
    const page = Math.max(0, Number(body.page ?? 0));
    const pageSize = Math.min(100, Math.max(1, Number(body.pageSize ?? 25)));
    const includeRecent = body.includeRecent === true;

    let query = admin
      .from('enforcement_actions')
      .select(
        'id,regulator,subject,jurisdiction,decision_date,fine_eur,fine_eur_equivalent,industry_sector,data_categories,violation_types,precedent_significance,key_compliance_failure,source_url,law',
        { count: 'exact' }
      );

    if (!includeRecent) {
      // Premium archive only: rows older than 45 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 45);
      query = query.lt('decision_date', cutoff.toISOString().slice(0, 10));
    }

    if (body.jurisdiction && body.jurisdiction !== 'all') {
      query = query.eq('jurisdiction', body.jurisdiction);
    }
    if (body.sector && body.sector !== 'all') {
      query = query.eq('industry_sector', body.sector);
    }
    if (body.data_category && body.data_category !== 'all') {
      query = query.contains('data_categories', [body.data_category]);
    }
    if (body.violation && body.violation !== 'all') {
      query = query.contains('violation_types', [body.violation]);
    }
    if (body.significance && body.significance !== 'any') {
      query = query.gte('precedent_significance', parseInt(body.significance));
    }
    if (body.q?.trim()) {
      const like = `%${body.q.trim().replace(/[%_]/g, '')}%`;
      query = query.or(
        `subject.ilike.${like},violation.ilike.${like},key_compliance_failure.ilike.${like}`
      );
    }

    query = query
      .order('decision_date', { ascending: false, nullsFirst: false })
      .order('precedent_significance', {
        ascending: false,
        nullsFirst: false,
      })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('Archive query failed:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ rows: data ?? [], count: count ?? 0 }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
