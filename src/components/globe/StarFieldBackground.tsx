import { useEffect, useRef } from "react";

const STAR_COUNT = 120;

export default function StarFieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 2,
    }));

    function resize() {
      const rect = canvas!.parentElement!.getBoundingClientRect();
      canvas!.width = rect.width * window.devicePixelRatio;
      canvas!.height = rect.height * window.devicePixelRatio;
    }
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    function draw() {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      t += 0.016;
      for (const s of stars) {
        const brightness = 0.3 + Math.sin(t * s.speed + s.phase) * 0.45;
        const alpha = Math.max(0.05, Math.min(1, brightness));
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210, 220, 255, ${alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
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
