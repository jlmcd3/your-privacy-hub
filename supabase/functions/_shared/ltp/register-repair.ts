// D3 REGISTER SUPERSESSION (v3 counsel register, ratified 2026-08-09).
//
// Canonical home for the deterministic register repair. It used to live in
// `risk-skeleton-assemble.ts`; that module still re-exports it, so every
// existing import path is unchanged. It lives here so the RENDER layer
// (`_shared/prose/skeleton-render.ts`) can apply it as a final chokepoint
// without importing the risk assembler (which imports the renderer).
//
// The banned family: "the record shows / reflects / indicates / demonstrates /
// establishes", "on this record", "as the record makes clear". Facts supplied
// by the company are ATTRIBUTED to the company.

/** Deterministic register repair — attribution voice is law (v3 bans).
 *
 * 2026-08-26 RE-REGISTRATION (C2; the Spine v5.2 register ruling applied
 * fleet-wide): the old map rewrote "on this record" to "on the record as
 * documented" — a phrase the fleet register has since BANNED (the v5.2
 * "on the information provided" family; PN-L7 confirmed the ban for LIA).
 * The repair now lands on the ratified register, and the formerly-injected
 * phrase is itself repaired when legacy composed strings carry it. */
export function repairRegister(text: string): string {
  let out = text;
  out = out.replace(/\bOn the record as documented\b/g, "On the information provided");
  out = out.replace(/\bon the record as documented\b/g, "on the information provided");
  out = out.replace(/\bOn this record\b/g, "On the information provided");
  out = out.replace(/\bon this record\b/g, "on the information provided");
  out = out.replace(/\bThe record shows\b/g, "The company has indicated");
  out = out.replace(/\bthe record shows\b/g, "the company has indicated");
  out = out.replace(/\b[Tt]he record (reflects|indicates|demonstrates|establishes)\b/g,
    (_m, _v) => "the company has indicated");
  out = out.replace(/\bAs the record makes clear,?\s*/g, "");
  return out.replace(/\s{2,}/g, " ").trim();
}

/** The banned family, as matchers — for tests and lints. */
export const V3_BANNED_REGISTER_PATTERNS: readonly RegExp[] = [
  /\bthe record shows\b/i,
  /\bthe record reflects\b/i,
  /\bthe record indicates\b/i,
  /\bthe record demonstrates\b/i,
  /\bthe record establishes\b/i,
  /\bon this record\b/i,
];

/** True when any member of the banned family appears in `text`. */
export function hasBannedRegister(text: string): boolean {
  return V3_BANNED_REGISTER_PATTERNS.some((re) => re.test(text));
}
