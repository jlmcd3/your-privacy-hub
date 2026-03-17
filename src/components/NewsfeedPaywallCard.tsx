import { Link } from "react-router-dom";

export default function NewsfeedPaywallCard() {
  return (
    <div className="relative my-6 rounded-2xl overflow-hidden border border-blue/20">
      {/* Blurred ghost articles behind */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center text-center px-8 py-10 bg-white/90 backdrop-blur-sm">
        <span className="text-3xl mb-3">⭐</span>
        <h3 className="font-display font-bold text-navy text-xl mb-2">
          You've reached the free preview limit
        </h3>
        <p className="text-slate text-sm max-w-md mb-6 leading-relaxed">
          Premium members get unlimited access to the full article archive,
          advanced search, and weekly analyst briefs — starting at $15/month.
          First 25 subscribers get the first year free.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            to="/subscribe"
            className="bg-gradient-to-br from-steel to-blue text-white font-semibold text-sm px-6 py-2.5 rounded-lg no-underline hover:opacity-90 transition-all"
          >
            Get Premium — $15/mo →
          </Link>
          <Link
            to="/signup"
            className="border border-fog text-navy font-medium text-sm px-6 py-2.5 rounded-lg no-underline hover:bg-fog transition-all"
          >
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  );
}
