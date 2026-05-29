DO $$
DECLARE
  c1 int; c2 int; c3 int; c4 int; c5 int; c6 int; c7 int; c8 int; c9 int; c10 int; c11 int; c12 int;
BEGIN
  UPDATE public.enforcement_actions SET regulator_canonical = 'Agencia Española de Protección de Datos (AEPD)' WHERE regulator_canonical IS NULL AND regulator IN ('Spanish Data Protection Authority (aepd)', 'AEPD');
  GET DIAGNOSTICS c1 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'Urząd Ochrony Danych Osobowych (UODO)' WHERE regulator_canonical IS NULL AND regulator IN ('UODO', 'Polish National Personal Data Protection Office (UODO)', 'Polish Data Protection Authority (UODO)');
  GET DIAGNOSTICS c2 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'Garante per la protezione dei dati personali' WHERE regulator_canonical IS NULL AND regulator = 'Italian Data Protection Authority (Garante)';
  GET DIAGNOSTICS c3 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'U.S. Department of Health and Human Services Office for Civil Rights (HHS OCR)' WHERE regulator_canonical IS NULL AND regulator = 'HHS OCR';
  GET DIAGNOSTICS c4 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'Federal Trade Commission (FTC)' WHERE regulator_canonical IS NULL AND regulator = 'FTC';
  GET DIAGNOSTICS c5 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'Commission nationale de l''informatique et des libertés (CNIL)' WHERE regulator_canonical IS NULL AND regulator IN ('French Data Protection Authority (CNIL)', 'CNIL', 'CNIL (France)');
  GET DIAGNOSTICS c6 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'Datatilsynet (Norway)' WHERE regulator_canonical IS NULL AND (regulator = 'Norwegian Supervisory Authority (Datatilsynet)' OR (regulator = 'Datatilsynet' AND jurisdiction = 'Norway'));
  GET DIAGNOSTICS c7 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'Datatilsynet (Denmark)' WHERE regulator_canonical IS NULL AND (regulator IN ('Danish Data Protection Authority (Datatilsynet)', 'Datatilsynet DK') OR (regulator = 'Datatilsynet' AND jurisdiction = 'Denmark'));
  GET DIAGNOSTICS c8 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'Autorité de protection des données (APD)' WHERE regulator_canonical IS NULL AND regulator = 'Belgian Data Protection Authority (APD)';
  GET DIAGNOSTICS c9 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'Autoritatea Naţională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)' WHERE regulator_canonical IS NULL AND regulator = 'Romanian National Supervisory Authority for Personal Data Processing (ANSPDCP)';
  GET DIAGNOSTICS c10 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'Agencija za zaštitu osobnih podataka (AZOP)' WHERE regulator_canonical IS NULL AND regulator IN ('Croatian Data Protection Authority (azop)', 'AZOP');
  GET DIAGNOSTICS c11 = ROW_COUNT;
  UPDATE public.enforcement_actions SET regulator_canonical = 'Autoritat Catalana de Protecció de Dades (APDCAT)' WHERE regulator_canonical IS NULL AND regulator = 'APDCAT';
  GET DIAGNOSTICS c12 = ROW_COUNT;
  RAISE NOTICE 'AEPD=% UODO=% Garante=% HHS=% FTC=% CNIL=% DatNO=% DatDK=% APD=% ANSPDCP=% AZOP=% APDCAT=% TOTAL=%',
    c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12, c1+c2+c3+c4+c5+c6+c7+c8+c9+c10+c11+c12;
END $$;