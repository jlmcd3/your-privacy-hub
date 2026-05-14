import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, User, Briefcase } from 'lucide-react';
import { useClientStore } from '@/stores/clientStore';
import { useAuth } from '@/hooks/useAuth';

/**
 * Persistent thin bar shown directly below the top nav when a subscriber has
 * added at least one real client. Indicates the active workspace
 * (Personal vs. a Client) and lets them switch between them.
 */
export default function ClientContextBar({ compact = false }: { compact?: boolean } = {}) {
  const { user } = useAuth();
  const clients = useClientStore((s) => s.clients);
  const personal = useClientStore((s) => s.personal);
  const activeClient = useClientStore((s) => s.activeClient);
  const setActiveClient = useClientStore((s) => s.setActiveClient);
  const loadClients = useClientStore((s) => s.loadClients);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Only show the switcher once the user has at least one real client.
  if (!user || clients.length === 0 || !activeClient) return null;

  const inPersonal = activeClient.is_personal;

  // Distinct visual treatment based on workspace type.
  const bandClass = inPersonal
    ? 'bg-[#EEF2F8] border-b border-fog'
    : 'bg-amber-50 border-b border-amber-200';
  const labelText = inPersonal ? 'Personal workspace' : 'Client';
  const Icon = inPersonal ? User : Briefcase;

  if (compact) {
    const compactClass = inPersonal
      ? 'bg-[#EEF2F8] border border-fog rounded-lg'
      : 'bg-amber-50 border border-amber-200 rounded-lg';
    return (
      <div className={`mx-2 mb-2 px-2 py-1.5 ${compactClass}`}>
        <div className="flex items-center justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <Icon className="w-3 h-3 shrink-0 text-navy/70" />
            <span className="text-[11px] font-semibold text-navy truncate">
              {activeClient.name}
            </span>
          </div>
          <div className="relative shrink-0" ref={ref}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-[10px] font-medium text-navy/60 hover:text-navy bg-transparent border-none cursor-pointer inline-flex items-center gap-0.5"
            >
              Switch <ChevronDown className="w-3 h-3" />
            </button>
            {open && (
              <div className="absolute right-0 bottom-full mb-1 z-50 min-w-[220px] bg-card border border-fog rounded-md shadow-eup-md py-1">
                {personal && (
                  <>
                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate">
                      Personal
                    </div>
                    <WorkspaceRow
                      name={personal.name}
                      icon={<User className="w-3.5 h-3.5 text-slate" />}
                      active={activeClient.id === personal.id}
                      onSelect={() => { setActiveClient(personal); setOpen(false); }}
                    />
                    <div className="my-1 border-t border-fog" />
                  </>
                )}
                <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate">
                  Clients
                </div>
                {clients.map((c) => (
                  <WorkspaceRow
                    key={c.id}
                    name={c.name}
                    icon={<Briefcase className="w-3.5 h-3.5 text-slate" />}
                    active={c.id === activeClient.id}
                    onSelect={() => { setActiveClient(c); setOpen(false); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${bandClass}`}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
        <div className="text-[13px] text-navy/80 flex items-center gap-1.5 min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="shrink-0">{labelText}:</span>
          <span className="font-semibold text-navy truncate">
            {activeClient.name}
          </span>
        </div>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[13px] font-medium text-navy/80 hover:text-navy bg-transparent border-none cursor-pointer inline-flex items-center gap-1"
          >
            Switch <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[260px] bg-card border border-fog rounded-md shadow-eup-md py-1">
              {personal && (
                <>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate">
                    Personal
                  </div>
                  <WorkspaceRow
                    name={personal.name}
                    icon={<User className="w-3.5 h-3.5 text-slate" />}
                    active={activeClient.id === personal.id}
                    onSelect={() => {
                      setActiveClient(personal);
                      setOpen(false);
                    }}
                  />
                  <div className="my-1 border-t border-fog" />
                </>
              )}
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate">
                Clients
              </div>
              {clients.map((c) => (
                <WorkspaceRow
                  key={c.id}
                  name={c.name}
                  icon={<Briefcase className="w-3.5 h-3.5 text-slate" />}
                  active={c.id === activeClient.id}
                  onSelect={() => {
                    setActiveClient(c);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkspaceRow({
  name,
  icon,
  active,
  onSelect,
}: {
  name: string;
  icon: React.ReactNode;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-navy hover:bg-fog bg-transparent border-none cursor-pointer text-left"
    >
      <span className="flex items-center gap-2 min-w-0">
        {icon}
        <span className={`truncate ${active ? 'font-semibold' : ''}`}>
          {name}
        </span>
      </span>
      {active && <Check className="w-3.5 h-3.5 text-blue shrink-0" />}
    </button>
  );
}
