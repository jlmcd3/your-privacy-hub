import { useEffect } from 'react';
import { useClientStore } from '@/stores/clientStore';
import { useAuth } from '@/hooks/useAuth';

interface ClientSwitcherProps {
  /** Force render even when only one client exists. */
  alwaysShow?: boolean;
  className?: string;
}

export function ClientSwitcher({ alwaysShow = false, className }: ClientSwitcherProps) {
  const clients = useClientStore((s) => s.clients);
  const activeClient = useClientStore((s) => s.activeClient);
  const isLoading = useClientStore((s) => s.isLoading);
  const loadClients = useClientStore((s) => s.loadClients);
  const setActiveClient = useClientStore((s) => s.setActiveClient);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!alwaysShow && clients.length <= 1) return null;
  if (isLoading && clients.length === 0) return null;

  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        value={activeClient?.id ?? ''}
        onChange={(e) => {
          const selected = clients.find((c) => c.id === e.target.value);
          if (selected) setActiveClient(selected);
        }}
        className="bg-card border border-fog rounded-md px-3 py-1.5 pr-8 text-sm
          font-medium text-navy shadow-sm cursor-pointer appearance-none
          focus:outline-none focus:ring-2 focus:ring-blue"
        aria-label="Switch client"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-light">
        ▾
      </span>
    </div>
  );
}
