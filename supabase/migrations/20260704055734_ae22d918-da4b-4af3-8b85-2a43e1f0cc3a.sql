
UPDATE jurisdiction_requirements
SET notes = replace(notes,
  'BDSG §38 sets a lower DPO threshold than GDPR Article 37(1): mandatory where at least 20 persons are constantly engaged in automated processing of personal data (plain headcount), plus DPIA-subject and commercial-transfer triggers that apply regardless of headcount. GDPR Article 37(1) itself uses activity-based triggers, not an employee count.',
  'BDSG §38 adds jurisdiction-specific DPO triggers beyond GDPR Article 37(1): a 20-person threshold counting persons constantly engaged in automated processing of personal data (not total employee count), plus DPIA-subject and commercial-transfer triggers that apply regardless of headcount. GDPR Article 37(1) itself uses activity-based triggers, not an employee count.')
WHERE jurisdiction_code = 'DE';

UPDATE jurisdiction_requirements
SET notes = replace(notes,
  'Tier 3 £3,763 (large organisations: turnover >£36M and >250 staff; tier-3 amount effective Feb 2025)',
  'Tier 3 £3,763 (last confirmed Feb 2025; verify current amount at the ICO portal)')
WHERE jurisdiction_code = 'UK';
