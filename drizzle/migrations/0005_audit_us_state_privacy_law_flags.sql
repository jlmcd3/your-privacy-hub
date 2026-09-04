-- Audit of us_state_privacy_laws.has_appeal_right and .requires_gpc against the
-- statutes. Values we can cite are corrected; values we cannot verify are set
-- to NULL rather than guessed. enforcement_body, enforcement_url, law_name and
-- effective_date are untouched.

ALTER TABLE public.us_state_privacy_laws
  ALTER COLUMN has_appeal_right DROP NOT NULL,
  ALTER COLUMN requires_gpc DROP NOT NULL;

-- ---------------------------------------------------------------- appeal right
-- Virginia-model statutes require the controller to establish an appeal process.
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'VA'; -- Va. Code Ann. § 59.1-577(C)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'CO'; -- C.R.S. § 6-1-1306(3)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'CT'; -- Conn. Gen. Stat. § 42-522(c)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'TX'; -- Tex. Bus. & Com. Code § 541.053
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'OR'; -- Or. Rev. Stat. § 646A.578(3)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'MT'; -- Mont. Code Ann. § 30-14-2816(3)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'DE'; -- 6 Del. C. § 12D-105(c)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'IA'; -- Iowa Code § 715D.3(4)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'NE'; -- Neb. Rev. Stat. § 87-1105(3)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'NH'; -- N.H. Rev. Stat. Ann. § 507-H:4(III)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'NJ'; -- N.J.S.A. 56:8-166.10(c)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'TN'; -- Tenn. Code Ann. § 47-18-3304(d)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'MN'; -- Minn. Stat. § 325O.05, subd. 6
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'MD'; -- Md. Code Ann., Com. Law § 14-4705(c)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'IN'; -- Ind. Code § 24-15-3-2(d)
UPDATE public.us_state_privacy_laws SET has_appeal_right = true WHERE state_code = 'KY'; -- KRS § 367.3611(4)

-- No statutory appeal mechanism exists in these two schemes.
UPDATE public.us_state_privacy_laws SET has_appeal_right = false WHERE state_code = 'CA'; -- CCPA/CPRA, Cal. Civ. Code § 1798.130 (no appeal process created)
UPDATE public.us_state_privacy_laws SET has_appeal_right = false WHERE state_code = 'UT'; -- UCPA, Utah Code § 13-61-203 (no appeal process created)

-- Not verified to a citation in this pass.
UPDATE public.us_state_privacy_laws SET has_appeal_right = NULL WHERE state_code IN ('RI','FL');

-- ------------------------------------------------- universal opt-out / GPC
-- Statutes (or regulations) that require honouring an opt-out preference signal.
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'CA'; -- Cal. Code Regs. tit. 11, § 7025
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'CO'; -- C.R.S. § 6-1-1306(1)(a)(IV)(B)
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'CT'; -- Conn. Gen. Stat. § 42-520(e)
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'TX'; -- Tex. Bus. & Com. Code § 541.055(e)
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'MT'; -- Mont. Code Ann. § 30-14-2812(4)
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'OR'; -- Or. Rev. Stat. § 646A.578(6)
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'NJ'; -- N.J.S.A. 56:8-166.10(a)(2)
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'DE'; -- 6 Del. C. § 12D-107(b)
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'NH'; -- N.H. Rev. Stat. Ann. § 507-H:6(I)(d)
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'MN'; -- Minn. Stat. § 325O.05, subd. 1(d)
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'MD'; -- Md. Code Ann., Com. Law § 14-4706(b)
UPDATE public.us_state_privacy_laws SET requires_gpc = true WHERE state_code = 'NE'; -- Neb. Rev. Stat. § 87-1106(2)

-- No universal opt-out mechanism obligation in these schemes.
UPDATE public.us_state_privacy_laws SET requires_gpc = false WHERE state_code = 'VA'; -- Va. Code Ann. § 59.1-578 (none required)
UPDATE public.us_state_privacy_laws SET requires_gpc = false WHERE state_code = 'UT'; -- Utah Code § 13-61-302 (none required)
UPDATE public.us_state_privacy_laws SET requires_gpc = false WHERE state_code = 'IA'; -- Iowa Code § 715D.4 (none required)
UPDATE public.us_state_privacy_laws SET requires_gpc = false WHERE state_code = 'TN'; -- Tenn. Code Ann. § 47-18-3306 (none required)
UPDATE public.us_state_privacy_laws SET requires_gpc = false WHERE state_code = 'IN'; -- Ind. Code § 24-15-4-1 (none required)
UPDATE public.us_state_privacy_laws SET requires_gpc = false WHERE state_code = 'KY'; -- KRS § 367.3613 (none required)

-- Not verified to a citation in this pass.
UPDATE public.us_state_privacy_laws SET requires_gpc = NULL WHERE state_code IN ('RI','FL');

-- Pending / not-yet-enacted rows carry no verifiable obligations.
UPDATE public.us_state_privacy_laws
   SET has_appeal_right = NULL, requires_gpc = NULL
 WHERE is_active = false;