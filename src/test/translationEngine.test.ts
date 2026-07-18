// TRANSLATE-1 — Unit tests for the chunked translation engine.
// The engine lives under supabase/functions/_shared but is pure TS; we import
// it directly since it does not touch any Deno global at module load.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractStringUnits,
  isExcludedFromTranslation,
  planChunks,
  setAtPath,
  splitProseSegments,
  translateDocument,
  translatePlainText,
} from "../../supabase/functions/_shared/translation-engine";

describe("isExcludedFromTranslation", () => {
  it("excludes URLs, numbers, dates, enums, citation markers, statutory strings", () => {
    expect(isExcludedFromTranslation("https://example.com")).toBe(true);
    expect(isExcludedFromTranslation("42")).toBe(true);
    expect(isExcludedFromTranslation("3.14")).toBe(true);
    expect(isExcludedFromTranslation("15%")).toBe(true);
    expect(isExcludedFromTranslation("2025-01-15")).toBe(true);
    expect(isExcludedFromTranslation("2025-01-15T10:30:00Z")).toBe(true);
    expect(isExcludedFromTranslation("in_progress")).toBe(true);
    expect(isExcludedFromTranslation("PENDING_REVIEW")).toBe(true);
    expect(isExcludedFromTranslation("[Art. 6(1)(f)]")).toBe(true);
    expect(isExcludedFromTranslation("[Recital 47]")).toBe(true);
    expect(isExcludedFromTranslation("[E1]")).toBe(true);
    expect(isExcludedFromTranslation("GDPR Article 6(1)")).toBe(true);
    expect(isExcludedFromTranslation("Cal. Civ. Code § 1798.140")).toBe(true);
    expect(isExcludedFromTranslation("")).toBe(true);
    expect(isExcludedFromTranslation("   ")).toBe(true);
  });

  it("does NOT exclude ordinary prose", () => {
    expect(isExcludedFromTranslation("The controller must document")).toBe(false);
    expect(isExcludedFromTranslation("Hello world.")).toBe(false);
    expect(isExcludedFromTranslation("This is a sentence with a URL https://x.com in it")).toBe(false);
  });
});

describe("extractStringUnits", () => {
  it("walks nested objects and arrays and records dotted+bracket paths", () => {
    const src = {
      title: "Hello",
      meta: { author: "Alice" },
      list: ["one", "two", { note: "three" }],
    };
    const units = extractStringUnits(src);
    const map = Object.fromEntries(units.map((u) => [u.path, u.value]));
    expect(map["title"]).toBe("Hello");
    expect(map["meta.author"]).toBe("Alice");
    expect(map["list[0]"]).toBe("one");
    expect(map["list[1]"]).toBe("two");
    expect(map["list[2].note"]).toBe("three");
  });

  it("ignores non-string leaf values (numbers, booleans, null)", () => {
    const units = extractStringUnits({ a: 1, b: true, c: null, d: "keep" });
    expect(units.map((u) => u.path)).toEqual(["d"]);
  });

  it("handles keys with dots/brackets by quoting them", () => {
    const src: any = {};
    src["odd.key"] = "value";
    const units = extractStringUnits(src);
    expect(units[0].path).toBe('["odd.key"]');
  });
});

describe("setAtPath", () => {
  it("round-trips through extractStringUnits", () => {
    const src = { a: { b: [{ c: "old" }, "other"] } };
    const units = extractStringUnits(src);
    for (const u of units) {
      expect(setAtPath(src, u.path, `T:${u.value}`)).toBe(true);
    }
    expect(src.a.b[0].c).toBe("T:old");
    expect(src.a.b[1]).toBe("T:other");
  });

  it("returns false for a nonexistent path", () => {
    expect(setAtPath({ a: 1 }, "missing.deep.path", "x")).toBe(false);
  });
});

describe("splitProseSegments", () => {
  it("returns the original string when short enough", () => {
    const s = "Short paragraph.";
    expect(splitProseSegments(s)).toEqual([s]);
  });

  it("splits long text at paragraph boundaries", () => {
    const para = "A".repeat(500);
    const big = Array(30).fill(para).join("\n\n");
    const segs = splitProseSegments(big);
    expect(segs.length).toBeGreaterThan(1);
    // All chunks should be under the internal cap (≈6800 chars for English).
    for (const s of segs) expect(s.length).toBeLessThanOrEqual(6800);
    // Reassembles losslessly.
    expect(segs.join("")).toBe(big);
  });

  it("hard-splits an oversized single paragraph", () => {
    const monster = "X".repeat(20_000);
    const segs = splitProseSegments(monster);
    expect(segs.length).toBeGreaterThan(1);
    expect(segs.join("")).toBe(monster);
  });
});

describe("planChunks", () => {
  it("bundles small strings into a json_map chunk", () => {
    const units = extractStringUnits({
      a: "short one",
      b: "short two",
      c: "short three",
    });
    const chunks = planChunks(units);
    expect(chunks.length).toBe(1);
    expect(chunks[0].kind).toBe("json_map");
  });

  it("routes long strings into a prose chunk of their own", () => {
    const long = "sentence. ".repeat(300); // > 1200 chars
    const units = extractStringUnits({ playbook_text: long, title: "T" });
    const chunks = planChunks(units);
    const kinds = chunks.map((c) => c.kind).sort();
    expect(kinds).toContain("prose");
    expect(kinds).toContain("json_map");
    const proseChunk = chunks.find((c) => c.kind === "prose")!;
    expect((proseChunk as any).path).toBe("playbook_text");
  });

  it("drops excluded string values entirely (they pass through untranslated)", () => {
    const units = extractStringUnits({
      url: "https://example.com",
      status: "pending",
      date: "2025-01-01",
      title: "Real text",
    });
    const chunks = planChunks(units);
    expect(chunks.length).toBe(1);
    const map = chunks[0] as any;
    expect(map.units.map((u: any) => u.path)).toEqual(["title"]);
  });

  it("returns [] for an empty document", () => {
    expect(planChunks([])).toEqual([]);
  });
});

// ─── translateDocument / translatePlainText — with mocked Anthropic ────
describe("translateDocument (with mocked Anthropic)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Mock Anthropic: echoes the input with a "[FR] " prefix.
    // The engine sends either a JSON map (as user content) or plain prose text.
    globalThis.fetch = vi.fn(async (_url: any, init: any) => {
      const body = JSON.parse(init.body);
      const userText: string = body.messages[0].content;
      let echoed: string;
      // Try to parse as JSON map first; if that succeeds, prefix each VALUE.
      try {
        const parsed = JSON.parse(userText);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) {
            out[k] = `[FR] ${String(v)}`;
          }
          echoed = JSON.stringify(out);
        } else {
          echoed = `[FR] ${userText}`;
        }
      } catch {
        echoed = `[FR] ${userText}`;
      }
      return new Response(
        JSON.stringify({ content: [{ type: "text", text: echoed }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("translates a small document end-to-end and preserves structure", async () => {
    const source = {
      title: "Governance Assessment",
      sections: [
        { heading: "Overview", body: "The controller must document." },
        { heading: "Risks", body: "Consider Article 6." },
      ],
      meta: { url: "https://example.com", status: "complete" },
    };
    const result = await translateDocument(source, {
      apiKey: "test",
      languageCode: "fr",
      languageName: "French",
    });
    const t: any = result.translated;
    expect(t.title).toBe("[FR] Governance Assessment");
    expect(t.sections[0].heading).toBe("[FR] Overview");
    expect(t.sections[0].body).toBe("[FR] The controller must document.");
    // Excluded values pass through byte-identical.
    expect(t.meta.url).toBe("https://example.com");
    expect(t.meta.status).toBe("complete");
    expect(result.chunksTotal).toBeGreaterThan(0);
    expect(result.chunksDone).toBe(result.chunksTotal);
  });

  it("reports progress incrementally via onProgress", async () => {
    const source = {
      title: "T",
      long: "sentence. ".repeat(1500), // forces multiple prose segments
    };
    const seen: Array<[number, number]> = [];
    const result = await translateDocument(source, {
      apiKey: "test",
      languageCode: "fr",
      languageName: "French",
      onProgress: (done, total) => { seen.push([done, total]); },
    });
    expect(seen.length).toBe(result.chunksTotal);
    // Monotonic done counter.
    for (let i = 0; i < seen.length; i++) expect(seen[i][0]).toBe(i + 1);
    // Final entry equals total.
    expect(seen[seen.length - 1][1]).toBe(result.chunksTotal);
  });

  it("translatePlainText chunks a large prose blob and reassembles it", async () => {
    const big = "This is a paragraph. ".repeat(2000); // ~40KB
    const result = await translatePlainText(big, {
      apiKey: "test",
      languageCode: "fr",
      languageName: "French",
    });
    expect(typeof result.translated).toBe("string");
    expect(result.chunksTotal).toBeGreaterThan(1);
    // Every segment prefixed by mock, then concatenated.
    expect(String(result.translated).startsWith("[FR] ")).toBe(true);
  });

  it("empty document returns an empty translation with 0 chunks", async () => {
    const result = await translateDocument({}, {
      apiKey: "test",
      languageCode: "fr",
      languageName: "French",
    });
    expect(result.chunksTotal).toBe(0);
    expect(result.chunksDone).toBe(0);
    expect(result.translated).toEqual({});
  });
});
