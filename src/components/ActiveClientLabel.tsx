import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useClientStore } from '@/stores/clientStore';

/**
 * Inline label rendered above tool intake forms for users with 2+ clients.
 * Shows the active client and offers an inline switcher.
 */
export default function ActiveClientLabel() {
  const clients = useClientStore((s) => s.clients);
  const activeClient = useClientStore((s) => s.activeClient);
  const setActiveClient = useClientStore((s) => s.setActiveClient);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (clients.length < 2 || !activeClient) return null;

  return (
    <div className="mb-4 text-sm text-slate inline-flex items-center gap-1.5 relative" ref={ref}>
      <span>Generating for:</span>
      <span className="font-semibold text-brand-navy">{activeClient.name}</span>
      <span className="text-brand-mist">·</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-brand-teal hover:text-brand-navy bg-transparent border-none cursor-pointer font-medium inline-flex items-center gap-0.5"
      >
        Change <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-40 min-w-[220px] bg-card border border-brand-cloud rounded-md shadow-eup-md py-1">
          {clients.map((c) => {
            const active = c.id === activeClient.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveClient(c);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-brand-navy hover:bg-brand-cloud bg-transparent border-none cursor-pointer text-left"
              >
                <span className={active ? 'font-semibold' : ''}>{c.name}</span>
                {active && <Check className="w-3.5 h-3.5 text-brand-teal" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
