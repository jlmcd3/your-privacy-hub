import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import RegulatorGlobe from "./RegulatorGlobe";

const liveFeed = [
  { flag: "🇪🇺", label: "EDPB · AI Training Data Guidance", time: "2 hours ago" },
  { flag: "🇺🇸", label: "Texas AG · First TDPSA Enforcement", time: "5 hours ago" },
  { flag: "🇧🇷", label: "ANPD · International Transfer Rules", time: "9 hours ago" },
];

const Hero = () => {
  const [feedIndex, setFeedIndex] = useState(0);
  const starCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeedIndex(i => (i + 1) % liveFeed.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const makeStars = (w: number, h: number) => {
      const stars: { x: number; y: number; r: number; base: number; speed: number; phase: number }[] = [];
      for (let i = 0; i < 500; i++) {
        stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.1 + 0.2, base: Math.random() * 0.5 + 0.15, speed: Math.random() * 3.0 + 1.5, phase: Math.random() * Math.PI * 2 });
      }
      for (let i = 0; i < 30; i++) {
        stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.6 + 0.8, base: Math.random() * 0.3 + 0.5, speed: Math.random() * 2.0 + 1.0, phase: Math.random() * Math.PI * 2 });
      }
      return stars;
    };

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    let stars = makeStars(canvas.width, canvas.height);

    const onResize = () => {
      resize();
      stars = makeStars(canvas.width, canvas.height);
    };
    window.addEventListener("resize", onResize);

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const alpha = Math.max(0, Math.min(1, s.base + Math.sin(t * s.speed + s.phase) * 0.45));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-mid to-navy-light text-white py-12 md:py-20 px-4 md:px-8">
      <canvas ref={starCanvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_20%,rgba(59,130,196,0.18)_0%,transparent_60%),radial-gradient(ellipse_40%_50%_at_10%_80%,rgba(29,158,111,0.10)_0%,transparent_50%)]" />
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "48px 48px"
      }} />

      {/* Globe background — centered */}
      <div className="absolute inset-0 block pointer-events-none">
        <RegulatorGlobe />
      </div>

      <div className="max-w-[1280px] mx-auto relative z-10 flex flex-col items-center text-center">
        <div className="animate-fade-up max-w-[800px]">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-5 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            <span>🌐</span> Global Privacy Intelligence Platform
          </div>
          <h1 className="font-display text-[clamp(28px,5vw,52px)] leading-[1.1] tracking-tight mb-5">
            Every regulator tracked.<br />
            Every update summarized.<br />
            <Link
              to="/subscribe"
              className="italic text-sky underline decoration-sky/40 underline-offset-4 hover:decoration-sky transition-all"
            >
              Deeper intelligence
            </Link>
            <em className="italic text-white/80"> for those who need the full picture.</em>
          </h1>
          <p className="text-sm md:text-base text-slate-light leading-relaxed max-w-[600px] mx-auto mb-7 md:mb-9">
            Track regulatory developments from 250+ privacy authorities across 150+ jurisdictions — automatically monitored, AI-summarized, and structured for professionals.
          </p>
          <div className="flex gap-3 items-center justify-center flex-wrap">
            <Link to="/enforcement-tracker" className="px-5 md:px-6 py-3 md:py-3.5 text-sm font-medium text-white/85 bg-white/[0.08] border border-white/[0.18] rounded-lg hover:bg-white/[0.14] hover:text-white transition-all no-underline inline-flex items-center gap-2">
              Explore Free →
            </Link>
            <Link to="/subscribe" className="px-5 md:px-7 py-3 md:py-3.5 text-sm font-semibold text-navy bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all no-underline inline-flex items-center gap-2">
              Get Full Intelligence →
            </Link>
          </div>

          {/* Stat strip */}
          <div className="flex items-center justify-center gap-2 mt-6 text-[12px] text-slate-light tracking-wide">
            <span>250+ Regulators</span>
            <span className="text-white/30">·</span>
            <span>150+ Jurisdictions</span>
            <span className="text-white/30">·</span>
            <span>Updated Daily</span>
          </div>

          {/* Live pulse feed */}
          <div className="flex items-center justify-center gap-2 mt-4 text-[11.5px]">
            <span className="flex items-center gap-1.5 text-accent-l font-semibold tracking-wider uppercase text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-l inline-block" />
              Live
            </span>
            <span className="text-white/30">·</span>
            <span className="text-white/75 transition-all duration-500">
              {liveFeed[feedIndex].flag} {liveFeed[feedIndex].label}
            </span>
            <span className="text-white/30 text-[10px]">
              {liveFeed[feedIndex].time}
            </span>
          </div>

          {/* Social proof */}
          <p className="text-[12px] italic text-slate-light/70 mt-2">
            Used by privacy professionals, DPOs, and compliance teams worldwide.
          </p>

          <div className="flex justify-center gap-5 md:gap-7 mt-8 md:mt-11 pt-6 md:pt-8 border-t border-white/10 flex-wrap">
            {[
              { num: "250+", label: "Regulators monitored" },
              { num: "150+", label: "Jurisdictions covered" },
              { num: "Daily", label: "Automated updates" },
              { num: "$0", label: "Always free to browse" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-5 md:gap-7">
                {i > 0 && <div className="hidden md:block w-px h-10 bg-white/10 -ml-5 md:-ml-7 mr-0" />}
                <div>
                  <div className="font-display text-xl md:text-[28px] leading-none">{stat.num}</div>
                  <div className="text-[10px] md:text-[11px] font-medium text-slate-light mt-1 tracking-wide">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
