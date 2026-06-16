
-- 2A: UK ICO current fees
UPDATE public.jurisdiction_requirements
SET
  notes = 'Annual ICO data protection fee (current rates effective April 2024): Tier 1 £52 (micro/small, ≤10 staff or turnover ≤£632K; or ≤250 staff and turnover ≤£36M), Tier 2 £78 (medium, ≤250 staff), Tier 3 £3,763 (large, 251+ staff or turnover >£36M). £5 discount for direct debit payment. Exemptions: sole traders, charities, small occupational pension schemes, maintained schools. Confirm tier and exemptions at https://ico.org.uk/for-organisations/data-protection-fee/data-protection-fee/ — fee changes periodically.',
  filing_fee_cents = 5200,
  last_verified_at = now()
WHERE jurisdiction_code = 'UK';

-- 2B: California data broker
UPDATE public.jurisdiction_requirements
SET
  registration_required = true,
  notes = 'California data broker annual registration: required January 1–31 each year via the CPPA''s Data Broker Registration portal (https://cppa.ca.gov/data_broker_registration). Filing fee: $6,600 for the 2026 registration year (11 CCR §7600), payable by credit card with processing fee up to 2.99%. Failure to register is an administrative fine of $100/day. Separate from CCPA/CPRA consumer rights obligations — registration is required even if the data broker does not sell personal information.',
  last_verified_at = now()
WHERE jurisdiction_code = 'US-CA';

-- 2C: Vermont
UPDATE public.jurisdiction_requirements
SET
  jurisdiction_name = 'Vermont (US)',
  law_name = 'Vermont Data Broker Law (9 V.S.A. §2446 et seq.)',
  authority_name = 'Vermont Secretary of State',
  authority_url = 'https://sos.vermont.gov',
  registration_required = true,
  notes = 'Annual data broker registration required with the Vermont Secretary of State between January 1 and January 31 each year. Filing fee: $100. Data brokers must disclose opt-out procedures for Vermont consumers. Statute: 9 V.S.A. §2446 et seq. Portal: https://sos.vermont.gov/corporations/registrations-filings/data-broker-registration/. Penalty: $10,000 per year for failure to register.',
  filing_fee_cents = 10000,
  filing_currency = 'USD',
  filing_portal_url = 'https://sos.vermont.gov/corporations/registrations-filings/data-broker-registration/',
  renewal_period_months = 12,
  last_verified_at = now()
WHERE jurisdiction_code = 'US-VT';

-- 2C: Texas
UPDATE public.jurisdiction_requirements
SET
  jurisdiction_name = 'Texas (US)',
  law_name = 'Texas Data Broker Law (Tex. Bus. & Com. Code Ch. 510)',
  authority_name = 'Texas Secretary of State',
  authority_url = 'https://www.sos.state.tx.us',
  registration_required = true,
  notes = 'Annual data broker registration required with the Texas Secretary of State under Chapter 510, Texas Business and Commerce Code (eff. September 1, 2023). Filing fee: $300. Data brokers must disclose collection practices and opt-out mechanisms for Texans. Portal: https://www.sos.state.tx.us/statdoc/data-brokers.shtml. Penalty: civil penalty up to $10,000 per violation per year.',
  filing_fee_cents = 30000,
  filing_currency = 'USD',
  filing_portal_url = 'https://www.sos.state.tx.us/statdoc/data-brokers.shtml',
  renewal_period_months = 12,
  last_verified_at = now()
WHERE jurisdiction_code = 'US-TX';

-- 2C: Oregon
UPDATE public.jurisdiction_requirements
SET
  jurisdiction_name = 'Oregon (US)',
  law_name = 'Oregon Consumer Privacy Act + Data Broker Registry (Or. Rev. Stat. §646A.570 et seq.)',
  authority_name = 'Oregon Department of Financial Regulation (DFR)',
  authority_url = 'https://dfr.oregon.gov',
  registration_required = true,
  notes = 'Annual data broker registration required with the Oregon Department of Financial Regulation under the Oregon Consumer Privacy Act data broker provisions (Or. Rev. Stat. §646A.570 et seq., eff. July 1, 2024). Annual renewal fee: $600. Data brokers must maintain a privacy policy accessible to Oregon consumers. Portal: https://dfr.oregon.gov/business/register/Pages/data-brokers.aspx. Verify current fee and requirements at the DFR portal before filing.',
  filing_fee_cents = 60000,
  filing_currency = 'USD',
  filing_portal_url = 'https://dfr.oregon.gov/business/register/Pages/data-brokers.aspx',
  renewal_period_months = 12,
  last_verified_at = now()
WHERE jurisdiction_code = 'US-OR';

-- 3A: EU market row — AI registration flag corrected
UPDATE public.jurisdiction_requirements
SET
  ai_registration_required = false,
  notes = COALESCE(notes, '') || ' EU AI Act (Regulation (EU) 2024/1689) Article 49 database registration applies only to providers of high-risk AI systems (Annex III) and providers of general-purpose AI models (Chapter V). Controllers and processors who use third-party AI tools but are not themselves AI system providers or GPAI providers are not subject to Article 49 registration.',
  last_verified_at = now()
WHERE jurisdiction_code = 'EU';
