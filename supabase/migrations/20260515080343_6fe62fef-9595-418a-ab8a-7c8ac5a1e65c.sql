create table public.research_syntheses (
  id               uuid        primary key default gen_random_uuid(),
  section_key      text        not null unique,
  page_slug        text        not null,
  section_heading  text        not null,
  synthesis_text   text,
  model_used       text        not null default 'claude-haiku-4-5-20251001',
  article_ids_used jsonb       not null default '[]',
  article_count    integer     not null default 0,
  topic_filters    jsonb       not null default '{}',
  generated_at     timestamptz,
  valid_until      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index research_syntheses_page_slug_idx  on public.research_syntheses(page_slug);
create index research_syntheses_valid_until_idx on public.research_syntheses(valid_until);

alter table public.research_syntheses enable row level security;

create policy "Research syntheses publicly readable"
  on public.research_syntheses for select
  to anon, authenticated
  using (true);

create policy "Service role full access to research_syntheses"
  on public.research_syntheses for all
  to service_role
  using (true)
  with check (true);

create or replace function public.set_research_syntheses_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger research_syntheses_updated_at
  before update on public.research_syntheses
  for each row execute function public.set_research_syntheses_updated_at();

insert into public.research_syntheses
  (section_key, page_slug, section_heading, model_used, topic_filters)
values
  ('us_privacy__page',              'us-privacy-laws',   'U.S. Privacy Laws — Page Overview',                    'claude-sonnet-4-20250514',      '{"categories":["us-federal","us-states"],"tags":[]}'),
  ('us_privacy__federal',           'us-privacy-laws',   'Federal Privacy Regulators',                           'claude-haiku-4-5-20251001', '{"categories":["us-federal"],"tags":["ftc","federal"]}'),
  ('us_privacy__state_directory',   'us-privacy-laws',   'U.S. State Privacy Laws',                              'claude-haiku-4-5-20251001', '{"categories":["us-states"],"tags":["state-law"]}'),
  ('us_privacy__legislation',       'us-privacy-laws',   'Federal Privacy Legislation in Progress',              'claude-haiku-4-5-20251001', '{"categories":["us-federal"],"tags":["congress","legislation"]}'),
  ('gdpr__page',                    'gdpr-enforcement',  'GDPR & UK Privacy — Page Overview',                    'claude-sonnet-4-20250514',      '{"categories":["eu-uk"],"tags":[]}'),
  ('gdpr__framework',               'gdpr-enforcement',  'The GDPR Regulatory Framework',                        'claude-haiku-4-5-20251001', '{"categories":["eu-uk"],"tags":["gdpr","edpb","framework"]}'),
  ('gdpr__enforcement_actions',     'gdpr-enforcement',  'GDPR Enforcement — Fines and Precedent',               'claude-haiku-4-5-20251001', '{"categories":["eu-uk","enforcement"],"tags":["gdpr","enforcement","dpa-fine"]}'),
  ('gdpr__uk_privacy',              'gdpr-enforcement',  'UK GDPR and the Data Protection Act 2018',             'claude-haiku-4-5-20251001', '{"categories":["eu-uk"],"tags":["ico","uk-gdpr","uk"]}'),
  ('gdpr__legitimate_interest',     'gdpr-enforcement',  'Legitimate Interest Under GDPR & UK GDPR',             'claude-haiku-4-5-20251001', '{"categories":["eu-uk"],"tags":["legitimate-interest","article-6f"]}'),
  ('global__page',                  'global-privacy-laws','Global Privacy Laws — Page Overview',                 'claude-sonnet-4-20250514',      '{"categories":["global"],"tags":[]}'),
  ('global__apac',                  'global-privacy-laws','Asia-Pacific Data Protection Laws',                   'claude-haiku-4-5-20251001', '{"categories":["global"],"tags":["apac","china-pipl","india-dpdp","japan","singapore"]}'),
  ('global__latam',                 'global-privacy-laws','Latin American Privacy Frameworks',                   'claude-haiku-4-5-20251001', '{"categories":["global"],"tags":["latam","lgpd","brazil","mexico"]}'),
  ('global__mea',                   'global-privacy-laws','Middle East and Africa',                              'claude-haiku-4-5-20251001', '{"categories":["global"],"tags":["middle-east","africa","popia","uae"]}'),
  ('global__enforcement',           'global-privacy-laws','Global Privacy Enforcement — Key Cases',              'claude-haiku-4-5-20251001', '{"categories":["global","enforcement"],"tags":["global","enforcement"]}'),
  ('ai_privacy__page',              'ai-privacy-regulations','AI Privacy Regulations — Page Overview',           'claude-sonnet-4-20250514',      '{"categories":["ai-privacy"],"tags":[]}'),
  ('ai_privacy__eu_ai_act',         'ai-privacy-regulations','The EU AI Act — Structure and Obligations',        'claude-haiku-4-5-20251001', '{"categories":["ai-privacy","eu-uk"],"tags":["eu-ai-act","high-risk-ai","gpai"]}'),
  ('ai_privacy__gdpr_ai',           'ai-privacy-regulations','GDPR and AI — Training Data and Automated Decisions','claude-haiku-4-5-20251001','{"categories":["ai-privacy","eu-uk"],"tags":["gdpr-ai","ai-training-data","article-22"]}'),
  ('ai_privacy__cppa_admt',         'ai-privacy-regulations','California CPPA — Automated Decision-Making Rules','claude-haiku-4-5-20251001', '{"categories":["ai-privacy","us-states"],"tags":["cppa","admt","california-ai"]}'),
  ('ai_privacy__national',          'ai-privacy-regulations','National AI Governance Frameworks',                'claude-haiku-4-5-20251001', '{"categories":["ai-privacy","global"],"tags":["global-ai","uk-ai","canada-aida"]}'),
  ('ai_privacy__enforcement',       'ai-privacy-regulations','AI Privacy Enforcement — Cases and Precedents',   'claude-haiku-4-5-20251001', '{"categories":["ai-privacy","enforcement"],"tags":["ai-enforcement"]}'),
  ('legislation__page',             'legislation-tracker','Privacy Legislation — Page Overview',                 'claude-sonnet-4-20250514',      '{"categories":["us-federal","us-states","eu-uk","global"],"tags":["legislation"]}'),
  ('legislation__us_federal',       'legislation-tracker','U.S. Federal Privacy Legislation',                    'claude-haiku-4-5-20251001', '{"categories":["us-federal"],"tags":["congress","federal-legislation","apra"]}'),
  ('legislation__us_states',        'legislation-tracker','U.S. State Privacy Legislation in Progress',          'claude-haiku-4-5-20251001', '{"categories":["us-states"],"tags":["state-legislation","pending"]}'),
  ('legislation__eu_uk',            'legislation-tracker','European Privacy and AI Legislation',                  'claude-haiku-4-5-20251001', '{"categories":["eu-uk"],"tags":["eu-legislation","eu-ai-act","eprivacy","uk-dua"]}'),
  ('legislation__global',           'legislation-tracker','Global Privacy Legislation',                           'claude-haiku-4-5-20251001', '{"categories":["global"],"tags":["global-legislation"]}'),
  ('crossborder__page',             'cross-border-transfers','Cross-Border Transfers — Page Overview',           'claude-sonnet-4-20250514',      '{"categories":["eu-uk","global"],"tags":["cross-border-transfers"]}'),
  ('crossborder__eu_mechanisms',    'cross-border-transfers','EU/EEA Transfer Mechanisms — GDPR Chapter V',      'claude-haiku-4-5-20251001', '{"categories":["eu-uk"],"tags":["adequacy-decisions","gdpr-chapter-v","scc","bcr"]}'),
  ('crossborder__dpf',              'cross-border-transfers','EU-U.S. Data Privacy Framework',                   'claude-haiku-4-5-20251001', '{"categories":["eu-uk","us-federal"],"tags":["data-privacy-framework","dpf","schrems"]}'),
  ('crossborder__tia',              'cross-border-transfers','Transfer Impact Assessments',                       'claude-haiku-4-5-20251001', '{"categories":["eu-uk"],"tags":["tia","transfer-impact-assessment"]}'),
  ('crossborder__apac',             'cross-border-transfers','Asia-Pacific Transfer Frameworks',                  'claude-haiku-4-5-20251001', '{"categories":["global"],"tags":["apac-transfers","china-pipl","india-transfers"]}'),
  ('crossborder__enforcement',      'cross-border-transfers','Cross-Border Transfer Enforcement',                 'claude-haiku-4-5-20251001', '{"categories":["eu-uk","enforcement"],"tags":["transfer-enforcement"]}'),
  ('biometric__page',               'biometric-privacy', 'Biometric Privacy — Page Overview',                    'claude-sonnet-4-20250514',      '{"categories":["us-states","eu-uk","enforcement"],"tags":["biometric","bipa","facial-recognition"]}'),
  ('biometric__bipa',               'biometric-privacy', 'Illinois BIPA — The Strictest Biometric Privacy Law',  'claude-haiku-4-5-20251001', '{"categories":["us-states","enforcement"],"tags":["bipa","bipa-litigation"]}'),
  ('biometric__state_laws',         'biometric-privacy', 'State Biometric Privacy Laws — Texas, Washington and Beyond','claude-haiku-4-5-20251001','{"categories":["us-states"],"tags":["state-biometric","texas-biometric"]}'),
  ('biometric__gdpr_eu',            'biometric-privacy', 'GDPR Article 9 and EU AI Act — Biometric Data in Europe','claude-haiku-4-5-20251001','{"categories":["eu-uk"],"tags":["gdpr-biometric","eu-ai-act-biometric"]}'),
  ('biometric__workplace',          'biometric-privacy', 'Workplace Biometric Use',                              'claude-haiku-4-5-20251001', '{"categories":["us-federal","us-states"],"tags":["workplace-biometric"]}'),
  ('biometric__enforcement',        'biometric-privacy', 'Biometric Enforcement — Settlements and Verdicts',     'claude-haiku-4-5-20251001', '{"categories":["enforcement"],"tags":["biometric-enforcement"]}'),
  ('health__page',                  'health-data-privacy','Health Data Privacy — Page Overview',                 'claude-sonnet-4-20250514',      '{"categories":["us-federal","us-states"],"tags":["health","hipaa","health-data"]}'),
  ('health__hipaa',                 'health-data-privacy','HIPAA — The Federal Foundation for Health Privacy',   'claude-haiku-4-5-20251001', '{"categories":["us-federal"],"tags":["hipaa","hhs-ocr"]}'),
  ('health__ftc_hbr',               'health-data-privacy','FTC Health Breach Notification Rule',                 'claude-haiku-4-5-20251001', '{"categories":["us-federal"],"tags":["ftc-health","health-breach-rule"]}'),
  ('health__state_laws',            'health-data-privacy','State Consumer Health Data Laws',                     'claude-haiku-4-5-20251001', '{"categories":["us-states"],"tags":["state-health-laws","mhmda","reproductive-health"]}'),
  ('health__ai',                    'health-data-privacy','AI and Health Data — Emerging Obligations',           'claude-haiku-4-5-20251001', '{"categories":["ai-privacy","us-states"],"tags":["ai-health","health-ai"]}'),
  ('health__enforcement',           'health-data-privacy','Health Data Breach Enforcement — Key Cases',          'claude-haiku-4-5-20251001', '{"categories":["enforcement","us-federal"],"tags":["health-enforcement","hipaa-enforcement"]}'),
  ('cookie__page',                  'cookie-consent',    'Cookie Consent — Page Overview',                       'claude-sonnet-4-20250514',      '{"categories":["eu-uk","us-states"],"tags":["cookie-consent","tracking"]}'),
  ('cookie__gdpr_eprivacy',         'cookie-consent',    'Cookie Consent Under GDPR and the ePrivacy Directive', 'claude-haiku-4-5-20251001', '{"categories":["eu-uk"],"tags":["gdpr-cookies","eprivacy","cmp","tcf"]}'),
  ('cookie__us_tracking',           'cookie-consent',    'U.S. Cookie and Online Tracking Consent Requirements', 'claude-haiku-4-5-20251001', '{"categories":["us-states","us-federal"],"tags":["cpra-cookies","gpc","us-tracking"]}'),
  ('cookie__enforcement',           'cookie-consent',    'Cookie Enforcement — DPA Actions and Fines',           'claude-haiku-4-5-20251001', '{"categories":["eu-uk","enforcement"],"tags":["cookie-enforcement"]}'),
  ('breach__page',                  'breach-notification','Breach Notification — Page Overview',                 'claude-sonnet-4-20250514',      '{"categories":["us-federal","us-states","eu-uk"],"tags":["breach","data-breach"]}'),
  ('breach__gdpr',                  'breach-notification','GDPR Breach Notification — Articles 33 and 34',       'claude-haiku-4-5-20251001', '{"categories":["eu-uk"],"tags":["gdpr-breach","articles-33-34"]}'),
  ('breach__us_states',             'breach-notification','U.S. State Breach Notification Laws',                 'claude-haiku-4-5-20251001', '{"categories":["us-states"],"tags":["us-breach-notification","state-breach"]}'),
  ('breach__sector_specific',       'breach-notification','Sector-Specific U.S. Breach Requirements',            'claude-haiku-4-5-20251001', '{"categories":["us-federal"],"tags":["hipaa-breach","sec-disclosure","glba-breach"]}'),
  ('breach__international',         'breach-notification','International Breach Notification',                    'claude-haiku-4-5-20251001', '{"categories":["global"],"tags":["international-breach"]}');