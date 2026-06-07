
-- P7: convert last_normalised_text to jsonb (existing text values are not valid per-section maps; reset them)
ALTER TABLE public.cppa_source_registry
  ALTER COLUMN last_normalised_text DROP DEFAULT,
  ALTER COLUMN last_normalised_text TYPE jsonb USING NULL;

-- Housekeeping (d): correct rolling effective_date on existing deadline rows
UPDATE public.cppa_deadlines
   SET effective_date = DATE '2026-01-01'
 WHERE effective_date = DATE '2025-10-01';

-- P5: add ADMT deadline row (notice/opt-out/access by Jan 1, 2027)
INSERT INTO public.cppa_deadlines (
  obligation,
  trigger_condition,
  effective_date,
  compliance_deadline,
  revenue_tier,
  topics,
  primary_authority_citation,
  supporting_citations,
  notes,
  status,
  verified_by,
  verified_at
) VALUES (
  'Provide ADMT pre-use notice, opt-out, and access rights for covered automated decisionmaking',
  'Business uses ADMT to make a significant decision concerning a consumer, as defined in 11 CCR § 7001; or uses ADMT for extensive profiling as defined in 11 CCR § 7220',
  DATE '2026-01-01',
  DATE '2027-01-01',
  NULL,
  ARRAY['admt','significant-decision','profiling','pre-use-notice','risk-assessment'],
  '11 CCR § 7220',
  ARRAY['11 CCR § 7001','11 CCR § 7221','11 CCR § 7222'],
  'CPPA final ADMT regulations require businesses to provide a pre-use notice, an opt-out right, and an access right for ADMT used to make a significant decision concerning a consumer or for extensive profiling. Compliance required by January 1, 2027.',
  'current',
  'system-bulk-load',
  CURRENT_DATE
);

-- Housekeeping (a): load Cal. Civ. Code § 1798.81.5 (reasonable-security duty)
INSERT INTO public.cppa_authorities (
  citation,
  authority_type,
  source,
  title,
  full_text,
  plain_summary,
  topics,
  defines_terms,
  binding,
  authority_weight,
  effective_date,
  official_url,
  status,
  verified_by
)
SELECT
  'Cal. Civ. Code § 1798.81.5',
  'statute',
  'CCPA',
  'Reasonable security procedures and practices',
  'Cal. Civ. Code § 1798.81.5 (Reasonable security). (a) It is the intent of the Legislature to ensure that personal information about California residents is protected. To that end, the purpose of this section is to encourage businesses that own, license, or maintain personal information about a Californian to provide reasonable security for that information. (b) A business that owns, licenses, or maintains personal information about a California resident shall implement and maintain reasonable security procedures and practices appropriate to the nature of the information, to protect the personal information from unauthorized access, destruction, use, modification, or disclosure. (c) A business that discloses personal information about a California resident pursuant to a contract with a nonaffiliated third party that is not subject to subdivision (b) shall require by contract that the third party implement and maintain reasonable security procedures and practices appropriate to the nature of the information, to protect the personal information from unauthorized access, destruction, use, modification, or disclosure.',
  'Requires any business that owns, licenses, or maintains personal information about a California resident to implement and maintain reasonable security procedures and practices appropriate to the nature of the information. Also requires businesses that disclose personal information to nonaffiliated third parties under contract to obligate those third parties by contract to do the same.',
  ARRAY['breach','data-retention','contract-requirements','third-party','private-right-of-action'],
  ARRAY[]::text[],
  true,
  100,
  NULL,
  'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.81.5.&lawCode=CIV',
  'current',
  'system-bulk-load'
WHERE NOT EXISTS (
  SELECT 1 FROM public.cppa_authorities
   WHERE citation = 'Cal. Civ. Code § 1798.81.5' AND status = 'current'
);

-- Delete leftover audit test row
DELETE FROM public.cppa_assessments
 WHERE id = '04f31ce6-9f57-4c91-8b74-6341c12ed4a7';
