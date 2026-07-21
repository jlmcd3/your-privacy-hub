// Observe elements tagged with [data-rail-key] and drive an active-key
// setter based on which question is nearest the top of the viewport as
// the user scrolls the CPPA intake forms.

import { useEffect } from "react";

/**
 * Scroll-driven active rail key.
 *
 * - Scans every `[data-rail-key]` element and picks the one whose top edge
 *   is closest to (but not past) the "active" threshold near the top of the
 *   viewport. That element becomes the active question, so the statute rail
 *   updates as the user moves up or down the form.
 * - Falls back to the first visible element when the user has scrolled above
 *   every question (e.g. at the top of the page).
 *
 * Focus-driven updates (`onFocus={() => focusRail(...)}`) continue to work in
 * parallel — this hook only supplements them.
 */
export function useScrollActiveRail(
  setKey: (k: string) => void,
  deps: ReadonlyArray<unknown> = [],
) {
  useEffect(() => {
    const OFFSET = 200; // px — "active zone" starts this far from the viewport top

    const compute = () => {
      const els = Array.from(
        document.querySelectorAll<HTMLElement>("[data-rail-key]"),
      );
      if (els.length === 0) return;

      let active: HTMLElement | null = null;
      let activeTop = -Infinity;
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= OFFSET && rect.top > activeTop) {
          active = el;
          activeTop = rect.top;
        }
      }

      if (!active) {
        // User is above every question — pick the first one still on-screen.
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > 0) {
            active = el;
            break;
          }
        }
      }

      const key = active?.getAttribute("data-rail-key");
      if (key) setKey(key);
    };

    compute();

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
