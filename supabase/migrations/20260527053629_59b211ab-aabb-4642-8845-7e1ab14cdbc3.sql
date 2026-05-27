
-- Stage 3: P1 regulator profiles (11). All ON CONFLICT upsert for idempotency.

INSERT INTO public.regulator_profiles VALUES (
  'Agencia Española de Protección de Datos (AEPD)','1.0','Spain',
  ARRAY['gdpr','lopdgdd'],'GDPR','es',
  ARRAY['DD/MM/YYYY','D/M/YYYY'],'PS[/-]\d{5}[/-]\d{4}|EXP\d{9}','EUR','browser_first',3000,false,true,
  '[{"method":"paginated_browse","name":"AEPD resolutions listing","base_url":"https://www.aepd.es/es/informes-y-resoluciones/resoluciones","url_pattern":"?page={N}&sort=created&order=desc","format":"html","list_selector":"article.node--type-resolucion a[href*=\"/documento/\"]","document_format":"pdf"},{"method":"rss_check","name":"AEPD news RSS","base_url":"https://www.aepd.es/rss","format":"rss"}]'::jsonb,
  '{"case_reference":{"method":"regex","pattern":"PS[/-]\\d{5}[/-]\\d{4}|EXP\\d{9}","required":true},"decision_date":{"method":"regex","pattern":"\\d{1,2}/\\d{1,2}/\\d{4}","required":true},"subject":{"method":"regex","pattern":"(?:contra\\s+|a\\s+)([A-ZÁÉÍÓÚÑ][^,\\.\\n]{3,80})","required":true},"fine_amount_local":{"method":"regex","pattern":"(\\d[\\d.,]+)\\s*(?:€|euros?)","required":false},"fine_currency":{"method":"profile_default","value":"EUR"},"statutory_provisions":{"method":"regex","pattern":"art(?:ículo|\\.)?\\s*\\d+[^;,.]{0,50}(?:RGPD|LOPDGDD|RLOPD)","required":false,"multiple":true},"key_compliance_failure":{"method":"llm_verbatim","language":"es","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','excellent',
  ARRAY['Requires browser UA','Case ID format changed circa 2022','Spanish citation: artículo N apartado M letra X del RGPD'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();

INSERT INTO public.regulator_profiles VALUES (
  'Urząd Ochrony Danych Osobowych (UODO)','1.0','Poland',ARRAY['gdpr'],'GDPR','pl',
  ARRAY['DD.MM.YYYY','D.M.YYYY'],'ZSOO\.\d+\.\d+\.\d{4}|DKN\.\d+\.\d+\.\d{4}','PLN','browser_first',2000,false,true,
  '[{"method":"html_browse","name":"UODO Polish decisions","base_url":"https://uodo.gov.pl/pl/138","format":"html"},{"method":"html_browse","name":"UODO English digest","base_url":"https://uodo.gov.pl/en/553","format":"html"}]'::jsonb,
  '{"case_reference":{"method":"regex","pattern":"(?:ZSOO|DKN|DS)\\.\\d+\\.\\d+\\.\\d{4}","required":false},"decision_date":{"method":"regex","pattern":"\\d{1,2}\\.\\d{1,2}\\.\\d{4}","required":true},"subject":{"method":"css_selector","pattern":"h1, .node-title","required":true},"fine_amount_local":{"method":"regex","pattern":"(\\d[\\d\\s]+)\\s*(?:zł|PLN|złotych)","required":false},"fine_currency":{"method":"profile_default","value":"PLN"},"statutory_provisions":{"method":"regex","pattern":"art\\.\\s*\\d+\\s+(?:ust\\.\\s*\\d+\\s*)?(?:lit\\.\\s*[a-z]\\s*)?(?:RODO|rozporządzenia)","required":false,"multiple":true},"key_compliance_failure":{"method":"llm_verbatim","language":"pl","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','partial',
  ARRAY['Publishes ~30 major fines/year','Polish citation: art. N ust. M lit. X RODO'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();

INSERT INTO public.regulator_profiles VALUES (
  'Garante per la protezione dei dati personali','1.0','Italy',ARRAY['gdpr'],'GDPR','it',
  ARRAY['DD/MM/YYYY','D MMMM YYYY'],'\d{7,9}','EUR','browser_first',3000,false,true,
  '[{"method":"html_browse","name":"Garante English main decisions","base_url":"https://www.garanteprivacy.it/web/garante-privacy-en/main-decisions","format":"html"},{"method":"html_browse","name":"Garante Italian provvedimenti","base_url":"https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/","format":"html"}]'::jsonb,
  '{"case_reference":{"method":"regex","pattern":"\\d{7,9}","required":false},"decision_date":{"method":"regex","pattern":"\\d{1,2}\\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\\s+\\d{4}|\\d{1,2}/\\d{1,2}/\\d{4}","required":true},"subject":{"method":"regex","pattern":"(?:nei confronti di|contro|al|alla)\\s+([A-ZÀÈÌÒÙ][^,\\.\\n]{3,80})","required":true},"fine_amount_local":{"method":"regex","pattern":"(\\d[\\d.,]+)\\s*(?:euro|€)","required":false},"fine_currency":{"method":"profile_default","value":"EUR"},"statutory_provisions":{"method":"regex","pattern":"art(?:icolo|\\.)?\\s*\\d+(?:,\\s*comma\\s*\\d+)?(?:,\\s*lett\\.?\\s*[a-z])?\\s*(?:del\\s*)?(?:Regolamento|GDPR|Reg\\. UE)","required":false,"multiple":true},"key_compliance_failure":{"method":"llm_verbatim","language":"it","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','good',
  ARRAY['docweb IDs rotate','Italian citation: art. N, comma M, lett. X','English subset ~200 major cases'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();

INSERT INTO public.regulator_profiles VALUES (
  'Federal Trade Commission (FTC)','1.0','United States (federal)',
  ARRAY['ftc_act','coppa','glba','fcra'],'FTC Act','en',
  ARRAY['Month DD, YYYY','MM/DD/YYYY'],'FTC-\d{4}-\d{4}|\d{4}-\d{4}','USD','identifying_first',2000,false,true,
  '[{"method":"paginated_browse","name":"FTC Cases & Proceedings","base_url":"https://www.ftc.gov/legal-library/browse/cases-proceedings","format":"html","document_format":"html_and_pdf"},{"method":"rss_feed","name":"FTC press releases RSS","base_url":"https://www.ftc.gov/feeds/press-release.xml","format":"rss"}]'::jsonb,
  '{"case_reference":{"method":"css_selector","pattern":".field--name-field-case-number","required":false},"decision_date":{"method":"css_selector","pattern":".field--name-field-date time","required":true},"subject":{"method":"css_selector","pattern":"h1.page-title","required":true},"fine_amount_local":{"method":"regex","pattern":"\\$([\\d,]+(?:\\.\\d+)?(?:\\s*(?:million|billion))?)","required":false},"fine_currency":{"method":"profile_default","value":"USD"},"statutory_provisions":{"method":"regex","pattern":"(?:Section|§)\\s*\\d+(?:\\([a-z]\\))?\\s*(?:of\\s*the\\s*)?(?:FTC Act|COPPA|GLBA|FCRA|CAN-SPAM)","required":false,"multiple":true},"key_compliance_failure":{"method":"llm_verbatim","language":"en","source":"consent_order_pdf","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','excellent',
  ARRAY['Fetch consent order PDF for key_compliance_failure','Some cases injunctive only — no fine','USD → EUR'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();

INSERT INTO public.regulator_profiles VALUES (
  'U.S. Department of Health & Human Services Office for Civil Rights (HHS OCR)','1.0','United States (federal)',
  ARRAY['hipaa'],'HIPAA','en',
  ARRAY['Month DD, YYYY','MM/DD/YYYY'],NULL,'USD','browser_first',3000,false,true,
  '[{"method":"aggregator","name":"HHS Resolution Agreements page","base_url":"https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html","format":"html","note":"Primary blocks fetcher"},{"method":"aggregator","name":"HIPAA Journal enforcement tracker","base_url":"https://www.hipaajournal.com/category/hipaa-enforcement/","format":"html","note":"Third-party fallback; medium confidence"}]'::jsonb,
  '{"decision_date":{"method":"regex","pattern":"(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},\\s+\\d{4}","required":true},"subject":{"method":"regex","pattern":"^([A-Z][^,\\.\\n]{5,80})\\s+(?:has agreed|will pay|paid|agrees|entered)","required":true},"fine_amount_local":{"method":"regex","pattern":"\\$([\\d,]+(?:\\.\\d+)?(?:\\s*(?:million|thousand))?)","required":false},"fine_currency":{"method":"profile_default","value":"USD"},"statutory_provisions":{"method":"regex","pattern":"(?:45\\s*C\\.?F\\.?R\\.?\\s*§?\\s*\\d+\\.\\d+|HIPAA\\s*(?:Privacy|Security|Breach Notification)\\s*Rule)","required":false,"multiple":true},"key_compliance_failure":{"method":"llm_verbatim","language":"en","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','good',
  ARRAY['hhs.gov blocks both UAs; aggregator primary','Aggregator rows = medium confidence (not memo_eligible)','HIPAA-specific: CFR citations'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();

INSERT INTO public.regulator_profiles VALUES (
  'Autoritatea Naţională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)','1.0','Romania',
  ARRAY['gdpr'],'GDPR','ro',ARRAY['DD.MM.YYYY','DD/MM/YYYY'],NULL,'RON','identifying_first',2000,false,true,
  '[{"method":"press_release_browse","name":"ANSPDCP press releases by year","base_url":"https://www.dataprotection.ro/?page=Comunicate_de_presa_din_{YYYY}&lang=ro","format":"html","year_range":[2019,2026]}]'::jsonb,
  '{"decision_date":{"method":"regex","pattern":"\\d{1,2}\\.\\d{1,2}\\.\\d{4}","required":true},"subject":{"method":"regex","pattern":"(?:operatorul|societatea|compania|firma)\\s+([A-ZĂÂÎȘȚ][^,\\.\\n]{3,80})","required":true},"fine_amount_local":{"method":"regex","pattern":"(\\d[\\d.,]+)\\s*(?:lei|RON|euro|€)","required":false},"fine_currency":{"method":"regex_currency","patterns":{"lei":"RON","RON":"RON","euro":"EUR","€":"EUR"},"default":"RON"},"statutory_provisions":{"method":"regex","pattern":"art(?:icolul|\\.)?\\s*\\d+(?:\\s*alin(?:eatul|\\.)?\\s*\\(?\\d+\\)?)?(?:\\s*lit(?:era|\\.)?\\s*[a-z]\\)?)?\\s*(?:din\\s*)?(?:GDPR|Regulamentul)","required":false,"multiple":true},"key_compliance_failure":{"method":"press_release_body","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','partial',
  ARRAY['Press releases only — no full decision texts','Currency mixed RON/EUR'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();

INSERT INTO public.regulator_profiles VALUES (
  'Hellenic Data Protection Authority (HDPA)','1.0','Greece',ARRAY['gdpr'],'GDPR','el',
  ARRAY['DD/MM/YYYY'],'\d+/\d{4}','EUR','browser_first',3000,false,true,
  '[{"method":"html_browse","name":"HDPA English enforcement","base_url":"https://www.dpa.gr/en/enforcement","format":"html"},{"method":"html_browse","name":"HDPA decision pages direct","base_url":"https://www.dpa.gr/en/enforcement/fines","format":"html"}]'::jsonb,
  '{"case_reference":{"method":"regex","pattern":"\\d+/\\d{4}","required":false},"decision_date":{"method":"regex","pattern":"\\d{1,2}/\\d{1,2}/\\d{4}","required":true},"subject":{"method":"css_selector","pattern":"h1.page-title, .decision-subject","required":true},"fine_amount_local":{"method":"regex","pattern":"(\\d[\\d.,]+)\\s*(?:euro|€|EUR)","required":false},"fine_currency":{"method":"profile_default","value":"EUR"},"statutory_provisions":{"method":"regex","pattern":"(?:Article|άρθρο)\\s*\\d+(?:\\s*\\(\\d+\\))?(?:\\s*\\([a-z]\\))?\\s*(?:GDPR|of the GDPR)","required":false,"multiple":true},"key_compliance_failure":{"method":"llm_verbatim","language":"el","preferred_language":"en","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','good',
  ARRAY['Registry blocks UA — access decision pages directly','Use English text when available'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();

INSERT INTO public.regulator_profiles VALUES (
  'Commission Nationale de l''Informatique et des Libertés (CNIL)','1.0','France',ARRAY['gdpr'],'GDPR','fr',
  ARRAY['DD/MM/YYYY','D MMMM YYYY'],'SAN-\d{4}-\d{3}','EUR','identifying_first',2000,false,true,
  '[{"method":"html_browse","name":"CNIL sanctions listing","base_url":"https://www.cnil.fr/fr/les-sanctions-prononcees-par-la-cnil","format":"html"},{"method":"rss_feed","name":"CNIL news RSS","base_url":"https://www.cnil.fr/fr/rss.xml","format":"rss"},{"method":"html_browse","name":"Legifrance formal deliberations","base_url":"https://www.legifrance.gouv.fr/cnil/liste/cnil","format":"html"}]'::jsonb,
  '{"case_reference":{"method":"regex","pattern":"SAN-\\d{4}-\\d{3}|n°\\s*\\d+-\\d+","required":false},"decision_date":{"method":"regex","pattern":"\\d{1,2}\\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\\s+\\d{4}|\\d{1,2}/\\d{1,2}/\\d{4}","required":true},"subject":{"method":"css_selector","pattern":"h1.page-title, .field--name-title","required":true},"fine_amount_local":{"method":"regex","pattern":"(\\d[\\d\\s.,]+)\\s*(?:millions?\\s*d.euros?|euros?|€|M€)","required":false},"fine_currency":{"method":"profile_default","value":"EUR"},"statutory_provisions":{"method":"regex","pattern":"(?:l.)?article\\s*\\d+(?:,?\\s*paragraphe\\s*\\d+)?(?:,?\\s*(?:point|alinéa)\\s*[a-z]\\)?)?\\s*(?:du\\s*)?(?:RGPD|règlement)","required":false,"multiple":true},"key_compliance_failure":{"method":"llm_verbatim","language":"fr","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','excellent',
  ARRAY['French citation: article N, paragraphe M, point X du RGPD','Fines often in M€','Non-financial sanctions exist'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();

INSERT INTO public.regulator_profiles VALUES (
  'Úřad pro ochranu osobních údajů (ÚOOÚ)','1.0','Czech Republic',ARRAY['gdpr'],'GDPR','cs',
  ARRAY['DD.MM.YYYY','D. M. YYYY'],'UOOU-\d+/\d+-\d+','CZK','identifying_first',2000,false,true,
  '[{"method":"html_browse","name":"UOOU completed inspections","base_url":"https://uoou.gov.cz/cinnost/ochrana-osobnich-udaju/ukoncene-kontroly","format":"html"},{"method":"html_browse","name":"UOOU sanctions","base_url":"https://uoou.gov.cz/cinnost/ochrana-osobnich-udaju","format":"html"}]'::jsonb,
  '{"case_reference":{"method":"regex","pattern":"UOOU-\\d+/\\d+-\\d+","required":false},"decision_date":{"method":"regex","pattern":"\\d{1,2}\\.\\s*\\d{1,2}\\.\\s*\\d{4}","required":true},"subject":{"method":"css_selector","pattern":"h1, .field--name-title, .inspection-subject","required":true},"fine_amount_local":{"method":"regex","pattern":"(\\d[\\d\\s]+)\\s*(?:Kč|CZK|korun|euro|€)","required":false},"fine_currency":{"method":"regex_currency","patterns":{"Kč":"CZK","CZK":"CZK","euro":"EUR","€":"EUR"},"default":"CZK"},"statutory_provisions":{"method":"regex","pattern":"(?:čl\\.?\\s*|článku?\\s*)\\d+(?:\\s*odst\\.?\\s*\\d+)?(?:\\s*písm\\.?\\s*[a-z]\\)?)?\\s*(?:nařízení|GDPR|RODO)","required":false,"multiple":true},"key_compliance_failure":{"method":"llm_verbatim","language":"cs","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','good',
  ARRAY['Czech citation: čl. N odst. M písm. X','CZK→EUR'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();

INSERT INTO public.regulator_profiles VALUES (
  'Office of the Australian Information Commissioner (OAIC)','1.0','Australia',
  ARRAY['australia_privacy_act_1988'],'Privacy Act 1988 (Australia)','en',
  ARRAY['DD Month YYYY','D Month YYYY','YYYY-MM-DD'],'\[?\d{4}\]?\s*AICmr\s*\d+|MR\d+|CR\d+','AUD','identifying_first',2000,false,true,
  '[{"method":"html_browse","name":"OAIC privacy decisions","base_url":"https://www.oaic.gov.au/privacy/privacy-decisions","format":"html","document_format":"html_inline"},{"method":"rss_feed","name":"OAIC news RSS","base_url":"https://www.oaic.gov.au/rss","format":"rss"}]'::jsonb,
  '{"case_reference":{"method":"regex","pattern":"\\[\\d{4}\\]\\s*AICmr\\s*\\d+|MR\\d+|CR\\d+","required":false},"decision_date":{"method":"regex","pattern":"\\d{1,2}\\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4}","required":true},"subject":{"method":"css_selector","pattern":"h1.page-title, .decision-respondent","required":true},"fine_amount_local":{"method":"regex","pattern":"\\$([\\d,]+(?:\\.\\d+)?(?:\\s*(?:million|thousand))?)","required":false},"fine_currency":{"method":"profile_default","value":"AUD"},"statutory_provisions":{"method":"regex","pattern":"(?:Australian Privacy Principle|APP)\\s*\\d+(?:\\.\\d+)?|(?:section|s\\.?)\\s*\\d+\\s*(?:of\\s*)?(?:the\\s*)?Privacy Act","required":false,"multiple":true},"key_compliance_failure":{"method":"css_extract","pattern":".field--name-body p:nth-child(3), .decision-summary","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','excellent',
  ARRAY['Inline HTML decisions — CSS extractable','APP citations not GDPR','AUD→EUR'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();

INSERT INTO public.regulator_profiles VALUES (
  'Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)','1.0','Hungary',ARRAY['gdpr'],'GDPR','hu',
  ARRAY['YYYY.MM.DD.','YYYY. MM. DD.'],'NAIH-\d+/\d+','HUF','identifying_first',2000,false,true,
  '[{"method":"html_browse","name":"NAIH decisions","base_url":"https://www.naih.hu/hatarozatok-vegzesek","format":"html","document_format":"pdf"},{"method":"aggregator","name":"NAIH annual report","base_url":"https://www.naih.hu/eves-jelentes","format":"html"}]'::jsonb,
  '{"case_reference":{"method":"regex","pattern":"NAIH-\\d+/\\d+|NAIH/\\d+-\\d+/\\d{4}","required":false},"decision_date":{"method":"regex","pattern":"\\d{4}\\.\\s*\\d{1,2}\\.\\s*\\d{1,2}\\.","required":true},"subject":{"method":"css_selector","pattern":"h1, .hatarozat-cim","required":true},"fine_amount_local":{"method":"regex","pattern":"(\\d[\\d\\s]+)\\s*(?:Ft|forint|HUF|euro|€)","required":false},"fine_currency":{"method":"regex_currency","patterns":{"Ft":"HUF","forint":"HUF","HUF":"HUF","euro":"EUR","€":"EUR"},"default":"HUF"},"statutory_provisions":{"method":"regex","pattern":"\\d+\\.\\s*cikk(?:\\s*\\(\\d+\\))?(?:\\s*[a-z]\\))?\\s*(?:bekezdés)?|GDPR\\s*\\d+\\.\\s*cikk","required":false,"multiple":true},"key_compliance_failure":{"method":"llm_verbatim","language":"hu","required":true},"compliance_failure":{"method":"keyword_classify"},"sector":{"method":"keyword_sector"},"fine_eur_equivalent":{"method":"currency_normalise","currency_field":"fine_currency"}}'::jsonb,
  'claude-haiku-4-5-20251001','good',
  ARRAY['Hungarian citation: N. cikk (M) bekezdés','HUF→EUR ~385:1'],
  true, now(), now()
) ON CONFLICT (canonical_name) DO UPDATE SET strategy_stack=EXCLUDED.strategy_stack, field_recipes=EXCLUDED.field_recipes, updated_at=now();
