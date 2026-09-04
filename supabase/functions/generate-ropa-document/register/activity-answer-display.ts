// DOC 166 (2026-09-04) — presentation-only helpers over a raw per-activity
// answer bag (the shape `ropa_answers` rows collapse into, keyed by
// `question_key`), shared by the HTML, DOCX and XLSX activity tables so the
// three formats cannot drift. Importable from a test — index.ts calls
// `Deno.serve(...)` at module scope, so importing it directly would start an
// HTTP listener.
//
// DOC 168 (2026-09-04) — reads the transfer facts through the ONE resolver
// (`resolveTransfer` in assemble-input.ts) so this row, register cell (e) and
// the cross-border table all describe the same state; mechanism option codes
// render as reader labels.

import { resolveTransfer } from "./assemble-input.ts";

type Bag = Record<string, unknown>;

/**
 * The per-activity "Cross-border transfers" row. Honest in every state:
 *   - the Company recorded that no transfer takes place  → says so;
 *   - neither destination nor mechanism recorded         → "None recorded";
 *   - destination only                                   → the destination;
 *   - destination + mechanism                            → "dest (mechanism)";
 *   - mechanism only (Art. 30(1)(e) gap)                 → "Destination not recorded (mechanism stated: …)".
 * Before doc 166 this cell read `transfer_destination ?? "None"` and appended
 * the mechanism whenever one was answered, so every legacy record rendered
 * the self-contradictory "None (sccs)".
 */
export function transferDisplayForActivity(ans: Bag): string {
  const t = resolveTransfer(ans);
  if (t.declaredNone) return "None — the Company records no transfer to a third country or international organisation";
  if (!t.destination && !t.mechanism) return "None recorded";
  if (!t.destination) return `Destination not recorded (mechanism stated: ${t.mechanism})`;
  return t.mechanism ? `${t.destination} (${t.mechanism})` : t.destination;
}
