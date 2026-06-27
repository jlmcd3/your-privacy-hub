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
  cppa_risk:  { rail: true,  goodAnswer: true  },
  cppa_cyber: { rail: true,  goodAnswer: true  },
  biometric:  { rail: true,  goodAnswer: true  }, // AI narrative + deterministic BIPA calc
  us_notice:  { rail: true,  goodAnswer: true  },
  eu_notice:  { rail: true,  goodAnswer: true  },
  rofa:       { rail: true,  goodAnswer: true  },

  // Deterministic tool — rail yes (statutory context), goodAnswer NO (no AI prompt)
  cppa_scope: { rail: true,  goodAnswer: false },

  // No-rail tools — commercial/logistical/time-critical intake
  dpa:          { rail: false, goodAnswer: false }, // contract intake
  ir_playbook:  { rail: false, goodAnswer: false }, // live incident — speed over law
  registration: { rail: false, goodAnswer: false }, // order/fulfilment flow
};
