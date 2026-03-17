const STATUS_CONFIG = {
  comprehensive: { color: "#1a8a52", label: "Comprehensive Law"      },
  sector:        { color: "#2563eb", label: "Sector-Specific"        },
  partial:       { color: "#38bdf8", label: "Partial Coverage"       },
  proposed:      { color: "#d4a017", label: "Proposed / In Progress" },
  none:          { color: "#c8d8e8", label: "No Significant Law"     },
};

export { STATUS_CONFIG };

export default function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 bg-white/95 rounded-xl px-4 py-3 shadow-eup-md text-xs">
      <div className="font-bold text-navy text-[10px] uppercase tracking-widest mb-2">
        Law Status
      </div>
      {Object.entries(STATUS_CONFIG).map(([key, val]) => (
        <div key={key} className="flex items-center gap-2 mb-1.5 last:mb-0">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{
              background: val.color,
              border: key === "none" ? "1px solid #b0bec5" : "none",
            }}
          />
          <span className="text-slate font-medium">{val.label}</span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-fog text-[9px] text-slate-light leading-snug">
        Countries not shown are too small<br/>to render at this map scale.
      </div>
    </div>
  );
}
