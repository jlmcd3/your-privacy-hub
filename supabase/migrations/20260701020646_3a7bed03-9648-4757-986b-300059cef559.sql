INSERT INTO public.jurisdiction_requirements (jurisdiction_code, jurisdiction_name, region, law_name, authority_name, authority_url, registration_required, dpo_required, representative_required, notes)
VALUES ('EU', 'European Union', 'EU', 'GDPR (Regulation (EU) 2016/679) + EU AI Act (Regulation (EU) 2024/1689)', 'European Data Protection Board (EDPB)', 'https://edpb.europa.eu', false, false, false, 'EU-wide entry. Registration/notification obligations under GDPR apply at Member-State level; consult the specific national supervisory authority. AI Act registration obligations for high-risk AI systems are administered via the EU database maintained by the Commission.')
ON CONFLICT (jurisdiction_code) DO UPDATE SET
  region = EXCLUDED.region,
  law_name = EXCLUDED.law_name,
  authority_name = COALESCE(public.jurisdiction_requirements.authority_name, EXCLUDED.authority_name),
  authority_url = COALESCE(public.jurisdiction_requirements.authority_url, EXCLUDED.authority_url);