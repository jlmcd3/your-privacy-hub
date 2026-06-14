import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { computeUpsellSignals } from '../_shared/upsell-signals.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const COOLDOWN_DAYS = 30;

// Confirmed pricing from EUP pricing table.
const PRODUCT_META: Record<string, any> = {
  governance_assessment:  { name: 'Governance Assessment',           url: '/tools/governance-assessment',  price_subscriber: '$25',  price_standalone: '$49'  },
  li_assessment:          { name: 'Legitimate Interest Assessment',  url: '/tools/li-assessment',          price_subscriber: '$35',  price_standalone: '$79'  },
  dpia_framework:         { name: 'DPIA Builder',                    url: '/tools/dpia-framework',         price_subscriber: '$49',  price_standalone: '$99'  },
  biometric_checker:      { name: 'Biometric Checker',               url: '/tools/biometric-checker',      price_subscriber: 'Free', price_standalone: '$49'  },
  ir_playbook:            { name: 'Breach IR Playbook',              url: '/tools/ir-playbook',            price_subscriber: 'Free', price_standalone: '$59'  },
  dpa_generator:          { name: 'Custom DPA Generator',            url: '/tools/dpa-generator',          price_subscriber: '$49',  price_standalone: '$99'  },
  cppa_scope:             { name: 'CPPA Scope Checker (Free)',        url: '/tools/cppa-scope',             price_subscriber: 'Free', price_standalone: 'Free' },
  cppa_risk:              { name: 'CPPA Risk Assessment',            url: '/tools/cppa-risk',              price_subscriber: '$79',  price_standalone: '$149' },
  cppa_cybersecurity:     { name: 'CPPA Cybersecurity Readiness',    url: '/tools/cppa-cybersecurity',     price_subscriber: '$99',  price_standalone: '$199' },
  cppa_bundle:            { name: 'CPPA Full Suite Bundle',          url: '/tools/cppa-bundle',            price_subscriber: '$149', price_standalone: '$299' },
  rofa:                   { name: 'Article 30 RoFA Builder',         url: '/tools/rofa',                   price_subscriber: '$49',  price_standalone: '$79'  },
  privacy_notice_us:      { name: 'Privacy Notice Generator',        url: '/tools/privacy-notice',         price_subscriber: '$29',  price_standalone: '$49'  },
  privacy_notice_global:  { name: 'Global Privacy Notice Generator', url: '/tools/global-privacy-notice',  price_subscriber: '$49',  price_standalone: '$79'  },
  registration_suite:     { name: 'Registration Manager',            url: '/tools/registration',           price_subscriber: '$90',  price_standalone: '$90'  },
};

// Table lookup: maps tool_type to the Supabase table holding the completed row.
// Verified against generate-report-pdf tableMap in the live codebase.
const TABLE_MAP: Record<string, string> = {
  li_assessment:           'li_assessments',
  governance_assessment:   'governance_assessments',
  dpia_framework:          'dpia_frameworks',
  biometric_checker:       'biometric_assessments',
  ir_playbook:             'ir_playbooks',
  dpa_generator:           'dpa_documents',
  cppa_scope:              'cppa_scope_checks',
  cppa_risk:               'cppa_assessments',
  cppa_cybersecurity:      'cppa_assessments',
  registration_assessment: 'registration_assessments',
  registration_document:   'registration_documents',
  brief:                   'custom_briefs',
  rofa:                    'rofa_documents',
  privacy_notice_us:       'privacy_notices',
  privacy_notice_global:   'privacy_notices',
};

// ⚠ Katherine: confirm profiles.subscription_status = 'active' is the correct field.
async function isSubscriber(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('profiles')
      .select('subscription_status').eq('id', userId).maybeSingle();
    return data?.subscription_status === 'active';
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { tool_type, assessment_id, user_id } = await req.json();
    if (!user_id || !tool_type)
      return new Response(JSON.stringify({ error: 'user_id and tool_type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Fetch the row so computeUpsellSignals has field access.
    let row: any = {};
    const table = TABLE_MAP[tool_type];
    if (table && assessment_id) {
      const { data } = await supabase.from(table).select('*').eq('id', assessment_id).maybeSingle();
      if (data) row = data;
    }

    const signals = computeUpsellSignals(tool_type, row);
    if (signals.length === 0)
      return new Response(JSON.stringify({ inserted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const subscriber = await isSubscriber(user_id);
    const cooloffCutoff = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString();

    // Check cooldown for each product.
    const { data: existing } = await supabase
      .from('upsell_events').select('product, last_triggered_at')
      .eq('user_id', user_id).in('product', signals.map(s => s.product));
    const inCooldown = new Set(
      (existing ?? []).filter((e: any) => e.last_triggered_at > cooloffCutoff).map((e: any) => e.product)
    );
    const toProcess = signals.filter(s => !inCooldown.has(s.product));
    if (toProcess.length === 0)
      return new Response(JSON.stringify({ inserted: 0, reason: 'all_within_cooldown' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const now = new Date().toISOString();
    for (const signal of toProcess) {
      await supabase.from('upsell_events').upsert({
        user_id,
        triggered_by_tool: tool_type,
        triggered_by_assessment_id: assessment_id ?? null,
        product: signal.product,
        reason: signal.reason,
        urgency: signal.urgency,
        last_triggered_at: now,
      }, { onConflict: 'user_id,product' });
    }

    // Email: high-urgency only; suppress subscriber-free products for subscribers;
    // never email for cppa_scope (always free).
    const emailSignals = toProcess.filter(s => {
      if (s.product === 'cppa_scope') return false;
      if (subscriber && s.subscriber_free) return false;
      return s.urgency === 'high';
    });

    if (emailSignals.length > 0) {
      const { data: authData } = await supabase.auth.admin
        .getUserById(user_id).catch(() => ({ data: null as any }));
      const userEmail = authData?.user?.email;
      if (userEmail) {
        const siteUrl = Deno.env.get('SITE_URL') ?? 'https://enduserprivacy.com';
        const esc = (t: string) => t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const rows = emailSignals.map(s => {
          const meta = PRODUCT_META[s.product] ?? { name: s.product, url: '/tools', price_subscriber: '', price_standalone: '' };
          const price = subscriber ? meta.price_subscriber : meta.price_standalone;
          return `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
                <strong style="font-size:15px;color:#1e293b;">${esc(meta.name)}</strong>
                ${price ? `<span style="font-size:12px;color:#64748b;margin-left:8px;">${esc(price)}</span>` : ''}
                <p style="margin:6px 0 0;color:#475569;font-size:14px;line-height:1.5;">
                  ${esc(s.reason)}
                </p>
                <a href="${siteUrl}${meta.url}" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#0d2a45;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">
                  Get started →
                </a>
              </td>
            </tr>
          `;
        }).join('');
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width,initial-scale=1" />
              <style>
                body { margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
                .wrap { max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06); }
                .header { padding:28px 32px 20px;background:#0d2a45;color:#fff;text-align:center; }
                .header h1 { margin:0;font-size:18px;font-weight:600; }
                .body { padding:24px 32px 32px; }
                .body p.lead { margin:0 0 16px;color:#475569;font-size:15px;line-height:1.55; }
                table { width:100%;border-collapse:collapse; }
                .footer { padding:20px 32px;background:#f1f5f9;text-align:center;font-size:12px;color:#64748b; }
                .footer a { color:#0d2a45;text-decoration:underline; }
              </style>
            </head>
            <body>
              <div class="wrap">
                <div class="header">
                  <h1>End User Privacy</h1>
                  <p style="margin:6px 0 0;font-size:13px;opacity:.85;">Based on your recent compliance work</p>
                </div>
                <div class="body">
                  <p class="lead">We identified tools relevant to your current programme:</p>
                  <table>
                    <tbody>${rows}</tbody>
                  </table>
                </div>
                <div class="footer">
                  <a href="${siteUrl}/account">Manage preferences</a>
                </div>
              </div>
            </body>
          </html>
        `;
        // ⚠ Katherine: verify RESEND_API_KEY is in Supabase secrets
        // and reports@enduserprivacy.com is a verified Resend sender domain.
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (resendKey) {
          const sendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'End User Privacy <reports@enduserprivacy.com>',
              to: userEmail,
              subject: 'Next steps based on your recent assessment',
              html,
            }),
          });
          if (sendRes.ok) {
            for (const s of emailSignals) {
              await supabase.from('upsell_events')
                .update({ email_sent_at: now })
                .eq('user_id', user_id).eq('product', s.product);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ inserted: toProcess.length, products: toProcess.map(s => s.product) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('trigger-upsell error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
