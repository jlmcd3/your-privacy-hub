// L3 stage 2 (EDPB): consistency check between the hand-written
// EDPB_1_2024_AUTHORITY string in run-li-assessment/index.ts and the
// edpb_guidelines corpus. Anchor phrases are drawn verbatim from the
// six numbered excerpts in the constant. If an anchor is missing from
// the corpus rows for "EDPB Guidelines 1/2024", we log a warning so
// drift between the code constant and the (Claude-verified) corpus
// surfaces before consumers are switched to corpus-first.
//
// Fire-and-forget, idempotent per warm instance. Never throws.

const ANCHORS: Array<{ excerpt: number; phrase: string }> = [
  { excerpt: 1, phrase: "three cumulative" },
  { excerpt: 2, phrase: "clearly and precisely" },
  { excerpt: 2, phrase: "real and present" },
  { excerpt: 3, phrase: "likely impact" },
  { excerpt: 4, phrase: "reasonable expectations" },
  { excerpt: 5, phrase: "compelling legitimate" },
  { excerpt: 5, phrase: "essential to the controller" },
  { excerpt: 6, phrase: "mitigating measures" },
];

let _checked = false;

export async function verifyEdpb12024AgainstCorpus(supabase: any): Promise<void> {
  if (_checked) return;
  _checked = true;
  try {
    const { data, error } = await supabase
      .from("edpb_guidelines")
      .select("excerpt_text")
      .eq("guideline_ref", "EDPB Guidelines 1/2024")
      .eq("status", "final");
    if (error) {
      console.warn(`[edpb-1-2024-consistency] corpus fetch failed: ${error.message}`);
      return;
    }
    const rows = (data ?? []) as Array<{ excerpt_text: string | null }>;
    if (rows.length === 0) {
      // No corpus rows yet — silent (nothing to compare against).
      return;
    }
    const haystack = rows
      .map((r) => (r.excerpt_text ?? "").toLowerCase())
      .join("\n");
    const missing = ANCHORS.filter((a) => !haystack.includes(a.phrase.toLowerCase()));
    if (missing.length > 0) {
      const list = missing.map((m) => `#${m.excerpt}:"${m.phrase}"`).join(", ");
      console.warn(
        `[edpb-1-2024-consistency] EDPB_1_2024_AUTHORITY anchors missing from edpb_guidelines corpus: ${list}. ` +
          `Either the hand-written constant has drifted from the (Claude-verified) corpus, or the corpus rows ` +
          `for those paragraphs are absent. Reconcile before switching consumers to corpus-first.`
      );
    }
  } catch (e) {
    console.warn(
      `[edpb-1-2024-consistency] unexpected error: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}
