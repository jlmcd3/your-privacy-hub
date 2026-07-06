ALTER TABLE cppa_authorities DROP CONSTRAINT cppa_authorities_source_check;
ALTER TABLE cppa_authorities ADD CONSTRAINT cppa_authorities_source_check CHECK (source = ANY (ARRAY['CCPA'::text, 'CPPA_REGS'::text, 'CPPA_GUIDANCE'::text, 'CA_IOT'::text, 'CA_BREACH'::text]));
UPDATE cppa_authorities SET source = 'CA_BREACH' WHERE citation = 'Cal. Civ. Code § 1798.82';