// src/components/intake/intakePolicy.ts
// Per-tool intake policy.
//  rail        — render the StatuteRail? (statutory context next to intake)
//  goodAnswer  — permit goodAnswer entries? TRUE ONLY where the tool's edge
//                function feeds the user's intake into an AI generation prompt,
//                so answer specificity changes the output. Deterministic tools
//                (no AI prompt shaped by the answer) keep the rail but get NO
//                goodAnswer. Invariant: goodAnswer === true implies rail === true.
export interface IntakePolicy { rail: boolean; goodAnswer: boolean; }

export const INTAKE_POLICY: Record<string, IntakePolicy> = {
  // AI-generation tools — edge function qualifies the AI prompt → goodAnswer allowed
  admt:       { rail: true,  goodAnswer: true  },
  dpia:       { rail: true,  goodAnswer: true  },
  lia:        { rail: true,  goodAnswer: true  },
  governance: { rail: true,  goodAnswer: true  },
  cppa_risk:  { rail: true,  goodAnswer: true  }, // free-text + enumerated coaching; BenchLayout collapses coaching column per-entry when a rail key has no coach content
  cppa_cyber: { rail: true,  goodAnswer: true  },
  biometric:  { rail: true,  goodAnswer: true  }, // enumerated intake — coaching explains what facts determine the accurate choice; no free-text fields
  // NOT WIRED (2026-07-11): the US/EU Notice and RoPA wizard flows do not use
  // BenchLayout/IntakeLayout/StatuteRail, so rail entries here have no effect.
  // Adding statute rails to those flows is a tracked post-launch feature
  // decision; when it lands, restore these as { rail: true, goodAnswer: true }
  // (note: the old key "rofa" was a typo for "ropa").
  us_notice:  { rail: false, goodAnswer: false },
  eu_notice:  { rail: false, goodAnswer: false },
  ropa:       { rail: false, goodAnswer: false },

  // Deterministic tool — rail yes (statutory context), goodAnswer NO (no AI prompt)
  cppa_scope: { rail: true,  goodAnswer: false },

  // No-rail tools — commercial/logistical/time-critical intake
  dpa:          { rail: false, goodAnswer: false }, // contract intake
  // ITEM 369-IR: the STANDING-PLAYBOOK intake is written PRE-incident, at
  // leisure, so the "speed over law" reasoning that justified rail:false no
  // longer applies. The blank incident worksheet needs no intake at all.
  ir_playbook:  { rail: true,  goodAnswer: true  },
  registration: { rail: false, goodAnswer: false }, // order/fulfilment flow
};
