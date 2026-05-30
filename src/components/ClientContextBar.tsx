import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, User, Briefcase } from 'lucide-react';
import { useClientStore } from '@/stores/clientStore';
import { useAuth } from '@/hooks/useAuth';

/**
 * Persistent thin bar shown directly below the top nav when a subscriber has
 * added at least one real client. Indicates the active workspace
 * (Personal vs. a Client) and lets them switch between them.
 */
export default function ClientContextBar() {
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
    ? 'bg-[hsl(var(--brand-teal) / 0.1)] border-b border-brand-cloud'
    : 'bg-amber-50 border-b border-amber-200';
  const labelText = inPersonal ? 'Personal workspace' : 'Client';
  const Icon = inPersonal ? User : Briefcase;

  return (
    <div className={`w-full ${bandClass}`}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
        <div className="text-sm text-brand-navy/80 flex items-center gap-1.5 min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="shrink-0">{labelText}:</span>
          <span className="font-semibold text-brand-navy truncate">
            {activeClient.name}
          </span>
        </div>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm font-medium text-brand-navy/80 hover:text-brand-navy bg-transparent border-none cursor-pointer inline-flex items-center gap-1"
          >
            Switch Workspace <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[260px] bg-card border border-brand-cloud rounded-md shadow-eup-md py-1">
              {personal && (
                <>
                  <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate">
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
                  <div className="my-1 border-t border-brand-cloud" />
                </>
              )}
              <div className="px-3 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate">
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
      className="w-full flex items-center justify-between px-3 py-2 text-sm text-brand-navy hover:bg-brand-cloud bg-transparent border-none cursor-pointer text-left"
    >
      <span className="flex items-center gap-2 min-w-0">
        {icon}
        <span className={`truncate ${active ? 'font-semibold' : ''}`}>
          {name}
        </span>
      </span>
      {active && <Check className="w-3.5 h-3.5 text-brand-teal shrink-0" />}
    </button>
  );
}
