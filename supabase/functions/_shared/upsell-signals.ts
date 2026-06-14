// _shared/upsell-signals.ts

// Pure signal computation. Reads the completed tool row and returns top-3 UpsellSignal[].

export interface UpsellSignal {
  product: string;
  reason: string;
  urgency: 'high' | 'medium';
  subscriber_free: boolean; // suppress paid-upsell email for subscribers if true
  priority: number;         // lower = shown first
}

// Products free to Platform subscribers — suppress paid-upsell email.
const SUBSCRIBER_FREE = new Set(['ir_playbook', 'biometric_checker']);

function isEuUk(jurs: string[]): boolean {
  return jurs.some(j =>
    /\b(eu|gdpr|european|united.kingdom|\buk\b|\bgb\b|ireland|france|germany|
      spain|italy|netherlands|belgium|sweden|denmark|norway|poland|austria|
      finland|luxembourg|greece|switzerland|portugal)/i.test(String(j)));
}
function isCalifornia(jurs: string[]): boolean {
  return jurs.some(j => /california|cppa|ccpa|cpra/i.test(String(j)));
}
function norm(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.length) return [raw];
  return [];
}

export function computeUpsellSignals(
  toolType: string,
  row: Record<string, any>,
): UpsellSignal[] {
  const signals: UpsellSignal[] = [];
  const push = (product: string, reason: string, urgency: 'high' | 'medium', priority: number) => {
    if (signals.some(s => s.product === product)) return;
    signals.push({ product, reason, urgency, subscriber_free: SUBSCRIBER_FREE.has(product), priority });
  };

  switch (toolType) {

    // ── LIA ─────────────────────────────────────────────────────────
    // Verified fields: row.jurisdictions, row.data_categories,
    //   row.report_data.three_part_test.overall_assessment.argument_strength,
    //   row.report_data.three_part_test.overall_assessment.blocking_issues,
    //   row.report_data.three_part_test.balancing_test.special_category_flag,
    //   row.report_data.documentation_recommendations.recommended_documentation
    case 'li_assessment': {
      const rd   = row?.report_data ?? {};
      const oa   = rd?.three_part_test?.overall_assessment ?? {};
      const bt   = rd?.three_part_test?.balancing_test ?? {};
      const docs = rd?.documentation_recommendations?.recommended_documentation ?? [];
      const jurs = norm(row?.jurisdictions);
      const cats = norm(row?.data_categories);

      if (['weak','insufficient'].includes(String(oa.argument_strength)))
        push('governance_assessment',
          'Your LIA returned a weak result — a Governance Assessment identifies root-cause gaps.',
          'high', 1);

      if (Array.isArray(oa.blocking_issues) &&
          oa.blocking_issues.some((b: string) => /dpa|processor|data.processing/i.test(String(b))))
        push('dpa_generator',
          'A blocking issue in your LIA requires a Data Processing Agreement with your processor.',
          'high', 2);

      if (bt.special_category_flag === true)
        push('dpia_framework',
          'Your processing involves special category data — a DPIA is required under GDPR Article 35.',
          'high', 1);

      if (cats.some((d: string) => /biometric/i.test(d)))
        push('biometric_checker',
          'Your processing includes biometric data — run a Biometric Compliance Check.',
          'high', 2);

      if (docs.some((r: any) => /dpia|data.protection.impact/i.test(String(r?.document ?? ''))))
        push('dpia_framework',
          'Your documentation recommendations include a DPIA — build it now.',
          'medium', 3);

      if (isEuUk(jurs))
        push('rofa',
          'EU/UK processing requires Article 30 Records of Processing Activities.',
          'medium', 4);

      if (bt.verdict === 'likely_fails')
        push('ir_playbook',
          'Your balancing test suggests elevated breach risk — an IR Playbook prepares your response.',
          'medium', 5);

      if (isCalifornia(jurs))
        push('cppa_scope',
          'California is in scope — run the free CPPA Scope Check.',
          'medium', 6);

      break;
    }

    // ── GOVERNANCE ──────────────────────────────────────────────────
    // Verified fields: row.intake_data.jurisdictions, row.intake_data.eu_uk_data,
    //   row.report_data.dpia_scope (array),
    //   row.report_data.domain_findings.privacy_notice.severity,
    //   row.report_data.domain_findings.incident_response.severity,
    //   row.report_data.domain_findings.vendor_terms.severity,
    //   row.report_data.overall_readiness_rating
    case 'governance_assessment': {
      const rd     = row?.report_data ?? {};
      const intake = row?.intake_data ?? {};
      const df     = rd?.domain_findings ?? {};
      const jurs   = norm(intake?.jurisdictions);

      if (Array.isArray(rd?.dpia_scope) && rd.dpia_scope.length > 0)
        push('dpia_framework',
          'Your Governance Assessment identified processing activities requiring a DPIA.',
          'high', 1);

      if (['Critical','High'].includes(df?.privacy_notice?.severity))
        push('privacy_notice_us',
          `Your privacy notice domain is rated ${df.privacy_notice.severity} — generate an updated Privacy Notice.`,
          'high', 2);

      if (['Critical','High'].includes(df?.incident_response?.severity))
        push('ir_playbook',
          `Your incident response domain is rated ${df.incident_response.severity} — an IR Playbook closes this gap.`,
          'high', 2);

      if (['Critical','High'].includes(df?.vendor_terms?.severity))
        push('dpa_generator',
          `Your vendor terms domain is rated ${df.vendor_terms.severity} — generate Data Processing Agreements.`,
          'high', 2);

      if (['Initial','Developing'].includes(rd?.overall_readiness_rating))
        push('li_assessment',
          'Your readiness rating indicates processing activities may lack documented lawful bases — run an LIA.',
          'medium', 4);

      if (intake?.eu_uk_data === true || isEuUk(jurs))
        push('rofa', 'Your EU/UK processing requires Article 30 Records.', 'medium', 3);

      if (isCalifornia(jurs))
        push('cppa_scope', 'California is in scope — run the free CPPA Scope Check.', 'medium', 5);

      break;
    }

    // ── DPIA ────────────────────────────────────────────────────────
    // Verified fields: row.intake_data.jurisdictions, row.intake_data.data_categories,
    //   row.intake_data.third_party_processors, row.source_assessment_id,
    //   row.report_data.section_3_risks.risk_assessment (array with .severity)
    case 'dpia_framework': {
      const intake = row?.intake_data ?? {};
      const jurs   = norm(intake?.jurisdictions ?? []);
      const cats   = norm(intake?.data_categories ?? []);
      const risks  = row?.report_data?.section_3_risks?.risk_assessment ?? [];
      const tp     = intake?.third_party_processors;

      if (!row?.source_assessment_id)
        push('governance_assessment',
          'No Governance Assessment is linked to this DPIA — run one to establish your programme baseline.',
          'medium', 3);

      if (cats.some((d: string) => /biometric/i.test(d)))
        push('biometric_checker',
          'Your DPIA covers biometric data — run a Biometric Compliance Check for jurisdiction-specific obligations.',
          'high', 1);

      if ((Array.isArray(tp) && tp.length > 0) || (typeof tp === 'string' && tp.trim()))
        push('dpa_generator',
          'Your DPIA identifies third-party processors — generate Data Processing Agreements.',
          'high', 1);

      if (Array.isArray(risks) && risks.some((r: any) => r?.severity === 'High'))
        push('li_assessment',
          'High-severity risks identified — document the lawful basis with an LIA if relying on legitimate interest.',
          'medium', 4);

      if (isEuUk(jurs))
        push('rofa', 'This DPIA processing activity must be recorded in your Article 30 Records.', 'medium', 2);

      if (isCalifornia(jurs))
        push('cppa_risk',
          'California processing in scope — the CPPA Risk Assessment evaluates your California posture.',
          'medium', 5);

      break;
    }

    // ── BIOMETRIC ────────────────────────────────────────────────────
    // Verified fields: row.intake_data.jurisdictions, row.intake_data.biometricTypes,
    //   row.intake_data.enrolledCount, row.report_data.bipa_risk,
    //   row.report_data.jurisdictions_analysed
    case 'biometric_checker': {
      const intake   = row?.intake_data ?? {};
      const jurs     = norm(intake?.jurisdictions ?? []);
      const bipaRisk = row?.report_data?.bipa_risk;

      push('dpia_framework',
        'Biometric processing is high-risk — a DPIA is required under GDPR Article 35.',
        'high', 1);

      if (bipaRisk)
        push('governance_assessment',
          'BIPA exposure identified — a Governance Assessment reviews your broader Illinois compliance posture.',
          'high', 2);

      if (isCalifornia(jurs))
        push('cppa_risk',
          'California biometric provisions apply — the CPPA Risk Assessment evaluates your full California exposure.',
          'high', 2);

      if (isEuUk(jurs)) {
        push('li_assessment',
          'EU/UK biometric processing requires both an Article 9 condition and an Article 6 lawful basis — document with an LIA.',
          'high', 1);
        push('rofa', 'EU/UK biometric processing must be recorded in your Article 30 Records.', 'medium', 3);
      }

      if (!intake?.has_privacy_notice)
        push('privacy_notice_us',
          'A Privacy Notice must cover biometric data collection — generate one now.',
          'medium', 4);

      break;
    }

    // ── IR PLAYBOOK ──────────────────────────────────────────────────
    case 'ir_playbook': {
      const intake = row?.intake_data ?? {};
      const jurs   = norm(intake?.jurisdictions ?? []);

      push('governance_assessment',
        'An IR Playbook covers response — a Governance Assessment covers root cause.',
        'high', 1);

      if (isEuUk(jurs))
        push('rofa',
          'In a breach, Article 30 Records identify what data was affected — build your RoFA now.',
          'high', 1);

      if (/processor|vendor|third.party/i.test(JSON.stringify(intake)))
        push('dpa_generator',
          'Your incident scenario involves processors — DPAs define breach notification obligations.',
          'high', 2);

      if (isCalifornia(jurs))
        push('cppa_cybersecurity',
          'California breach scenarios trigger CPPA cybersecurity audit requirements.',
          'medium', 3);

      break;
    }

    // ── DPA GENERATOR ────────────────────────────────────────────────
    // Verified fields: row.intake_data.controllerJurisdiction,
    //   row.intake_data.processorJurisdiction, row.intake_data.dataCategories,
    //   row.intake_data.includeTransferClause, row.intake_data.documentType
    case 'dpa_generator': {
      const intake = row?.intake_data ?? {};
      const cats   = norm(intake?.dataCategories ?? []);
      const jurs   = [intake?.controllerJurisdiction, intake?.processorJurisdiction].filter(Boolean);

      if (isEuUk(jurs))
        push('rofa', 'This processor relationship should be recorded in your Article 30 Records.', 'high', 1);

      if (cats.some((d: string) => /biometric|health|genetic|racial|political|religious|sexual|criminal/i.test(d)))
        push('dpia_framework',
          'Your DPA covers sensitive data — a DPIA is required under GDPR Article 35.',
          'high', 1);

      if (intake?.includeTransferClause === true)
        push('registration_suite',
          'Your DPA includes an international transfer clause — the Registration Suite manages your filing obligations.',
          'medium', 3);

      break;
    }

    // ── CPPA SCOPE ───────────────────────────────────────────────────
    case 'cppa_scope': {
      const hasObligation = row?.obligation_map && Object.keys(row.obligation_map).length > 0;

      if (hasObligation) {
        push('cppa_risk',
          'Your CPPA scope check confirmed obligations — the CPPA Risk Assessment (Module 1) evaluates your full posture.',
          'high', 1);
        push('cppa_cybersecurity',
          'CPPA cybersecurity audit requirements may apply — the Cybersecurity Readiness module identifies your gap-to-certification path.',
          'medium', 2);
      }

      break;
    }

    // ── CPPA RISK ────────────────────────────────────────────────────
    case 'cppa_risk': {
      const rd     = row?.report_data ?? {};
      const intake = row?.intake_data ?? {};
      const jurs   = norm(intake?.jurisdictions ?? []);

      push('cppa_cybersecurity',
        'Complete your CPPA picture with the Cybersecurity Readiness module — gap-to-certification analysis.',
        'high', 1);

      if (intake?.eu_uk_data === true || isEuUk(jurs))
        push('governance_assessment',
          'Your processing spans CPPA and EU/UK — a Governance Assessment covers GDPR alongside your California obligations.',
          'medium', 3);

      if (Array.isArray(rd?.top_risks) && rd.top_risks.some((r: any) => r?.severity === 'High'))
        push('ir_playbook',
          'High-risk processing in your CPPA assessment — an IR Playbook prepares your breach response.',
          'medium', 4);

      break;
    }

    // ── CPPA CYBERSECURITY ───────────────────────────────────────────
    // Verified fields: row.report_data.readiness_level,
    //   row.report_data.overall_score, row.report_data.controls (18-item array
    //   with .status and .control), row.report_data.top_risks
    case 'cppa_cybersecurity': {
      const rd = row?.report_data ?? {};
      const rl = rd?.readiness_level;

      if (['Material Gaps','Critical Gaps'].includes(rl)) {
        push('ir_playbook',
          'Material cybersecurity gaps identified — an IR Playbook establishes your breach response procedures.',
          'high', 1);
        push('governance_assessment',
          'Significant cybersecurity gaps often reflect broader governance issues — a Governance Assessment provides the full picture.',
          'medium', 3);
      }

      const vendorGap = Array.isArray(rd?.controls) && rd.controls.some((c: any) =>
        /service.provider|third.party|contractor|vendor/i.test(String(c?.control ?? '')) &&
        ['Gap','Critical Gap'].includes(c?.status)
      );

      if (vendorGap)
        push('dpa_generator',
          'Service provider control gaps identified — generate Data Processing Agreements for your vendors.',
          'high', 2);

      push('cppa_risk',
        'Pair your Cybersecurity Readiness with the CPPA Risk Assessment for complete California audit readiness.',
        'medium', 4);

      break;
    }

    // ── REGISTRATION SUITE ───────────────────────────────────────────
    // Verified fields: row.jurisdictions (array of codes),
    //   row.organization_snapshot
    case 'registration_assessment':
    case 'registration_document': {
      const jurs = norm(row?.jurisdictions ?? []);

      if (isEuUk(jurs))
        push('rofa', 'Your registration jurisdictions include EU/UK — Article 30 Records support your filings.', 'high', 1);

      if (jurs.length > 1)
        push('privacy_notice_global',
          'Your multi-jurisdiction registration requires a Global Privacy Notice.',
          'high', 2);
      else
        push('privacy_notice_us',
          'Complete your compliance package with a Privacy Notice aligned to your registered jurisdiction.',
          'medium', 3);

      break;
    }

    // ── RoFA ─────────────────────────────────────────────────────────
    case 'rofa': {
      const acts = Array.isArray(row?.processing_activities) ? row.processing_activities : [];

      if (acts.some((a: any) => /legitimate.interest/i.test(String(a?.legal_basis ?? ''))))
        push('li_assessment',
          'Activities in your RoFA rely on legitimate interest — run an LIA to document the three-part test.',
          'high', 1);

      if (acts.some((a: any) => a?.is_high_risk === true))
        push('dpia_framework', 'High-risk activities in your RoFA require a DPIA under GDPR Article 35.', 'high', 1);

      if (acts.some((a: any) => /processor/i.test(String(a?.category ?? ''))))
        push('dpa_generator', 'Processor relationships in your RoFA require Data Processing Agreements.', 'high', 2);

      break;
    }

    // ── PRIVACY NOTICE (US / GLOBAL) ─────────────────────────────────
    case 'privacy_notice_us': {
      const intake = row?.intake_data ?? {};
      const all    = [...norm(intake?.primary_jurisdiction ? [intake.primary_jurisdiction] : []),
                      ...norm(intake?.additional_jurisdictions ?? [])];

      if (all.some(j => isEuUk([j])))
        push('privacy_notice_global',
          'Your notice scope includes EU/UK — upgrade to a Global Privacy Notice.',
          'high', 1);

      if (isCalifornia(all))
        push('cppa_scope', 'California is in scope — confirm your notice meets CPPA requirements.', 'medium', 2);

      if (isEuUk(all))
        push('rofa', 'EU/UK transparency obligations extend to Article 30 Records.', 'medium', 3);

      break;
    }

    case 'privacy_notice_global': {
      const intake = row?.intake_data ?? {};
      const jurs   = norm(intake?.additional_jurisdictions ?? []);

      if (isEuUk(jurs))
        push('rofa', 'Your Global Notice covers EU/UK — Article 30 Records are required to support it.', 'high', 1);

      if (isCalifornia(jurs))
        push('cppa_risk', 'California is in your Global Notice scope — run the CPPA Risk Assessment.', 'medium', 3);

      break;
    }

    // ── PRIVACY INTELLIGENCE BRIEF ───────────────────────────────────
    case 'brief': {
      const content = JSON.stringify(row?.report_data ?? row?.brief_data ?? {}).toLowerCase();

      if (/cppa|california.privacy.protection/i.test(content))
        push('cppa_scope', 'Your Brief covers CPPA developments — run the free Scope Check.', 'medium', 1);

      if (/breach|incident|notification/i.test(content))
        push('ir_playbook', 'Your Brief includes breach intelligence — an IR Playbook prepares your response.', 'medium', 2);

      if (/biometric|facial.recogni/i.test(content))
        push('biometric_checker', 'Your Brief covers biometric enforcement — check your biometric compliance posture.', 'medium', 3);

      if (/article.30|ropa|rofa|record.of.processing/i.test(content))
        push('rofa', 'Your Brief covers RoPA enforcement — ensure your Article 30 Records are complete.', 'medium', 4);

      break;
    }
  }

  return signals.sort((a, b) => a.priority - b.priority).slice(0, 3);
}
