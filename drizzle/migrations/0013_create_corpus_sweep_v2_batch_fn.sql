CREATE OR REPLACE FUNCTION public.corpus_sweep_v2_batch(p_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_count integer;
BEGIN
  WITH todo AS (
    SELECT e.id FROM public.enforcement_actions e
    WHERE NOT EXISTS (
      SELECT 1 FROM public.corpus_sweep_v2 s
      WHERE s.action_id = e.id AND s.sweep_version = 'sweep-v2-2026-09-07'
    )
    ORDER BY e.id
    LIMIT p_limit
  ), base AS (
    SELECT
      e.id, e.subject, e.regulator, e.regulator_canonical, e.jurisdiction, e.law, e.violation,
      e.decision_date, e.fine_amount, e.fine_eur, e.source_url, e.primary_source_url,
      e.source_database, e.action_type, e.instrument_class, e.authority_class, e.source_type,
      e.matter_type, e.appeal_status, e.verification_status, e.source_document_hash,
      lower(concat_ws(' ', e.subject, e.violation, e.law, e.action_type,
        left(COALESCE(NULLIF(e.source_document_text,''), NULLIF(e.raw_text,''), NULLIF(e.legacy_summary_text,''),''), 12000))) AS hay,
      length(COALESCE(NULLIF(e.source_document_text,''), NULLIF(e.raw_text,''), NULLIF(e.legacy_summary_text,''), '')) AS text_len,
      lower(COALESCE(e.source_url, e.primary_source_url, '')) AS url
    FROM public.enforcement_actions e
    JOIN todo t ON t.id = e.id
  ), calc AS (
    SELECT b.*,
      (b.subject IS NOT NULL AND btrim(b.subject) <> '') AS has_subject,
      (b.decision_date IS NOT NULL) AS has_date,
      (b.fine_eur IS NOT NULL OR NULLIF(btrim(COALESCE(b.fine_amount,'')),'') IS NOT NULL) AS has_fine,
      (b.url ~ '\.(jpg|jpeg|png|gif|svg|webp|css|js|woff2?|ttf|eot|ico|zip|mp4)(\?|$)') AS is_asset,
      (b.url ~ '(cookie|privacy-policy|privacy-notice|sitemap|/about|accessibility|terms-of|/contact)') AS is_boilerplate
    FROM base b
  ), cls AS (
    SELECT c.*,
      CASE
        WHEN c.is_asset THEN 'junk_asset'
        WHEN c.is_boilerplate THEN 'site_boilerplate'
        WHEN c.matter_type = 'litigation' THEN 'litigation_matter'
        WHEN c.authority_class = 'court' THEN 'court_judgment'
        WHEN c.hay ~ '(public consultation|draft for consultation|consultation draft|open for comment)' THEN 'consultation_draft'
        WHEN c.instrument_class = 'guidance' OR c.url ~ '(guidance|guidelines|toolkit|/faq|code-of-practice)' THEN 'regulator_guidance'
        WHEN c.instrument_class = 'open_investigation' THEN 'enforcement_procedural'
        WHEN c.instrument_class = 'final_enforcement_decision' THEN 'enforcement_decision'
        WHEN c.hay ~ '(data breach notification|breach report|notification of a breach)' AND NOT c.has_fine THEN 'breach_notification'
        WHEN c.instrument_class = 'press_summary' OR c.source_type IN ('regulator_press','third_party_commentary') OR c.source_database ILIKE '%news%' THEN 'news_or_press'
        WHEN c.regulator IS NOT NULL AND (c.has_fine OR c.has_date) AND c.text_len >= 200 THEN 'enforcement_decision'
        WHEN c.text_len < 200 THEN 'insufficient_content'
        ELSE 'unclassified_document'
      END AS record_class
    FROM calc c
  ), tagged AS (
    SELECT s.*,
      (ARRAY[]::text[]
        || CASE WHEN s.hay ~ '(legitimate interest|legittimo interesse|inter[eé]s leg[ií]timo|interes legitim|berechtigtes interesse|art[a-z. ]*6\(1\)\(f\))' THEN ARRAY['legitimate_interests'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(consent|consentement|consenso|einwilligung)' THEN ARRAY['consent'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(transparen|information notice|privacy notice|article 13|article 14)' THEN ARRAY['transparency'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(data minimi|excessive personal data)' THEN ARRAY['data_minimisation'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(article 32|security of processing|technical and organisational measures|encryption)' THEN ARRAY['security_art32'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(personal data breach|breach notification|article 33|article 34|ransomware)' THEN ARRAY['breach_notification'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(subject access|right of access|right to erasure|data subject request|article 15|article 17)' THEN ARRAY['dsar_rights'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(international transfer|third country|standard contractual clauses|schrems)' THEN ARRAY['international_transfers'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(direct marketing|pecr|telemarketing|unsolicited)' THEN ARRAY['direct_marketing_pecr'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(cookie|tracking pixel|tracker)' THEN ARRAY['cookies_tracking'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(profiling|behavioural advertis|behavioral advertis|adtech|real-time bidding)' THEN ARRAY['adtech_profiling'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(automated decision|artificial intelligence|algorithm|admt|machine learning)' THEN ARRAY['admt_ai'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(biometric|facial recognition|fingerprint|bipa)' THEN ARRAY['biometrics'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(child|minor|under 18|teen)' THEN ARRAY['children'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(employee monitoring|workplace surveillance|worker monitoring|staff monitoring)' THEN ARRAY['employee_monitoring'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(special categor|article 9|health data|sensitive personal data)' THEN ARRAY['special_category'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(data protection officer|governance framework)' THEN ARRAY['dpo_governance'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(record of processing|article 30|ropa)' THEN ARRAY['ropa_records'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(data protection impact assessment|article 35|dpia)' THEN ARRAY['dpia_required'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(processor|article 28|data processing agreement)' THEN ARRAY['processor_contracts'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(retention period|storage limitation|kept for longer)' THEN ARRAY['retention'] ELSE '{}' END
        || CASE WHEN s.hay ~ '(credit reference|credit scoring|fraud prevention|credit bureau)' THEN ARRAY['credit_fraud_scoring'] ELSE '{}' END
      ) AS topic_tags
    FROM cls s
  )
  INSERT INTO public.corpus_sweep_v2 (
    action_id, record_class, usable_for, authority_tier, settledness, citability,
    topic_tags, li_relevance, li_factor_tags, li_posture,
    regulator_canonical, jurisdiction_code, forum, source_type, language_original, translation_state,
    content_score, text_len, has_subject, has_date, has_fine, has_source_document, has_source_hash,
    pin_ready, dedupe_signature, confidence, tagged_by, needs_ai_review, review_state, evidence
  )
  SELECT
    t.id, t.record_class,
    (ARRAY[]::text[]
      || CASE WHEN t.record_class = 'enforcement_decision' AND t.has_subject THEN ARRAY['enforcement_database'] ELSE '{}' END
      || CASE WHEN t.record_class IN ('enforcement_decision','court_judgment') AND 'legitimate_interests' = ANY(t.topic_tags) THEN ARRAY['li_precedent_candidate'] ELSE '{}' END
      || CASE WHEN t.record_class = 'regulator_guidance' THEN ARRAY['guidance_corpus','authority_rules_source'] ELSE '{}' END
      || CASE WHEN t.record_class IN ('news_or_press','enforcement_procedural') THEN ARRAY['news_digest','weekly_brief','training_context_only'] ELSE '{}' END
      || CASE WHEN t.record_class = 'breach_notification' THEN ARRAY['breach_intelligence'] ELSE '{}' END
      || CASE WHEN t.record_class = 'litigation_matter' THEN ARRAY['litigation_watch'] ELSE '{}' END
      || CASE WHEN t.record_class = 'legislation_or_provision' THEN ARRAY['legislation_tracker'] ELSE '{}' END
      || CASE WHEN t.record_class IN ('junk_asset','site_boilerplate','insufficient_content') THEN ARRAY['discard'] ELSE '{}' END
      || CASE WHEN t.record_class = 'unclassified_document' OR (t.record_class = 'enforcement_decision' AND NOT t.has_subject) THEN ARRAY['needs_triage'] ELSE '{}' END
    ),
    CASE
      WHEN t.record_class IN ('enforcement_decision','court_judgment') THEN 'binding'
      WHEN t.record_class = 'regulator_guidance' THEN 'guidance'
      WHEN t.record_class IN ('news_or_press','site_boilerplate','junk_asset','insufficient_content') THEN 'non_authority'
      ELSE 'persuasive'
    END,
    CASE
      WHEN t.record_class = 'consultation_draft' THEN 'consultation_draft'
      WHEN t.appeal_status = 'appeal_pending' THEN 'under_appeal'
      WHEN t.appeal_status = 'vacated' THEN 'annulled'
      WHEN t.appeal_status IN ('final','affirmed') THEN 'final'
      WHEN t.record_class IN ('enforcement_decision','court_judgment') THEN 'final'
      ELSE 'unknown'
    END,
    CASE
      WHEN t.record_class IN ('junk_asset','site_boilerplate','insufficient_content','news_or_press') THEN 'not_citable'
      WHEN t.text_len >= 400 AND t.source_document_hash IS NOT NULL AND COALESCE(t.source_url, t.primary_source_url) IS NOT NULL THEN 'citable_verbatim'
      ELSE 'citable_summary_only'
    END,
    t.topic_tags,
    CASE
      WHEN 'legitimate_interests' = ANY(t.topic_tags) THEN 'direct'
      WHEN t.hay ~ '(balanc|reasonable expectation|necess|less intrusive|proportionat)' THEN 'adjacent'
      ELSE 'none'
    END,
    (ARRAY[]::text[]
      || CASE WHEN t.hay ~ '(legitimate aim|legitimate purpose)' THEN ARRAY['purpose_legitimacy'] ELSE '{}' END
      || CASE WHEN t.hay ~ 'necess' THEN ARRAY['necessity'] ELSE '{}' END
      || CASE WHEN t.hay ~ 'balanc' THEN ARRAY['balancing'] ELSE '{}' END
      || CASE WHEN t.hay ~ 'reasonable expectation' THEN ARRAY['reasonable_expectations'] ELSE '{}' END
      || CASE WHEN t.hay ~ 'less intrusive' THEN ARRAY['less_intrusive_means'] ELSE '{}' END
      || CASE WHEN t.hay ~ 'safeguard' THEN ARRAY['safeguards'] ELSE '{}' END
      || CASE WHEN t.hay ~ '(opt-out|opt out|right to object)' THEN ARRAY['opt_out'] ELSE '{}' END
      || CASE WHEN t.hay ~ '(child|vulnerab)' THEN ARRAY['children_vulnerability'] ELSE '{}' END
      || CASE WHEN t.hay ~ '(special categor|article 9)' THEN ARRAY['special_category_bar'] ELSE '{}' END
    ),
    CASE
      WHEN NOT ('legitimate_interests' = ANY(t.topic_tags)) THEN 'not_reached'
      WHEN t.hay ~ '(cannot rely on legitimate interest|could not rely on legitimate interest|no legitimate interest)' THEN 'rejected'
      WHEN t.hay ~ '(may rely on legitimate interest)' THEN 'upheld'
      ELSE 'not_reached'
    END,
    COALESCE(t.regulator_canonical, t.regulator),
    CASE
      WHEN t.jurisdiction ILIKE 'UK%' OR t.jurisdiction ILIKE 'United Kingdom%' THEN 'UK_GDPR'
      WHEN t.jurisdiction = 'California' THEN 'US_CA'
      WHEN t.jurisdiction ILIKE 'United States%' THEN 'US_FED'
      WHEN t.jurisdiction IN ('Canada','Alberta','Ontario','Quebec') THEN 'CA'
      WHEN t.jurisdiction IS NULL THEN 'unknown'
      WHEN t.law ILIKE '%GDPR%' OR t.jurisdiction ILIKE 'EU%' THEN 'EU_GDPR'
      ELSE upper(regexp_replace(t.jurisdiction, '[^A-Za-z]+', '_', 'g'))
    END,
    CASE
      WHEN t.authority_class = 'court' THEN 'court'
      WHEN t.record_class = 'legislation_or_provision' THEN 'legislature'
      WHEN t.source_type = 'third_party_commentary' THEN 'media'
      WHEN t.regulator IS NOT NULL THEN 'regulator'
      ELSE 'industry'
    END,
    COALESCE(t.source_type, CASE WHEN t.source_database IN ('CMS','GDPRhub') THEN 'aggregator' ELSE 'unknown' END),
    CASE
      WHEN t.jurisdiction IN ('Spain','Catalonia') THEN 'es'
      WHEN t.jurisdiction = 'Italy' THEN 'it'
      WHEN t.jurisdiction = 'Poland' THEN 'pl'
      WHEN t.jurisdiction = 'Romania' THEN 'ro'
      WHEN t.jurisdiction IN ('Germany','Austria') THEN 'de'
      WHEN t.jurisdiction = 'France' THEN 'fr'
      ELSE 'en'
    END,
    CASE WHEN t.jurisdiction IN ('Spain','Catalonia','Italy','Poland','Romania','Germany','Austria','France')
      THEN 'untranslated' ELSE 'english_native' END,
    LEAST(100, GREATEST(0,
        (CASE WHEN t.text_len >= 4000 THEN 40 WHEN t.text_len >= 1200 THEN 30 WHEN t.text_len >= 400 THEN 20 WHEN t.text_len >= 200 THEN 10 ELSE 0 END)
      + (CASE WHEN t.has_subject THEN 20 ELSE 0 END)
      + (CASE WHEN t.has_date THEN 10 ELSE 0 END)
      + (CASE WHEN t.has_fine THEN 10 ELSE 0 END)
      + (CASE WHEN t.source_document_hash IS NOT NULL THEN 10 ELSE 0 END)
      + (CASE WHEN COALESCE(t.source_url, t.primary_source_url) IS NOT NULL THEN 10 ELSE 0 END)
    ))::smallint,
    t.text_len, t.has_subject, t.has_date, t.has_fine,
    (t.text_len >= 400), (t.source_document_hash IS NOT NULL),
    (t.text_len >= 400 AND t.source_document_hash IS NOT NULL AND COALESCE(t.source_url, t.primary_source_url) IS NOT NULL),
    md5(concat_ws('|', lower(COALESCE(t.regulator_canonical, t.regulator, '')), lower(COALESCE(t.subject,'')),
                  COALESCE(t.decision_date::text,''), COALESCE(t.fine_eur::text,''))),
    CASE WHEN t.record_class IN ('junk_asset','site_boilerplate','insufficient_content') THEN 1.0
         WHEN t.record_class = 'unclassified_document' THEN 0.30
         WHEN NOT t.has_subject THEN 0.60 ELSE 0.85 END,
    'deterministic',
    (t.record_class = 'unclassified_document'
      OR (t.record_class NOT IN ('junk_asset','site_boilerplate','insufficient_content') AND NOT t.has_subject)),
    'auto_tagged',
    jsonb_build_object(
      'source_database', t.source_database,
      'instrument_class', t.instrument_class,
      'authority_class', t.authority_class,
      'verification_status', t.verification_status,
      'url', left(t.url, 300)
    )
  FROM tagged t
  ON CONFLICT (action_id, sweep_version) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;

REVOKE ALL ON FUNCTION public.corpus_sweep_v2_batch(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.corpus_sweep_v2_batch(integer) TO service_role;