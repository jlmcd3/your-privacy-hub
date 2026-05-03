import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useClientStore } from '@/stores/clientStore';
import { useAuth } from '@/hooks/useAuth';

/**
 * Persistent thin bar shown directly below the top nav for users with 2+
 * clients. Indicates the active client and lets them switch.
 */
export default function ClientContextBar() {
  const { user } = useAuth();
  const clients = useClientStore((s) => s.clients);
  const activeClient = useClientStore((s) => s.activeClient);
  const setActiveClient = useClientStore((s) => s.setActiveClient);
  const loadClients = useClientStore((s) => s.loadClients);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && clients.length === 0) loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user || clients.length < 2 || !activeClient) return null;

  return (
    <div className="w-full bg-[#EEF2F8] border-b border-fog">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
        <div className="text-[13px] text-navy/80">
          Working in:{' '}
          <span className="font-semibold text-navy">{activeClient.name}</span>
        </div>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[13px] font-medium text-navy/80 hover:text-navy bg-transparent border-none cursor-pointer inline-flex items-center gap-1"
          >
            Switch client <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[220px] bg-card border border-fog rounded-md shadow-eup-md py-1">
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
                    className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-navy hover:bg-fog bg-transparent border-none cursor-pointer text-left"
                  >
                    <span className={active ? 'font-semibold' : ''}>{c.name}</span>
                    {active && <Check className="w-3.5 h-3.5 text-blue" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
