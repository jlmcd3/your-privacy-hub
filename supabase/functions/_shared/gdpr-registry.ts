// Clean alias for the consolidated GDPR registry. Re-exports everything from
// the DPIA jurisdiction registry so consumers can write:
//   import { renderGdprCitationBlock } from "./gdpr-registry.ts";
export * from "./dpia-jurisdiction-registry.ts";
