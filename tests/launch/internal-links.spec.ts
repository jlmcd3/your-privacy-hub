import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Launch QA — internal-link integrity, DOM-rendered.
 *
 * Visits each public route, extracts every internal href, and verifies the
 * target resolves with status < 400 (HEAD, GET fallback). Cross-page link
 * graph keeps a cache to avoid re-checking the same URL.
 */

const app = readFileSync(resolve(__dirname, "../../src/App.tsx"), "utf8");
const ALL_ROUTES = [...new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]))];
const ROUTES = ALL_ROUTES.filter(
  (r) => !r.includes(":") && !r.includes("*") && !r.startsWith("/admin"),
);

const BASE = process.env.BASE_URL || "https://enduserprivacy.com";
const cache = new Map<string, number>();

async function checkUrl(url: string): Promise<number> {
  if (cache.has(url)) return cache.get(url)!;
  let status = 0;
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (res.status === 405 || res.status === 403 || res.status >= 500) {
      res = await fetch(url, { method: "GET", redirect: "follow" });
      await res.text().catch(() => "");
    }
    status = res.status;
  } catch {
    status = 0;
  }
  cache.set(url, status);
  return status;
}

for (const route of ROUTES) {
  test(`internal links: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(200);

    const hrefs: string[] = await page.$$eval("a[href]", (els) =>
      els
        .map((e) => (e as HTMLAnchorElement).getAttribute("href") || "")
        .filter(Boolean),
    );

    const internal = new Set<string>();
    for (const href of hrefs) {
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
      let abs: string;
      try {
        abs = new URL(href, BASE + route).toString();
      } catch {
        continue;
      }
      if (!abs.startsWith(BASE)) continue;
      internal.add(abs.split("#")[0]);
    }

    const broken: { url: string; status: number }[] = [];
    await Promise.all(
      [...internal].map(async (u) => {
        const s = await checkUrl(u);
        if (!s || s >= 400) broken.push({ url: u, status: s });
      }),
    );

    expect(
      broken,
      `broken internal links on ${route}: ${broken.map((b) => `${b.status} ${b.url}`).join(", ")}`,
    ).toHaveLength(0);
  });
}
