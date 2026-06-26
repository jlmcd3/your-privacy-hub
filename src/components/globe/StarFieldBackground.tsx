import { useEffect, useRef } from "react";
import {
  pickStarClass,
  powerLawBrightness,
  twinkle,
  HERO_STAR_COUNT,
  HERO_GLOW,
  STAR_CLASSES,
  type StarClass,
} from "./starPalette";

const STAR_COUNT = 220;

type Star = {
  x: number;          // 0..1 (relative)
  y: number;          // 0..1
  r: number;          // CSS px radius
  cls: StarClass;
  base: number;       // 0..1 base brightness
  phase: number;
  speedA: number;
  speedB: number;
  layer: "far" | "mid" | "near";
  drift: number;      // px/sec
  hero?: boolean;
};

type Meteor = {
  x: number; y: number;
  vx: number; vy: number;
  life: number;  // 0..1 (1 fresh, 0 dead)
  trail: { x: number; y: number; a: number }[];
};

export default function StarFieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reducedMq.matches;

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    // ── Build star population ─────────────────────────────────────────
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = Math.random();
      let layer: Star["layer"]; let rMin: number; let rMax: number; let drift: number;
      if (u < 0.6)      { layer = "far";  rMin = 0.3; rMax = 0.7; drift = 4 / 60; }
      else if (u < 0.9) { layer = "mid";  rMin = 0.6; rMax = 1.3; drift = 8 / 60; }
      else              { layer = "near"; rMin = 1.1; rMax = 2.0; drift = 12 / 60; }

      const base = powerLawBrightness();
      const cls = pickStarClass(Math.random());
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: rMin + (rMax - rMin) * (0.4 + base * 0.6),
        cls,
        base,
        phase: Math.random() * Math.PI * 2,
        speedA: 0.3 + Math.random() * 0.8,
        speedB: (0.3 + Math.random() * 0.8) * 1.618,
        layer,
        drift,
      });
    }

    // Promote 8 brightest near-layer stars as heroes
    const nearSorted = stars
      .filter((s) => s.layer === "near")
      .sort((a, b) => b.base - a.base)
      .slice(0, HERO_STAR_COUNT);
    nearSorted.forEach((s) => (s.hero = true));

    // Shared diagonal drift unit vector
    const driftAngle = -Math.PI / 6;
    const dvx = Math.cos(driftAngle);
    const dvy = Math.sin(driftAngle);

    // ── Pre-rendered hero glow sprites (one per class) ────────────────
    const glowSprites = new Map<string, HTMLCanvasElement>();
    function buildGlowSprites() {
      glowSprites.clear();
      for (const cls of STAR_CLASSES) {
        const size = 64;
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const g = c.getContext("2d")!;
        const grd = g.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        const [r, gC, b] = cls.rgb;
        grd.addColorStop(0, `rgba(${r}, ${gC}, ${b}, ${HERO_GLOW.alpha})`);
        grd.addColorStop(0.4, `rgba(${r}, ${gC}, ${b}, ${HERO_GLOW.alpha * 0.25})`);
        grd.addColorStop(1, `rgba(${r}, ${gC}, ${b}, 0)`);
        g.fillStyle = grd;
        g.fillRect(0, 0, size, size);
        glowSprites.set(cls.name, c);
      }
    }
    buildGlowSprites();

    // ── Pre-rendered Milky Way + nebula layer ─────────────────────────
    let bgCanvas: HTMLCanvasElement | null = null;
    function buildBackground(wCss: number, hCss: number) {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.floor(wCss * dpr()));
      c.height = Math.max(1, Math.floor(hCss * dpr()));
      const g = c.getContext("2d")!;
      g.scale(dpr(), dpr());

      // Nebula blooms (subliminal)
      const neb1 = g.createRadialGradient(
        wCss * 0.25, hCss * 0.35, 0,
        wCss * 0.25, hCss * 0.35, Math.max(wCss, hCss) * 0.45,
      );
      neb1.addColorStop(0, "rgba(42, 42, 85, 0.03)");
      neb1.addColorStop(1, "rgba(42, 42, 85, 0)");
      g.fillStyle = neb1;
      g.fillRect(0, 0, wCss, hCss);

      const neb2 = g.createRadialGradient(
        wCss * 0.78, hCss * 0.6, 0,
        wCss * 0.78, hCss * 0.6, Math.max(wCss, hCss) * 0.4,
      );
      neb2.addColorStop(0, "rgba(40, 110, 120, 0.025)");
      neb2.addColorStop(1, "rgba(40, 110, 120, 0)");
      g.fillStyle = neb2;
      g.fillRect(0, 0, wCss, hCss);

      // Milky Way band: rotated linear gradient wash + clustered dots
      g.save();
      g.translate(wCss / 2, hCss / 2);
      g.rotate((-25 * Math.PI) / 180);
      const bandLen = Math.hypot(wCss, hCss) * 1.2;
      const bandHalfW = Math.max(wCss, hCss) * 0.18;
      const wash = g.createLinearGradient(0, -bandHalfW, 0, bandHalfW);
      wash.addColorStop(0, "rgba(180, 200, 240, 0)");
      wash.addColorStop(0.5, "rgba(200, 215, 240, 0.025)");
      wash.addColorStop(1, "rgba(180, 200, 240, 0)");
      g.fillStyle = wash;
      g.fillRect(-bandLen / 2, -bandHalfW, bandLen, bandHalfW * 2);

      // Clustered dots with gaussian-ish falloff perpendicular to band
      for (let i = 0; i < 900; i++) {
        const px = (Math.random() - 0.5) * bandLen;
        // Gaussian via Box-Muller
        const u1 = Math.random() || 1e-6;
        const u2 = Math.random();
        const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const py = gauss * (bandHalfW * 0.45);
        const a = 0.02 + Math.random() * 0.03;
        const cls = pickStarClass(Math.random());
        const [r, gC, b] = cls.rgb;
        g.fillStyle = `rgba(${r}, ${gC}, ${b}, ${a})`;
        const rad = 0.5 + Math.random() * 0.5;
        g.beginPath();
        g.arc(px, py, rad, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();

      bgCanvas = c;
    }

    // ── Sizing ────────────────────────────────────────────────────────
    let widthCss = 0; let heightCss = 0;
    function resize() {
      const rect = canvas!.parentElement!.getBoundingClientRect();
      widthCss = rect.width; heightCss = rect.height;
      canvas!.width = Math.floor(widthCss * dpr());
      canvas!.height = Math.floor(heightCss * dpr());
      canvas!.style.width = `${widthCss}px`;
      canvas!.style.height = `${heightCss}px`;
      buildBackground(widthCss, heightCss);
      if (reduced) drawStatic();
    }

    // ── Meteor ────────────────────────────────────────────────────────
    let meteor: Meteor | null = null;
    let nextMeteorAt = performance.now() + (10 + Math.random() * 10) * 1000;
    function spawnMeteor() {
      const startX = widthCss * (0.1 + Math.random() * 0.5);
      const startY = heightCss * (0.05 + Math.random() * 0.3);
      const distX = widthCss * 0.25;
      const distY = heightCss * 0.18;
      const dur = 0.7; // seconds
      meteor = {
        x: startX, y: startY,
        vx: distX / dur, vy: distY / dur,
        life: 1,
        trail: [],
      };
    }

    // ── Drawing ───────────────────────────────────────────────────────
    function drawStar(s: Star, mult: number) {
      const [r, gC, b] = s.cls.rgb;
      const brightness = s.base * mult * 1.3;
      const alpha = Math.max(0.065, Math.min(1, brightness));
      const x = s.x * widthCss;
      const y = s.y * heightCss;

      if (s.hero) {
        const sprite = glowSprites.get(s.cls.name);
        if (sprite) {
          const gs = s.r * HERO_GLOW.radiusMultiplier * (0.6 + brightness * 0.8);
          ctx!.globalAlpha = Math.min(1, alpha);
          ctx!.drawImage(sprite, x - gs, y - gs, gs * 2, gs * 2);
          ctx!.globalAlpha = 1;
        }
      }

      ctx!.beginPath();
      ctx!.arc(x, y, s.r, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${r}, ${gC}, ${b}, ${alpha})`;
      ctx!.fill();
    }

    function drawStatic() {
      if (!ctx) return;
      ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
      ctx.clearRect(0, 0, widthCss, heightCss);
      if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, widthCss, heightCss);
      for (const s of stars) drawStar(s, 1);
    }

    let lastT = performance.now();
    function frame(now: number) {
      if (!ctx) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
      ctx.clearRect(0, 0, widthCss, heightCss);
      if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, widthCss, heightCss);

      const t = now / 1000;
      for (const s of stars) {
        // Drift in CSS px → convert to relative units
        s.x += (dvx * s.drift * dt) / widthCss;
        s.y += (dvy * s.drift * dt) / heightCss;
        if (s.x < -0.02) s.x += 1.04;
        if (s.x > 1.02) s.x -= 1.04;
        if (s.y < -0.02) s.y += 1.04;
        if (s.y > 1.02) s.y -= 1.04;

        const mult = twinkle(t, s.phase, s.speedA, s.speedB, s.base);
        drawStar(s, mult);
      }

      // Meteors
      if (!meteor && now >= nextMeteorAt) {
        spawnMeteor();
      }
      if (meteor) {
        meteor.x += meteor.vx * dt;
        meteor.y += meteor.vy * dt;
        meteor.life -= dt / 0.7;
        meteor.trail.unshift({ x: meteor.x, y: meteor.y, a: 1 });
        if (meteor.trail.length > 14) meteor.trail.pop();
        // Decay trail alphas
        for (const p of meteor.trail) p.a *= 0.85;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = meteor.trail.length - 1; i >= 0; i--) {
          const p = meteor.trail[i];
          const next = meteor.trail[i - 1] || p;
          ctx.strokeStyle = `rgba(230, 240, 255, ${p.a * meteor.life})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
        }
        ctx.restore();

        if (meteor.life <= 0) {
          meteor = null;
          nextMeteorAt = now + (10 + Math.random() * 10) * 1000;
        }
      }

      animRef.current = requestAnimationFrame(frame);
    }

    // ── Run control: reduced motion + IO + visibility ────────────────
    let running = false;
    let inView = true;
    function start() {
      if (running || reduced || !inView || document.hidden) return;
      running = true;
      lastT = performance.now();
      animRef.current = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(animRef.current);
    }

    resize();
    window.addEventListener("resize", resize);

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        inView = e.isIntersecting;
        if (inView) start(); else stop();
      }
    }, { threshold: 0 });
    io.observe(canvas);

    function onVis() {
      if (document.hidden) stop(); else start();
    }
    document.addEventListener("visibilitychange", onVis);

    function onReduced(e: MediaQueryListEvent) {
      reduced = e.matches;
      if (reduced) { stop(); drawStatic(); }
      else start();
    }
    if (reducedMq.addEventListener) reducedMq.addEventListener("change", onReduced);
    else (reducedMq as any).addListener?.(onReduced);

    if (reduced) drawStatic();
    else start();

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      if (reducedMq.removeEventListener) reducedMq.removeEventListener("change", onReduced);
      else (reducedMq as any).removeListener?.(onReduced);
      io.disconnect();
      glowSprites.clear();
      bgCanvas = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
