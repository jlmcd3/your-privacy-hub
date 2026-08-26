import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useClientStore } from '@/stores/clientStore';

/**
 * Inline label rendered above tool intake forms for users with 2+ clients.
 * Shows the active client and offers an inline switcher.
 *
 * PRE-INTAKE REDESIGN (2026-08-26): `variant="masthead"` renders a compact
 * "For: {client} · Change" control styled for the dark IntakeMasthead band,
 * so the selected client reads as assessment context instead of a
 * standalone pre-intake row. The default variant is unchanged.
 */
export default function ActiveClientLabel({
  variant = 'default',
}: {
  variant?: 'default' | 'masthead';
}) {
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

  const onDark = variant === 'masthead';

  return (
    <div
      className={
        onDark
          ? 'text-sm text-brand-mist inline-flex items-center gap-1.5 relative'
          : 'mb-4 text-sm text-slate inline-flex items-center gap-1.5 relative'
      }
      ref={ref}
    >
      <span>{onDark ? 'For:' : 'Generating for:'}</span>
      <span className={onDark ? 'font-semibold text-white' : 'font-semibold text-brand-navy'}>
        {activeClient.name}
      </span>
      <span className="text-brand-mist">·</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          onDark
            ? 'text-brand-light-teal hover:text-white bg-transparent border-none cursor-pointer font-medium inline-flex items-center gap-0.5'
            : 'text-brand-teal-text hover:text-brand-navy bg-transparent border-none cursor-pointer font-medium inline-flex items-center gap-0.5'
        }
      >
        Change <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className={`absolute ${onDark ? 'right-0' : 'left-0'} top-full mt-1 z-40 min-w-[220px] bg-card border border-brand-cloud rounded-md shadow-eup-md py-1`}>
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
                {active && <Check className="w-3.5 h-3.5 text-brand-teal-text" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
