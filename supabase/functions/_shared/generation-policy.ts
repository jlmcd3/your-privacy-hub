// Cross-product generation policy constants.
//
// Customer-facing product generators (CPPA Risk/Cyber/ADMT, LIA, Governance,
// DPIA, IR Playbook, Biometric, Registration) all run on claude-sonnet-4-6,
// whose synchronous Messages API output ceiling is 64,000 tokens.
//
// Anthropic bills only for tokens actually generated and `max_tokens` carries
// no rate-limit cost or extra latency — so raising the cap to the model's
// ceiling is pure upside: it eliminates truncation as a deterministic failure
// mode without affecting cost or speed for shorter outputs.
//
// Use this constant at every product-generator call site. Do NOT apply it to
// internal micro-tasks (classifiers, citation auditors, translation chunks,
// summarisers) — those are deliberately small and a runaway cap would waste
// latency and produce garbage.
export const PRODUCT_MAX_OUTPUT_TOKENS = 64000;
