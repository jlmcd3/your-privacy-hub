// ITEM 304 / FIX D — regression guard for the stale UK-mirror exclusion.
//
// Item 302 landed the UK-specific Art. 33/34 text in the approved corpus as
// provision_texts `ukgdpr-art-33` / `ukgdpr-art-34`. The IR-playbook registry
// previously listed `uk_gdpr_art_33_mirror` / `uk_gdpr_art_34_mirror` on
// IR_PLAYBOOK_UNANCHORED_PROPOSITIONS ("not in corpus"), which caused the
// wiring pass to WRITE AROUND (null out) those citations.
//
// This test pins three things permanently:
//   (1) neither key appears on the unanchored/exclusion list any more;
//   (2) both keys resolve to real registry rows (so the wiring pass stamps
//       them rather than dropping them into unknown_keys);
//   (3) the resolved rows are the UK-specific text ("Commissioner"), NOT a
//       silent fallback to the EU Art. 33/34 rows ("supervisory authority").

import { describe, it, expect } from "vitest";

import {
  IR_PLAYBOOK_VERIFIED_AUTHORITIES,
  IR_PLAYBOOK_UNANCHORED_PROPOSITIONS,
} from "../../../supabase/functions/_shared/registry/ir-playbook-verified-authorities.ts";

const UK_KEYS = ["uk_gdpr_art_33_mirror", "uk_gdpr_art_34_mirror"] as const;

describe("ir-playbook registry — UK Art. 33/34 mirror exclusion withdrawn (Item 304 Fix D)", () => {
  it("exclusion list no longer contains either UK mirror key", () => {
    for (const key of UK_KEYS) {
      expect(IR_PLAYBOOK_UNANCHORED_PROPOSITIONS).not.toContain(key);
    }
  });

  it("both keys resolve to registry rows (no unknown-key passthrough)", () => {
    for (const key of UK_KEYS) {
      expect(IR_PLAYBOOK_VERIFIED_AUTHORITIES[key]).toBeTruthy();
    }
  });

  it("resolves to UK-specific text, not the EU fallback", () => {
    const art33 = IR_PLAYBOOK_VERIFIED_AUTHORITIES["uk_gdpr_art_33_mirror"];
    expect(art33.citation).toBe("UK GDPR Art. 33");
    expect(art33.verbatim_quote).toContain("the Commissioner");
    expect(art33.verbatim_quote).not.toContain("supervisory authority");
    expect(art33.primary_source_url).toContain("legislation.gov.uk");

    const art34 = IR_PLAYBOOK_VERIFIED_AUTHORITIES["uk_gdpr_art_34_mirror"];
    expect(art34.citation).toBe("UK GDPR Art. 34");
    expect(art34.governing_anchor).toContain("UK GDPR");
    expect(art34.primary_source_url).toContain("legislation.gov.uk");
  });

  it("EU Art. 33 row is untouched and still distinct from the UK row", () => {
    const eu33 = IR_PLAYBOOK_VERIFIED_AUTHORITIES["breach_notify_sa_72h"];
    expect(eu33.verbatim_quote).toContain("supervisory authority");
    expect(eu33.verbatim_quote).not.toBe(
      IR_PLAYBOOK_VERIFIED_AUTHORITIES["uk_gdpr_art_33_mirror"].verbatim_quote,
    );
  });
});
