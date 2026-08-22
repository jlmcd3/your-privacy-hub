// Temporary comparison page for article fallback artwork.
// Visit /fallback-preview. Safe to delete once a direction is chosen.

import ArticleFallbackImage, { type FallbackCategory } from "@/components/feed/ArticleFallbackImage";
import ArticleFallbackImageVivid from "@/components/feed/ArticleFallbackImageVivid";
import ArticleFallbackImageLogo from "@/components/feed/ArticleFallbackImageLogo";

const SEEDS = [
  "art-0f2a-cnil-fine",
  "art-91bd-edpb-guidance",
  "art-4c17-ccpa-rulemaking",
  "art-77e9-ico-reprimand",
  "art-2b60-ai-act-timeline",
  "art-d3a8-texas-ag-suit",
];

const CATS: FallbackCategory[] = ["enforcement", "legislation", "guidance", "analysis", "default", "enforcement"];

const VARIANTS = [
  { key: "current", title: "A · Current (signal glyph)", Comp: ArticleFallbackImage },
  { key: "vivid", title: "B · Vivid glyph (brighter, higher contrast)", Comp: ArticleFallbackImageVivid },
  { key: "logo", title: "C · Meridian mark tile (logo, accent-varied)", Comp: ArticleFallbackImageLogo },
] as const;

export default function FallbackImagePreview() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <header>
          <h1 className="font-serif text-3xl mb-2">Article fallback artwork</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Three directions shown at the real slot sizes used in production: the 112×80 feed
            thumbnail, the 56px square list avatar, and a large 320px tile for judging detail.
            Each column is the same six article seeds, so variants are directly comparable.
          </p>
        </header>

        {VARIANTS.map(({ key, title, Comp }) => (
          <section key={key} className="space-y-4">
            <h2 className="text-base font-semibold">{title}</h2>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Feed thumb — 112×80</p>
              <div className="flex flex-wrap gap-3">
                {SEEDS.map((s, i) => (
                  <div key={s} className="rounded-md overflow-hidden" style={{ width: 112, height: 80 }}>
                    <Comp seed={s} category={CATS[i]} alt="" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">List avatar — 56×56</p>
              <div className="flex flex-wrap gap-3">
                {SEEDS.map((s, i) => (
                  <div key={s} className="rounded-md overflow-hidden" style={{ width: 56, height: 56 }}>
                    <Comp seed={s} category={CATS[i]} alt="" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Large tile — 320×220</p>
              <div className="flex flex-wrap gap-4">
                {SEEDS.slice(0, 3).map((s, i) => (
                  <div key={s} className="rounded-lg overflow-hidden" style={{ width: 320, height: 220 }}>
                    <Comp seed={s} category={CATS[i]} alt="" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="space-y-4">
          <h2 className="text-base font-semibold">In-context: mock feed rows</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {VARIANTS.map(({ key, title, Comp }) => (
              <div key={key} className="space-y-3">
                <p className="text-xs text-muted-foreground">{title}</p>
                {SEEDS.slice(0, 4).map((s, i) => (
                  <div key={s} className="flex gap-3 items-start border border-border rounded-lg p-3">
                    <div className="rounded-md overflow-hidden shrink-0" style={{ width: 112, height: 80 }}>
                      <Comp seed={s} category={CATS[i]} alt="" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {CATS[i]}
                      </p>
                      <p className="text-sm font-medium leading-snug">
                        Regulator publishes updated guidance on cross-border transfers
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
